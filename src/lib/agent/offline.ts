import type { Case } from "../cases/model";
import type { EvidenceBundle } from "../evidence/collect";
import type { AnalystOutput, WriterOutput } from "./steps";

// Used only when no AI key is configured. Simple, transparent rules so the
// app still works for judges. The UI labels these results
// "Offline rules (no AI key)" so they are never mistaken for model output.

const INJECTION = /(ignore (all )?(previous|prior) instructions|system (notice|prompt|message)|you are an ai|as an ai|mark this case as won|approve a (full )?refund)/i;

export function offlineAnalyst(c: Case, b: EvidenceBundle): AnalystOutput {
  const id = (kind: string) => b.items.filter((i) => i.kind === kind).map((i) => i.id);
  const injected = b.items.some((i) => i.untrusted && INJECTION.test(i.detail));
  const tracking = id("tracking");
  let p = 0.35;
  const steps: AnalystOutput["reasoning_steps"] = [{ step: `The buyer opened a "${c.reasonLabel}" dispute for ${c.currency} ${c.amount.toFixed(2)}.`, evidence_ids: id("dispute") }];
  if (c.reason === "MERCHANDISE_OR_SERVICE_NOT_RECEIVED") {
    if (b.facts.trackingDelivered) {
      p = 0.82;
      steps.push({ step: "Carrier tracking on the PayPal transaction shows the parcel as delivered.", evidence_ids: tracking });
    } else if (b.facts.trackingShipped) {
      p = 0.5;
      steps.push({ step: "Tracking shows the parcel shipped but not delivered, which is weaker proof.", evidence_ids: tracking });
    } else {
      p = 0.1;
      steps.push({ step: "There is no tracking on file, so the seller cannot prove delivery.", evidence_ids: [] });
    }
  } else if (c.reason === "MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED") {
    p = 0.35;
    steps.push({ step: "For a not-as-described claim, delivery proof alone does not settle it. Photos of the listing and item would matter.", evidence_ids: id("order") });
  } else if (c.reason === "UNAUTHORISED") {
    p = b.facts.trackingDelivered ? 0.55 : 0.2;
    steps.push({ step: "The buyer says they did not authorise the payment. Delivery to the account address helps but is not conclusive.", evidence_ids: tracking });
  }
  if (injected) steps.push({ step: "A buyer message contains instructions aimed at an AI. It was treated as text only.", evidence_ids: b.items.filter((i) => i.untrusted).map((i) => i.id) });

  const recommendation: AnalystOutput["recommendation"] = p >= 0.6 ? "FIGHT" : p <= 0.2 ? "REFUND" : "ESCALATE";
  return {
    win_probability: p,
    recommendation,
    confidence: recommendation === "ESCALATE" ? 0.5 : 0.8,
    summary:
      recommendation === "FIGHT"
        ? "The records support the seller, so fighting is likely worth it."
        : recommendation === "REFUND"
          ? "There is not enough proof to win, so refunding saves time."
          : "The evidence is mixed. A person should decide.",
    reasoning_steps: steps,
    missing_evidence: b.gaps,
    injection_detected: injected,
    injection_note: injected ? "A buyer message tried to instruct the agent. It was ignored." : "",
  };
}

export function offlineWriter(c: Case, b: EvidenceBundle, purpose: "evidence" | "message" | "refund_note"): WriterOutput {
  if (purpose === "refund_note") {
    return { response_text: "We are sorry your order did not work out. We have accepted the claim and refunded the full amount.", statements: [], missing_evidence: [] };
  }
  const tracking = b.items.find((i) => i.kind === "tracking");
  const order = b.items.find((i) => i.kind === "order");
  const statements: WriterOutput["statements"] = [];
  if (order) statements.push({ text: `The order was paid through PayPal (${order.detail.split(".")[0]}).`, evidence_ids: [order.id] });
  if (tracking) statements.push({ text: `The parcel was sent with tracking. ${tracking.detail}`, evidence_ids: [tracking.id] });
  const text = [
    "Hello, thank you for looking into this case.",
    ...statements.map((s) => s.text),
    tracking ? "The tracking record is attached to this PayPal transaction." : "We do not have tracking for this shipment.",
    "We are happy to help the buyer if anything is still wrong.",
  ].join(" ");
  return { response_text: text.slice(0, 1500), statements, missing_evidence: b.gaps };
}
