// Probe 4: can the seller app create a chargeback dispute programmatically?
// Uses the sandbox-only /v2/customer-support/process-chargeback endpoint
// against order C1. If this works, the demo seed script can mint real
// sandbox disputes on demand instead of relying on hand-opened ones.
//
//   npm run probe:chargeback
import { api, loadState, saveState } from "./lib.ts";

const state = loadState();
const c1 = state.cases.C1;
if (!c1?.captureId || !c1.merchantId) {
  console.log("C1 has no capture yet. Approve its link and run `npm run probe:orders -- capture` first.");
  process.exit(1);
}

const now = new Date();
const inDays = (n: number) => new Date(now.getTime() + n * 86_400_000).toISOString();

const res = await api("chargeback-C1", "POST", "/v2/customer-support/process-chargeback", {
  json: {
    adjacency: "PAYPAL",
    file_layout: "ATCK_CB",
    merchant_id: c1.merchantId,
    financial_institution: { processor: "FDMS" },
    transaction: { id_enc: c1.captureId, amount: { currency_code: "USD", value: c1.amount } },
    instrument: { instrument_type: "CARD", card_brand: "VISA", credit_card_transaction_id: String(Date.now()), external: false },
    dispute: {
      id: null,
      stage: "CHARGEBACK",
      response_date: inDays(10),
      status: "2",
      amount: { currency_code: "USD", value: c1.amount },
      receive_date: now.toISOString(),
      event_code: "CHARGEBACK_INITIATED",
      money_movement_date: now.toISOString(),
      event_type: "DEBIT",
      chargeback_type: "REPORTED_TO_PROCESSOR",
      processor_info: { reference_number: String(Date.now()), reason_code: "C2", notes: "DisputeDesk feasibility probe" },
    },
  },
});

console.log(`  response: ${JSON.stringify(res.body).slice(0, 800)}`);
const disputeId = res.body?.dispute_id ?? res.body?.id;
if (res.ok && disputeId) {
  c1.disputeId = disputeId;
  saveState(state);
  console.log(`  Chargeback created: ${disputeId}. Inspect with: npm run probe:disputes -- inspect C1`);
}
