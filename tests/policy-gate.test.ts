import { describe, expect, it } from "vitest";
import { DEFAULT_POLICY, policyGate, type GateInput } from "../src/lib/agent/policy";

const base: GateInput = {
  recommendation: "FIGHT",
  confidence: 0.9,
  amount: 20,
  reason: "MERCHANDISE_OR_SERVICE_NOT_RECEIVED",
  plannedAction: "provide_evidence",
  linkAvailable: true,
  unsupportedClaims: 0,
  injectionSuspected: false,
};

describe("Policy Gate", () => {
  it("allows AUTO when every limit is met", () => {
    expect(policyGate(base, DEFAULT_POLICY).decision).toBe("AUTO");
  });

  it("treats the auto-act limit as inclusive", () => {
    expect(policyGate({ ...base, amount: DEFAULT_POLICY.autoActLimit }, DEFAULT_POLICY).decision).toBe("AUTO");
    expect(policyGate({ ...base, amount: DEFAULT_POLICY.autoActLimit + 0.01 }, DEFAULT_POLICY).decision).toBe("NEEDS_APPROVAL");
  });

  it("needs approval below the minimum confidence", () => {
    const d = policyGate({ ...base, confidence: 0.5 }, DEFAULT_POLICY);
    expect(d.decision).toBe("NEEDS_APPROVAL");
    expect(d.reasons.join(" ")).toMatch(/Confidence 50%/);
  });

  it("never auto-acts on reasons the seller excluded", () => {
    expect(policyGate({ ...base, reason: "UNAUTHORISED" }, DEFAULT_POLICY).decision).toBe("NEEDS_APPROVAL");
  });

  it("always asks a human when the agent escalates", () => {
    expect(policyGate({ ...base, recommendation: "ESCALATE", plannedAction: null }, DEFAULT_POLICY).decision).toBe("NEEDS_APPROVAL");
  });

  it("blocks when PayPal does not offer the action", () => {
    expect(policyGate({ ...base, linkAvailable: false }, DEFAULT_POLICY).decision).toBe("BLOCKED");
    expect(policyGate({ ...base, plannedAction: null }, DEFAULT_POLICY).decision).toBe("BLOCKED");
  });

  it("needs approval when the draft has unsupported claims or the buyer tried prompt injection", () => {
    expect(policyGate({ ...base, unsupportedClaims: 1 }, DEFAULT_POLICY).decision).toBe("NEEDS_APPROVAL");
    expect(policyGate({ ...base, injectionSuspected: true }, DEFAULT_POLICY).decision).toBe("NEEDS_APPROVAL");
  });

  it("respects the master switch and per-direction switches", () => {
    expect(policyGate(base, { ...DEFAULT_POLICY, autoActEnabled: false }).decision).toBe("NEEDS_APPROVAL");
    expect(policyGate(base, { ...DEFAULT_POLICY, allowAutoFight: false }).decision).toBe("NEEDS_APPROVAL");
    expect(policyGate({ ...base, recommendation: "REFUND", plannedAction: "accept_claim" }, { ...DEFAULT_POLICY, allowAutoRefund: false }).decision).toBe("NEEDS_APPROVAL");
  });

  it("lists every reason, not just the first", () => {
    const d = policyGate({ ...base, amount: 500, confidence: 0.1, reason: "UNAUTHORISED" }, DEFAULT_POLICY);
    expect(d.reasons.length).toBe(3);
  });
});
