import { linkNames, type PayPalDispute } from "../paypal/types";

// One internal shape for every dispute, whatever its source.
export type CaseSource = "sandbox" | "simulated";

export type Case = {
  id: string; // PayPal dispute id
  source: CaseSource;
  reason: string;
  reasonLabel: string;
  amount: number;
  currency: string;
  createdAt: string;
  updatedAt?: string;
  sellerResponseDue?: string;
  paypalStatus: string; // dispute.status exactly as PayPal sent it
  disputeState?: string;
  stage?: string; // INQUIRY or CHARGEBACK (PayPal's word for the claim stage)
  links: string[]; // available HATEOAS actions right now
  captureId?: string;
  itemSummary?: string;
  messages: { postedBy: string; at?: string; content: string }[];
  evidences: { type: string; source?: string; at?: string; notes?: string }[];
  outcome?: { code: string; reason?: string; amountRefunded?: string };
  refundIds: string[];
};

export const REASON_LABELS: Record<string, string> = {
  MERCHANDISE_OR_SERVICE_NOT_RECEIVED: "Item not received",
  MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED: "Not as described",
  UNAUTHORISED: "Unauthorised payment",
  CREDIT_NOT_PROCESSED: "Refund not processed",
  DUPLICATE_TRANSACTION: "Duplicate charge",
  INCORRECT_AMOUNT: "Wrong amount",
  PAYMENT_BY_OTHER_MEANS: "Paid another way",
  CANCELED_RECURRING_BILLING: "Cancelled subscription",
  PROBLEM_WITH_REMITTANCE: "Remittance problem",
  OTHER: "Other",
};

export function normalizeDispute(d: PayPalDispute, source: CaseSource): Case {
  const tx = d.disputed_transactions?.[0];
  return {
    id: d.dispute_id,
    source,
    reason: d.reason,
    reasonLabel: REASON_LABELS[d.reason] ?? d.reason.replace(/_/g, " ").toLowerCase(),
    amount: Number(d.dispute_amount.value),
    currency: d.dispute_amount.currency_code,
    createdAt: d.create_time,
    updatedAt: d.update_time,
    sellerResponseDue: d.seller_response_due_date,
    paypalStatus: d.status,
    disputeState: d.dispute_state,
    stage: d.dispute_life_cycle_stage,
    links: linkNames(d),
    captureId: tx?.seller_transaction_id,
    itemSummary: tx?.items?.map((i) => i.item_description).filter(Boolean).join(", ") || undefined,
    // Buyer identity (name, email, payer id) is intentionally not copied.
    messages: (d.messages ?? []).map((m) => ({ postedBy: m.posted_by, at: m.time_posted, content: m.content ?? "" })),
    evidences: (d.evidences ?? []).map((e) => ({ type: e.evidence_type, source: e.source, at: e.date, notes: e.notes })),
    outcome: d.dispute_outcome
      ? {
          code: d.dispute_outcome.outcome_code,
          reason: d.dispute_outcome.outcome_reason,
          amountRefunded: d.dispute_outcome.amount_refunded?.value,
        }
      : undefined,
    refundIds: (d.refund_details?.transactions ?? []).map((t) => t.id),
  };
}
