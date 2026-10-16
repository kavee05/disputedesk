import { z } from "zod";

// The subset of the PayPal dispute resource DisputeDesk relies on. Unknown
// fields are kept (looseObject) so the raw record stays complete.
const Money = z.object({ currency_code: z.string(), value: z.string() });

export const PayPalDispute = z.looseObject({
  dispute_id: z.string(),
  create_time: z.string(),
  update_time: z.string().optional(),
  reason: z.string(),
  status: z.string(),
  dispute_state: z.string().optional(),
  dispute_life_cycle_stage: z.string().optional(),
  dispute_channel: z.string().optional(),
  dispute_amount: Money,
  seller_response_due_date: z.string().optional(),
  disputed_transactions: z
    .array(
      z.looseObject({
        seller_transaction_id: z.string().optional(),
        buyer_transaction_id: z.string().optional(),
        create_time: z.string().optional(),
        transaction_status: z.string().optional(),
        gross_amount: Money.optional(),
        buyer: z.looseObject({ name: z.string().optional(), email: z.string().optional() }).optional(),
        items: z.array(z.looseObject({ item_description: z.string().optional() })).optional(),
      }),
    )
    .optional(),
  messages: z
    .array(z.looseObject({ posted_by: z.string(), time_posted: z.string().optional(), content: z.string().optional() }))
    .optional(),
  evidences: z
    .array(
      z.looseObject({
        evidence_type: z.string(),
        source: z.string().optional(),
        date: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .optional(),
  dispute_outcome: z
    .looseObject({ outcome_code: z.string(), outcome_reason: z.string().optional(), amount_refunded: Money.optional() })
    .optional(),
  refund_details: z
    .looseObject({ transactions: z.array(z.looseObject({ id: z.string() })).optional() })
    .optional(),
  offer: z.looseObject({}).optional(),
  links: z.array(z.looseObject({ rel: z.string(), href: z.string().optional(), method: z.string().optional() })).optional(),
});
export type PayPalDispute = z.infer<typeof PayPalDispute>;

// The only dispute actions DisputeDesk will ever send. The executor refuses
// anything else. Sandbox-only tools are listed separately.
export const AGENT_ACTIONS = ["send_message", "make_offer", "provide_evidence", "accept_claim"] as const;
export const SANDBOX_TOOL_ACTIONS = ["adjudicate"] as const;
export const ALLOWED_ACTIONS = [...AGENT_ACTIONS, ...SANDBOX_TOOL_ACTIONS] as const;
export type AllowedAction = (typeof ALLOWED_ACTIONS)[number];

export const ACTION_PATH: Record<AllowedAction, string> = {
  send_message: "send-message",
  make_offer: "make-offer",
  provide_evidence: "provide-evidence",
  accept_claim: "accept-claim",
  adjudicate: "adjudicate",
};

export type ActionResult = { status: number; body: unknown; debugId?: string };

export type CaptureInfo = {
  id: string;
  status: string;
  statusReason?: string;
  amount?: string;
  currency?: string;
  createTime?: string;
  orderId?: string;
};
export type OrderInfo = {
  id: string;
  status: string;
  items: { name: string; quantity: string; unitAmount?: string }[];
  description?: string;
  invoiceId?: string;
  shipToCountry?: string;
  createTime?: string;
};
export type TrackerInfo = { carrier: string; trackingNumber: string; status: string; shipmentDate?: string };
export type RefundInfo = { id: string; status: string; amount?: string; currency?: string; updateTime?: string };

export interface PayPalGateway {
  readonly mode: "sandbox" | "simulated";
  listDisputeIds(): Promise<string[]>;
  getDispute(id: string): Promise<PayPalDispute>;
  getCapture(id: string): Promise<CaptureInfo | null>;
  getOrder(id: string): Promise<OrderInfo | null>;
  getTrackers(captureId: string): Promise<TrackerInfo[]>;
  getRefund(id: string): Promise<RefundInfo | null>;
  act(disputeId: string, action: AllowedAction, payload: unknown, caseId: string): Promise<ActionResult>;
}

export const linkNames = (d: Pick<PayPalDispute, "links">) =>
  (d.links ?? []).map((l) => l.rel.toLowerCase().replace(/-/g, "_"));
