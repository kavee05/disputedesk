// Probe 3: Disputes API, one link-gated step at a time.
//
//   npm run probe:disputes -- list               list disputes on the seller account
//   npm run probe:disputes -- map                match disputes to D1-D4 by capture id
//   npm run probe:disputes -- inspect D1         status, stage and available links
//   npm run probe:disputes -- step D1 provide-evidence-fulfillment
//   npm run probe:disputes -- step D1 adjudicate-seller --final
//
// Every step GETs the dispute first and only calls the action if PayPal
// offers its HATEOAS link. Otherwise it records "not available at this stage".
// Final-state actions (accept-claim, adjudicate) also need --final, so they
// cannot run by accident before a dispute's other probes are done.
import { api, linkNames, loadState, save, saveState, type CaseKey } from "./lib.ts";

type Step = {
  link: string; // HATEOAS rel that must be present
  path: string; // appended to /v1/customer/disputes/{id}
  final?: boolean;
  multipart?: boolean;
  body: (ctx: { amount: string; tracking?: { carrier: string; number: string } }) => unknown;
};

const STEPS: Record<string, Step> = {
  "send-message": {
    link: "send_message",
    path: "send-message",
    body: () => ({
      message:
        "Hi, thanks for reaching out. Your order was packed and handed to the courier. Could you share a photo of the item so we can sort this out quickly?",
    }),
  },
  "make-offer": {
    link: "make_offer",
    path: "make-offer",
    body: ({ amount }) => ({
      note: "We are sorry the scarf was not what you expected. We can offer a partial refund and you keep the item.",
      offer_amount: { currency_code: "USD", value: (Number(amount) * 0.3).toFixed(2) },
      offer_type: "REFUND",
    }),
  },
  "provide-evidence-fulfillment": {
    link: "provide_evidence",
    path: "provide-evidence",
    multipart: true,
    body: ({ tracking }) => ({
      evidences: [
        {
          evidence_type: "PROOF_OF_FULFILLMENT",
          evidence_info: { tracking_info: [{ carrier_name: tracking?.carrier, tracking_number: tracking?.number }] },
          notes: "Order shipped with tracking. Carrier shows the parcel delivered to the buyer's address on file.",
        },
      ],
    }),
  },
  "provide-evidence-other": {
    link: "provide_evidence",
    path: "provide-evidence",
    multipart: true,
    body: () => ({
      evidences: [
        {
          evidence_type: "OTHER",
          notes:
            "The listing photos and description match the item shipped (indigo batik silk scarf, 90x90cm). Buyer did not reply to our offer of a partial refund.",
        },
      ],
    }),
  },
  escalate: {
    link: "escalate",
    path: "escalate",
    body: () => ({ note: "We could not resolve this with the buyer directly and would like PayPal to review." }),
  },
  "require-evidence-seller": {
    link: "require_evidence",
    path: "require-evidence",
    body: () => ({ action: "SELLER_EVIDENCE" }),
  },
  "accept-claim": {
    link: "accept_claim",
    path: "accept-claim",
    final: true,
    body: () => ({ note: "Refunding the buyer in full.", accept_claim_type: "REFUND" }),
  },
  "adjudicate-seller": {
    link: "adjudicate",
    path: "adjudicate",
    final: true,
    body: () => ({ adjudication_outcome: "SELLER_FAVOR" }),
  },
  "adjudicate-buyer": {
    link: "adjudicate",
    path: "adjudicate",
    final: true,
    body: () => ({ adjudication_outcome: "BUYER_FAVOR" }),
  },
};

const [cmd, arg1, arg2] = process.argv.slice(2);
const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith("--")));
const state = loadState();

function resolveId(ref: string): string {
  const c = state.cases[ref as CaseKey];
  if (c) {
    if (!c.disputeId) throw new Error(`${ref} has no dispute id yet. Run "map" first.`);
    return c.disputeId;
  }
  return ref; // raw PP-D-... id
}

