import { audit } from "../audit";
import { paypal } from "../paypal";
import type { Case } from "./model";
import { upsertCase } from "./repo";
import type { ConfirmedRefund } from "./status";

const sourceOf = (): "sandbox" | "simulated" => (paypal().mode === "sandbox" ? "sandbox" : "simulated");

// Pull every dispute from PayPal (or the simulator) into the local cache.
export async function syncAllCases(): Promise<{ count: number; errors: string[] }> {
  const gw = paypal();
  const ids = await gw.listDisputeIds();
  const errors: string[] = [];
  for (const id of ids) {
    try {
      upsertCase(await gw.getDispute(id), sourceOf());
    } catch (err) {
      errors.push(`${id}: ${(err as Error).message}`);
    }
  }
  audit("system", `Synced ${ids.length - errors.length} of ${ids.length} disputes from ${gw.mode === "sandbox" ? "PayPal Sandbox" : "the simulator"}`, { errors });
  return { count: ids.length, errors };
}

export async function refreshCase(id: string): Promise<Case> {
  return upsertCase(await paypal().getDispute(id), sourceOf());
}

// Refund status comes from the refund resource itself, never from the
// dispute record or the AI.
export async function confirmedRefunds(c: Case): Promise<ConfirmedRefund[]> {
  const out: ConfirmedRefund[] = [];
  for (const id of c.refundIds) {
    const r = await paypal().getRefund(id);
    if (r) out.push({ id: r.id, status: r.status, amount: r.amount });
  }
  return out;
}
