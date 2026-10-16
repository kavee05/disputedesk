import type { Case } from "./model";

// The single place that turns PayPal data into what the seller sees.
// Honesty rule: this function never looks at anything the AI produced.
// "Won" needs PayPal's dispute outcome. "Refunded" needs a refund resource
// that PayPal itself reports as COMPLETED (the dispute record lags behind the
// money by a couple of minutes, see FEASIBILITY.md).

export type ConfirmedRefund = { id: string; status: string; amount?: string };

export type StatusKey = "action" | "waiting" | "processing" | "review" | "won" | "refunded" | "lost" | "closed";

export type DisplayStatus = {
  key: StatusKey;
  label: string;
  detail: string;
  tone: "amber" | "blue" | "slate" | "green" | "red";
  confirmedByPayPal: boolean; // final result confirmed by a PayPal response
  sandboxAdjudication: boolean;
  defended: number; // money kept, only when PayPal confirms it
  refunded: number; // money returned, only when a refund is COMPLETED
};

const DEFENDED_OUTCOMES = new Set(["RESOLVED_SELLER_FAVOUR", "CANCELED_BY_BUYER"]);

export function deriveStatus(c: Case, refunds: ConfirmedRefund[], opts: { sandboxAdjudicated?: boolean } = {}): DisplayStatus {
  const completedRefunds = refunds.filter((r) => r.status === "COMPLETED");
  const refunded = completedRefunds.reduce((sum, r) => sum + Number(r.amount ?? 0), 0);
  const base = { sandboxAdjudication: false, defended: 0, refunded };
  // Simulated cases never claim that real PayPal said anything.
  const pp = c.source === "sandbox" ? "PayPal" : "Simulated PayPal";

  if (c.outcome && DEFENDED_OUTCOMES.has(c.outcome.code)) {
    const byBuyer = c.outcome.code === "CANCELED_BY_BUYER";
    return {
      ...base,
      key: "won",
      label: byBuyer ? "Closed by buyer" : "Won",
      detail: `${pp} outcome ${c.outcome.code}${c.outcome.reason ? ` (${c.outcome.reason})` : ""}`,
      tone: "green",
      confirmedByPayPal: true,
      sandboxAdjudication: !!opts.sandboxAdjudicated,
      defended: c.amount,
    };
  }

  if (completedRefunds.length > 0) {
    return {
      ...base,
      key: "refunded",
      label: "Refunded",
      detail: `Refund ${completedRefunds.map((r) => r.id).join(", ")} is COMPLETED at ${pp}`,
      tone: "slate",
      confirmedByPayPal: true,
      sandboxAdjudication: !!opts.sandboxAdjudicated && c.outcome?.code === "RESOLVED_BUYER_FAVOUR",
    };
  }

  if (c.outcome) {
    const buyerWon = c.outcome.code === "RESOLVED_BUYER_FAVOUR";
    return {
      ...base,
      key: buyerWon ? "lost" : "closed",
      label: buyerWon ? "Resolved for buyer" : "Closed",
      detail: buyerWon
        ? `${pp} resolved this for the buyer. Waiting for ${pp} to confirm the refund.`
        : `${pp} outcome ${c.outcome.code}`,
      tone: buyerWon ? "red" : "slate",
      confirmedByPayPal: true,
      sandboxAdjudication: buyerWon && !!opts.sandboxAdjudicated,
    };
  }

  const onlySelf = c.links.every((l) => l === "self");
  switch (c.paypalStatus) {
    case "UNDER_REVIEW":
      return onlySelf
        ? { ...base, key: "processing", label: "Processing at PayPal", detail: `${pp} accepted the last step and is applying it. This usually takes a few minutes.`, tone: "blue", confirmedByPayPal: false }
        : { ...base, key: "review", label: "Under review at PayPal", detail: `${pp} is reviewing the case. No outcome yet.`, tone: "blue", confirmedByPayPal: false };
    case "WAITING_FOR_BUYER_RESPONSE":
      return { ...base, key: "waiting", label: "Waiting for buyer", detail: "The buyer has to respond next.", tone: "slate", confirmedByPayPal: false };
    case "WAITING_FOR_SELLER_RESPONSE":
    case "OPEN":
      return { ...base, key: "action", label: "Needs your response", detail: `${pp} is waiting for the seller.`, tone: "amber", confirmedByPayPal: false };
    default:
      return { ...base, key: "review", label: c.paypalStatus.replace(/_/g, " ").toLowerCase(), detail: `${pp} status ${c.paypalStatus}`, tone: "slate", confirmedByPayPal: false };
  }
}

export function isOpen(s: DisplayStatus) {
  return s.key === "action" || s.key === "waiting" || s.key === "processing" || s.key === "review";
}
