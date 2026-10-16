import { describe, expect, it } from "vitest";
import type { Case } from "../src/lib/cases/model";
import { deriveStatus } from "../src/lib/cases/status";

// The honesty rule: what the seller sees comes from PayPal data only.
const open: Case = {
  id: "PP-R-TEST-1",
  source: "sandbox",
  reason: "MERCHANDISE_OR_SERVICE_NOT_RECEIVED",
  reasonLabel: "Item not received",
  amount: 48,
  currency: "USD",
  createdAt: "2026-10-16T10:27:31Z",
  paypalStatus: "WAITING_FOR_SELLER_RESPONSE",
  links: ["self", "provide_evidence", "accept_claim"],
  messages: [],
  evidences: [],
  refundIds: [],
};

describe("status comes only from PayPal", () => {
  it("an open case is never won or defended", () => {
    const s = deriveStatus(open, []);
    expect(s.key).toBe("action");
    expect(s.defended).toBe(0);
    expect(s.confirmedByPayPal).toBe(false);
  });

  it("a 200 from an action leaves the case 'Processing at PayPal', not won", () => {
    // What the sandbox returns right after provide-evidence: UNDER_REVIEW, only a self link.
    const s = deriveStatus({ ...open, paypalStatus: "UNDER_REVIEW", links: ["self"] }, []);
    expect(s.key).toBe("processing");
    expect(s.defended).toBe(0);
  });

  it("under review with other links is 'Under review at PayPal'", () => {
    expect(deriveStatus({ ...open, paypalStatus: "UNDER_REVIEW", links: ["self", "provide_supporting_info"] }, []).label).toBe("Under review at PayPal");
  });

  it("counts money as defended only with PayPal's seller-favour outcome", () => {
    const won = deriveStatus({ ...open, paypalStatus: "RESOLVED", outcome: { code: "RESOLVED_SELLER_FAVOUR" } }, []);
    expect(won.key).toBe("won");
    expect(won.defended).toBe(48);
    expect(won.confirmedByPayPal).toBe(true);
  });

  it("labels a sandbox adjudication", () => {
    const won = deriveStatus({ ...open, paypalStatus: "RESOLVED", outcome: { code: "RESOLVED_SELLER_FAVOUR" } }, [], { sandboxAdjudicated: true });
    expect(won.sandboxAdjudication).toBe(true);
  });

  it("says Refunded only when the refund resource is COMPLETED, even before the dispute record catches up", () => {
    // Observed in the sandbox: refund COMPLETED while the dispute still said UNDER_REVIEW.
    const lagging = { ...open, paypalStatus: "UNDER_REVIEW", links: ["self"], refundIds: ["7TH269592C008470N"] };
    expect(deriveStatus(lagging, [{ id: "7TH269592C008470N", status: "PENDING", amount: "48.00" }]).key).toBe("processing");
    const done = deriveStatus(lagging, [{ id: "7TH269592C008470N", status: "COMPLETED", amount: "48.00" }]);
    expect(done.key).toBe("refunded");
    expect(done.refunded).toBe(48);
    expect(done.defended).toBe(0);
  });

  it("simulated cases never say real PayPal did something", () => {
    const sim = { ...open, source: "simulated" as const };
    for (const c of [
      sim,
      { ...sim, paypalStatus: "UNDER_REVIEW", links: ["self"] },
      { ...sim, paypalStatus: "UNDER_REVIEW", links: ["self", "provide_supporting_info"] },
      { ...sim, paypalStatus: "RESOLVED", outcome: { code: "RESOLVED_SELLER_FAVOUR" } },
    ]) {
      const detail = deriveStatus(c, []).detail;
      expect(detail).toMatch(/Simulated PayPal/);
    }
    expect(deriveStatus(open, []).detail).not.toMatch(/Simulated/);
  });

  it("a buyer-favour outcome without a confirmed refund is not shown as refunded", () => {
    const s = deriveStatus({ ...open, paypalStatus: "RESOLVED", outcome: { code: "RESOLVED_BUYER_FAVOUR" }, refundIds: ["R1"] }, []);
    expect(s.key).toBe("lost");
    expect(s.refunded).toBe(0);
  });
});
