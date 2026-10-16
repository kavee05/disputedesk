import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { policy as policyTable } from "../db/schema";
import type { AllowedAction } from "../paypal/types";

export const SellerPolicy = z.object({
  autoActEnabled: z.boolean(),
  autoActLimit: z.number().min(0).max(100_000), // USD, inclusive
  minConfidence: z.number().min(0).max(1),
  neverAutoReasons: z.array(z.string()),
  allowAutoRefund: z.boolean(),
  allowAutoFight: z.boolean(),
  hourlyValue: z.number().min(0).max(10_000), // what an hour of the seller's time is worth
  hoursPerDispute: z.number().min(0).max(100), // time a dispute takes by hand
  storePolicy: z.string().max(2000),
});
export type SellerPolicy = z.infer<typeof SellerPolicy>;

export const DEFAULT_POLICY: SellerPolicy = {
  autoActEnabled: true,
  autoActLimit: 25,
  minConfidence: 0.75,
  neverAutoReasons: ["UNAUTHORISED"],
  allowAutoRefund: true,
  allowAutoFight: true,
  hourlyValue: 12,
  hoursPerDispute: 1.5,
  storePolicy:
    "We ship every order within 2 business days with tracking. Buyers can report a problem within 30 days of delivery. Items damaged in transit are replaced or refunded once we see a photo.",
};

export function getPolicy(): SellerPolicy {
  const row = db().select().from(policyTable).where(eq(policyTable.id, 1)).get();
  if (!row) return DEFAULT_POLICY;
  const parsed = SellerPolicy.safeParse(JSON.parse(row.data));
  return parsed.success ? parsed.data : DEFAULT_POLICY;
}

export function savePolicy(p: SellerPolicy) {
  const data = JSON.stringify(SellerPolicy.parse(p));
  db().insert(policyTable).values({ id: 1, data }).onConflictDoUpdate({ target: policyTable.id, set: { data } }).run();
}

export function resetPolicy() {
  savePolicy(DEFAULT_POLICY);
}

// ---------------------------------------------------------------------------
// Policy Gate. Deterministic code, no AI. Decides whether the agent may act
// on its own (AUTO), must wait for the seller (NEEDS_APPROVAL), or cannot act
// at all because PayPal does not offer the action right now (BLOCKED).

export type Recommendation = "FIGHT" | "REFUND" | "ESCALATE";

export type GateInput = {
  recommendation: Recommendation;
  confidence: number;
  amount: number;
  reason: string;
  plannedAction: AllowedAction | null;
  linkAvailable: boolean;
  unsupportedClaims: number; // writer statements without evidence
  injectionSuspected: boolean;
};

export type GateDecision = { decision: "AUTO" | "NEEDS_APPROVAL" | "BLOCKED"; reasons: string[] };

export function policyGate(input: GateInput, p: SellerPolicy): GateDecision {
  if (input.recommendation === "ESCALATE") {
    return { decision: "NEEDS_APPROVAL", reasons: ["The agent asked for a human decision on this case."] };
  }
  if (!input.plannedAction || !input.linkAvailable) {
    return { decision: "BLOCKED", reasons: ["PayPal does not offer this action for the dispute right now."] };
  }
  const reasons: string[] = [];
  if (!p.autoActEnabled) reasons.push("Automatic actions are turned off in your policy.");
  if (p.neverAutoReasons.includes(input.reason)) reasons.push(`Your policy never acts automatically on ${input.reason} disputes.`);
  if (input.amount > p.autoActLimit) reasons.push(`Amount ${input.amount.toFixed(2)} is above your auto-act limit of ${p.autoActLimit.toFixed(2)}.`);
  if (input.confidence < p.minConfidence) {
    reasons.push(`Confidence ${Math.round(input.confidence * 100)}% is below your minimum of ${Math.round(p.minConfidence * 100)}%.`);
  }
  if (input.recommendation === "REFUND" && !p.allowAutoRefund) reasons.push("Your policy does not allow automatic refunds.");
  if (input.recommendation === "FIGHT" && !p.allowAutoFight) reasons.push("Your policy does not allow automatic evidence submission.");
  if (input.unsupportedClaims > 0) reasons.push(`${input.unsupportedClaims} statement(s) in the draft are not backed by evidence.`);
  if (input.injectionSuspected) reasons.push("The buyer's messages contain instructions aimed at the agent. A human should look first.");
  return reasons.length ? { decision: "NEEDS_APPROVAL", reasons } : { decision: "AUTO", reasons: ["Within every limit in your policy."] };
}