async function inspect(ref: string) {
  const id = resolveId(ref);
  const res = await api(`dispute-get-${ref}`, "GET", `/v1/customer/disputes/${id}`);
  const d = res.body;
  console.log(`  ${ref} ${id}`);
  console.log(`  reason=${d?.reason} status=${d?.status} stage=${d?.dispute_life_cycle_stage} channel=${d?.dispute_channel}`);
  console.log(`  amount=${d?.dispute_amount?.value} ${d?.dispute_amount?.currency_code} seller_response_due=${d?.seller_response_due_date ?? "-"}`);
  console.log(`  outcome=${d?.dispute_outcome?.outcome_code ?? "-"}`);
  console.log(`  links: ${linkNames(d).join(", ")}`);
  return d;
}

if (cmd === "list") {
  const res = await api("dispute-list", "GET", "/v1/customer/disputes?page_size=50");
  for (const d of res.body?.items ?? []) {
    console.log(`  ${d.dispute_id} ${d.reason} ${d.status} ${d.dispute_life_cycle_stage} ${d.dispute_amount?.value} ${d.create_time}`);
  }
  console.log(`  ${res.body?.items?.length ?? 0} disputes`);
} else if (cmd === "map") {
  const list = await api("dispute-list", "GET", "/v1/customer/disputes?page_size=50");
  const byCapture = new Map<string | undefined, CaseKey>(
    Object.entries(state.cases).map(([k, c]) => [c.captureId, k as CaseKey]),
  );
  for (const item of list.body?.items ?? []) {
    const detail = await api(`dispute-get-${item.dispute_id}`, "GET", `/v1/customer/disputes/${item.dispute_id}`);
    const txIds: string[] = (detail.body?.disputed_transactions ?? []).map((t: any) => t.seller_transaction_id);
    const key = txIds.map((t: string) => byCapture.get(t)).find(Boolean);
    if (key) {
      state.cases[key]!.disputeId = item.dispute_id;
      console.log(`  ${key} -> ${item.dispute_id} (${detail.body?.reason})`);
    } else {
      console.log(`  ${item.dispute_id} does not match a probe order (tx ${txIds.join(",")})`);
    }
  }
  saveState(state);
} else if (cmd === "inspect" && arg1) {
  await inspect(arg1);
} else if (cmd === "step" && arg1 && arg2) {
  const step = STEPS[arg2];
  if (!step) throw new Error(`Unknown step "${arg2}". Known: ${Object.keys(STEPS).join(", ")}`);
  if (step.final && !flags.has("--final")) {
    console.log(`"${arg2}" is a final-state action. Finish the other probes on ${arg1} first, then rerun with --final.`);
    process.exit(1);
  }
  const before = await inspect(arg1);
  if (!linkNames(before).includes(step.link)) {
    const note = `not available at this stage (status=${before?.status}, stage=${before?.dispute_life_cycle_stage}, links=${linkNames(before).join("|")})`;
    save(`step-${arg1}-${arg2}-skipped`, { step: arg2, note });
    console.log(`  SKIPPED ${arg2}: ${note}`);
    process.exit(0);
  }
  const c = state.cases[arg1 as CaseKey];
  const payload = step.body({ amount: c?.amount ?? before?.dispute_amount?.value, tracking: c?.tracking });
  const path = `/v1/customer/disputes/${resolveId(arg1)}/${step.path}`;
  let res;
  if (step.multipart) {
    const form = new FormData();
    form.append("input", new Blob([JSON.stringify(payload)], { type: "application/json" }));
    res = await api(`step-${arg1}-${arg2}`, "POST", path, { form });
  } else {
    res = await api(`step-${arg1}-${arg2}`, "POST", path, { json: payload });
  }
  console.log(`  response: ${JSON.stringify(res.body).slice(0, 600)}`);
  console.log("  after:");
  await inspect(arg1);
} else {
  console.log("Usage: list | map | inspect <D1|PP-D-id> | step <D1> <action> [--final]");
  console.log(`Actions: ${Object.keys(STEPS).join(", ")}`);
}
