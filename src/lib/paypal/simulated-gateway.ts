import { and, eq } from "drizzle-orm";
import { audit } from "../audit";
import { db } from "../db";
import { simStore } from "../db/schema";
import { PayPalError } from "./http";
import {
  linkNames,
  PayPalDispute,
  type ActionResult,
  type AllowedAction,
  type CaptureInfo,
  type OrderInfo,
  type PayPalGateway,
  type RefundInfo,
  type TrackerInfo,
} from "./types";

// SIMULATED PayPal for demo mode (no credentials needed).
// It copies the behaviour we measured in the real sandbox (see FEASIBILITY.md):
// actions return a bare link, the dispute then sits in UNDER_REVIEW with only
// a "self" link for a while, available links change after every step, and
// only evidence type OTHER is accepted. Nothing here touches PayPal, and every
// case it serves is stored with source "simulated" and labelled in the UI.

export const SIM_SETTLE_MS = 4_000; // time an action takes to "process"
export const SIM_REVIEW_MS = 15_000; // time before the decision tool appears

type Pending = { applyAt: number; next: PayPalDispute };
type SimDispute = { dispute: PayPalDispute; pending?: Pending };

const link = (rel: string, id: string) => ({ rel, method: rel === "self" ? "GET" : "POST", href: `sim://disputes/${id}/${rel}` });
const withLinks = (d: PayPalDispute, rels: string[]): PayPalDispute => ({
  ...d,
  links: ["self", ...rels].map((r) => link(r, d.dispute_id)),
});

function read<T>(kind: string, id: string): T | null {
  const row = db().select().from(simStore).where(and(eq(simStore.kind, kind), eq(simStore.id, id))).get();
  return row ? (JSON.parse(row.data) as T) : null;
}

export function simWrite(kind: string, id: string, data: unknown) {
  db()
    .insert(simStore)
    .values({ kind, id, data: JSON.stringify(data) })
    .onConflictDoUpdate({ target: [simStore.kind, simStore.id], set: { data: JSON.stringify(data) } })
    .run();
}

export class SimulatedPayPalGateway implements PayPalGateway {
  readonly mode = "simulated" as const;
  constructor(private clock: () => number = Date.now) {}

  async listDisputeIds() {
    return db()
      .select({ id: simStore.id })
      .from(simStore)
      .where(eq(simStore.kind, "dispute"))
      .all()
      .map((r) => r.id);
  }

  async getDispute(id: string) {
    const sim = read<SimDispute>("dispute", id);
    if (!sim) throw new PayPalError("Simulated dispute not found", 404, { name: "RESOURCE_NOT_FOUND" });
    if (sim.pending) {
      if (this.clock() >= sim.pending.applyAt) {
        const settled: SimDispute = { dispute: sim.pending.next };
        // A dispute that went to review after seller evidence gets the
        // decision tool later, like the sandbox's adjudicate link.
        if (settled.dispute.status === "UNDER_REVIEW" && !settled.dispute.dispute_outcome) {
          settled.pending = {
            applyAt: this.clock() + SIM_REVIEW_MS,
            next: withLinks(settled.dispute, ["provide_supporting_info", "accept_claim", "adjudicate"]),
          };
          if (linkNames(sim.pending.next).includes("adjudicate")) settled.pending = undefined;
        }
        simWrite("dispute", id, settled);
        return settled.dispute;
      }
      return { ...sim.dispute, status: "UNDER_REVIEW", dispute_state: "UNDER_PAYPAL_REVIEW", links: [link("self", id)] };
    }
    return sim.dispute;
  }

  async getCapture(id: string) {
    return read<CaptureInfo>("capture", id);
  }
  async getOrder(id: string) {
    return read<OrderInfo>("order", id);
  }
  async getTrackers(captureId: string) {
    return read<TrackerInfo[]>("trackers", captureId) ?? [];
  }
  async getRefund(id: string) {
    return read<RefundInfo>("refund", id);
  }

