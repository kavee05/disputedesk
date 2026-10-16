import { describe, expect, it } from "vitest";
import { seedDemoCases } from "../src/lib/demo/seed";
import { SIM_REVIEW_MS, SIM_SETTLE_MS, SimulatedPayPalGateway } from "../src/lib/paypal/simulated-gateway";
import { linkNames } from "../src/lib/paypal/types";

// The simulator must behave like the real sandbox we measured, so the demo
// never shows a result the real PayPal path would not.
describe("simulated PayPal", () => {
  it("processes actions asynchronously and only accepts OTHER evidence", async () => {
    seedDemoCases();
    let t = Date.now();
    const gw = new SimulatedPayPalGateway(() => t);

    await expect(gw.act("SIM-DD-1001", "provide_evidence", { evidences: [{ evidence_type: "PROOF_OF_FULFILLMENT" }] }, "x")).rejects.toMatchObject({
      status: 400,
    });

    const res = await gw.act("SIM-DD-1001", "provide_evidence", { evidences: [{ evidence_type: "OTHER", notes: "Delivered" }] }, "x");
    expect(res.status).toBe(200);
    expect(linkNames(await gw.getDispute("SIM-DD-1001"))).toEqual(["self"]); // processing

    t += SIM_SETTLE_MS + 1;
    const review = await gw.getDispute("SIM-DD-1001");
    expect(review.status).toBe("UNDER_REVIEW");
    expect(linkNames(review)).not.toContain("adjudicate");

    t += SIM_REVIEW_MS + 1;
    expect(linkNames(await gw.getDispute("SIM-DD-1001"))).toContain("adjudicate");
  });

  it("refuses actions PayPal does not offer", async () => {
    seedDemoCases();
    const gw = new SimulatedPayPalGateway();
    // SIM-DD-1003 is a not-as-described inquiry: no provide_evidence link.
    await expect(gw.act("SIM-DD-1003", "provide_evidence", { evidences: [{ evidence_type: "OTHER" }] }, "x")).rejects.toMatchObject({ status: 422 });
  });

  it("accept_claim creates a COMPLETED refund", async () => {
    seedDemoCases();
    let t = Date.now();
    const gw = new SimulatedPayPalGateway(() => t);
    await gw.act("SIM-DD-1002", "accept_claim", { accept_claim_type: "REFUND" }, "x");
    t += SIM_SETTLE_MS + 1;
    const d = await gw.getDispute("SIM-DD-1002");
    expect(d.dispute_outcome?.outcome_code).toBe("RESOLVED_BUYER_FAVOUR");
    const refundId = d.refund_details?.transactions?.[0]?.id ?? "";
    expect((await gw.getRefund(refundId))?.status).toBe("COMPLETED");
  });
});
