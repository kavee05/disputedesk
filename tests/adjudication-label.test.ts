import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

import { settledBySandboxTool, statusOf } from "../src/lib/app";
import type { Case } from "../src/lib/cases/model";

const base: Case = {
  id: "PP-R-BFQ-10193073",
  source: "sandbox",
  reason: "MERCHANDISE_OR_SERVICE_NOT_RECEIVED",
  reasonLabel: "Item not received",
  amount: 48,
  currency: "USD",
  createdAt: "2026-10-16T10:27:31Z",
  paypalStatus: "RESOLVED",
  links: ["self"],
  messages: [],
  evidences: [],
  refundIds: [],
};

describe("Sandbox adjudication label", () => {
  it("labels a decided sandbox case even if another tool called adjudicate", () => {
    // Real D1 outcome from the sandbox (FEASIBILITY.md).
    const won = { ...base, outcome: { code: "RESOLVED_SELLER_FAVOUR", reason: "INELIGIBLE_BUYER_PROTECTION_POLICY" } };
    expect(settledBySandboxTool(won)).toBe(true);
    expect(statusOf(won).sandboxAdjudication).toBe(true);
    expect(statusOf(won).defended).toBe(48);
  });

  it("does not label a case the seller settled with a refund", () => {
    expect(settledBySandboxTool({ ...base, outcome: { code: "RESOLVED_BUYER_FAVOUR", reason: "SELLER_ISSUED_REFUND" } })).toBe(false);
  });

  it("does not apply to simulated cases unless the simulator decided them", () => {
    const sim = { ...base, source: "simulated" as const, outcome: { code: "RESOLVED_SELLER_FAVOUR", reason: "SELLER_PROVIDED_EVIDENCE" } };
    expect(settledBySandboxTool(sim)).toBe(false);
    expect(settledBySandboxTool({ ...sim, sandboxAdjudicated: true })).toBe(true);
  });
});