  async act(disputeId: string, action: AllowedAction, payload: any, caseId: string): Promise<ActionResult> {
    const current = await this.getDispute(disputeId);
    const rel = action;
    if (!linkNames(current).includes(rel)) {
      throw new PayPalError("Simulated PayPal: action not allowed in the current dispute state", 422, {
        name: "UNPROCESSABLE_ENTITY",
        details: [{ issue: "ACTION_NOT_ALLOWED_IN_CURRENT_STATE" }],
      });
    }
    const t = new Date(this.clock()).toISOString();
    let next: PayPalDispute = { ...current, update_time: t };

    switch (action) {
      case "send_message":
        next.messages = [...(current.messages ?? []), { posted_by: "SELLER", time_posted: t, content: String(payload?.message ?? "") }];
        next = withLinks({ ...next, status: "WAITING_FOR_BUYER_RESPONSE", dispute_state: "REQUIRED_OTHER_PARTY_ACTION" }, [
          "send_message",
          "accept_claim",
          "escalate",
        ]);
        break;
      case "make_offer":
        next = withLinks({ ...next, status: "WAITING_FOR_BUYER_RESPONSE", offer: { seller_offered_amount: payload?.offer_amount } }, [
          "send_message",
          "accept_claim",
        ]);
        break;
      case "provide_evidence": {
        const types = (payload?.evidences ?? []).map((e: any) => e.evidence_type);
        if (types.some((x: string) => x !== "OTHER")) {
          // Same rejection the real sandbox gave us for PROOF_OF_FULFILLMENT.
          throw new PayPalError("Simulated PayPal returned 400 (EVIDENCE_TYPE_IS_NOT_ALLOWED)", 400, {
            name: "INVALID_REQUEST",
            details: [{ issue: "EVIDENCE_TYPE_IS_NOT_ALLOWED" }],
          });
        }
        next.evidences = [
          ...(current.evidences ?? []),
          ...(payload.evidences ?? []).map((e: any) => ({ evidence_type: e.evidence_type, source: "SUBMITTED_BY_SELLER", date: t, notes: e.notes })),
        ];
        next = withLinks({ ...next, status: "UNDER_REVIEW", dispute_state: "UNDER_PAYPAL_REVIEW", seller_response_due_date: undefined }, [
          "provide_supporting_info",
        ]);
        break;
      }
      case "accept_claim": {
        const refundId = `SIM-REFUND-${disputeId.slice(-6)}`;
        const capId = current.disputed_transactions?.[0]?.seller_transaction_id;
        simWrite("refund", refundId, {
          id: refundId,
          status: "COMPLETED",
          amount: current.dispute_amount.value,
          currency: current.dispute_amount.currency_code,
          updateTime: t,
        } satisfies RefundInfo);
        if (capId) {
          const cap = read<CaptureInfo>("capture", capId);
          if (cap) simWrite("capture", capId, { ...cap, status: "REFUNDED", statusReason: undefined });
        }
        next = withLinks(
          {
            ...next,
            status: "RESOLVED",
            dispute_state: "RESOLVED",
            refund_details: { transactions: [{ id: refundId }] },
            dispute_outcome: {
              outcome_code: "RESOLVED_BUYER_FAVOUR",
              outcome_reason: "SELLER_ISSUED_REFUND",
              amount_refunded: current.dispute_amount,
            },
          },
          [],
        );
        break;
      }
      case "adjudicate": {
        const sellerWins = payload?.adjudication_outcome === "SELLER_FAVOR";
        next = withLinks(
          {
            ...next,
            status: "RESOLVED",
            dispute_state: "RESOLVED",
            dispute_outcome: sellerWins
              ? { outcome_code: "RESOLVED_SELLER_FAVOUR", outcome_reason: "SELLER_PROVIDED_EVIDENCE" }
              : { outcome_code: "RESOLVED_BUYER_FAVOUR", outcome_reason: "PAYPAL_DECISION", amount_refunded: current.dispute_amount },
          },
          [],
        );
        if (!sellerWins) {
          const refundId = `SIM-REFUND-${disputeId.slice(-6)}`;
          simWrite("refund", refundId, { id: refundId, status: "COMPLETED", amount: current.dispute_amount.value, currency: current.dispute_amount.currency_code, updateTime: t });
          next.refund_details = { transactions: [{ id: refundId }] };
        }
        break;
      }
      default:
        throw new PayPalError(`Simulated PayPal does not support ${action}`, 400, {});
    }

    simWrite("dispute", disputeId, { dispute: current, pending: { applyAt: this.clock() + SIM_SETTLE_MS, next } } satisfies SimDispute);
    const body = { links: [{ href: `sim://disputes/${disputeId}`, rel: "detail", method: "GET" }] };
    audit("paypal_request", `SIMULATED POST ${action} on ${disputeId} -> 200`, { simulated: true, action }, caseId);
    return { status: 200, body };
  }
}
