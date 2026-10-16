import { and, eq, like } from "drizzle-orm";
import { audit } from "../audit";
import { db, now } from "../db";
import { auditLog } from "../db/schema";
import { paypal } from "../paypal";
import type { Case } from "./model";
import { upsertCase } from "./repo";

const sourceOf = (): "sandbox" | "simulated" => (paypal().mode === "sandbox" ? "sandbox" : "simulated");

function wasSandboxAdjudicated(caseId: string): boolean {
  return !!db()
    .select({ id: auditLog.id })
    .from(auditLog)
    .where(and(eq(auditLog.caseId, caseId), eq(auditLog.kind, "paypal_response"), like(auditLog.summary, "Sandbox adjudication % accepted%")))
    .get();
}

// Fetch one dispute plus the refund resources it points at. Refund status
// comes from the refund resource itself, never from the dispute record or AI.
export async function refreshCase(id: string): Promise<Case> {
  const gw = paypal();
  const dispute = await gw.getDispute(id);
  const refundIds = (dispute.refund_details?.transactions ?? []).map((t) => t.id);
  const confirmedRefunds = [];
  for (const rid of refundIds) {
    const r = await gw.getRefund(rid);
    if (r) confirmedRefunds.push({ id: r.id, status: r.status, amount: r.amount, checkedAt: now() });
  }
  return upsertCase(dispute, sourceOf(), { confirmedRefunds, sandboxAdjudicated: wasSandboxAdjudicated(id) });
}

export async function syncAllCases(): Promise<{ count: number; errors: string[] }> {
  const gw = paypal();
  const ids = await gw.listDisputeIds();
  const errors: string[] = [];
  for (const id of ids) {
    try {
      await refreshCase(id);
    } catch (err) {
      errors.push(`${id}: ${(err as Error).message}`);
    }
  }
  audit("system", `Synced ${ids.length - errors.length} of ${ids.length} disputes from ${gw.mode === "sandbox" ? "PayPal Sandbox" : "the simulator"}`, { errors });
  return { count: ids.length, errors };
}
