import { eq } from "drizzle-orm";
import { audit } from "../audit";
import { db, now } from "../db";
import { simStore } from "../db/schema";
import { paypalRequest } from "../paypal/http";
import { simWrite } from "../paypal/simulated-gateway";

// Sandbox only. Creates real checkout orders on the seller's sandbox account
// so a person can pay them as the sandbox buyer and then open fresh disputes
// by hand. This is how sandbox disputes get replenished for repeat demos.

export type KitOrder = {
  orderId: string;
  item: string;
  amount: string;
  approveUrl: string;
  withTracking: boolean;
  createdAt: string;
  captureId?: string;
  captureStatus?: string;
  captureReason?: string;
  tracking?: string;
};

export const KIT_ITEMS = [
  { item: "Handwoven rattan tote bag", amount: "48.00", withTracking: true },
  { item: "Batik silk scarf, indigo", amount: "32.00", withTracking: true },
  { item: "Coconut shell candle set", amount: "15.00", withTracking: false },
  { item: "Pandan leaf placemats, set of 4", amount: "27.00", withTracking: false },
];

export function listKitOrders(): KitOrder[] {
  return db()
    .select()
    .from(simStore)
    .where(eq(simStore.kind, "kit_order"))
    .all()
    .map((r) => JSON.parse(r.data) as KitOrder)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createKitOrders(): Promise<KitOrder[]> {
  const created: KitOrder[] = [];
  for (const k of KIT_ITEMS) {
    const res = await paypalRequest("POST", "/v2/checkout/orders", {
      json: {
        intent: "CAPTURE",
        purchase_units: [
          {
            description: k.item,
            amount: { currency_code: "USD", value: k.amount, breakdown: { item_total: { currency_code: "USD", value: k.amount } } },
            items: [{ name: k.item, quantity: "1", category: "PHYSICAL_GOODS", unit_amount: { currency_code: "USD", value: k.amount } }],
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: "DisputeDesk Demo Shop (Sandbox)",
              shipping_preference: "GET_FROM_FILE",
              user_action: "PAY_NOW",
              return_url: "https://example.com/disputedesk/approved",
              cancel_url: "https://example.com/disputedesk/cancelled",
            },
          },
        },
      },
    });
    const approveUrl = (res.body.links ?? []).find((l: any) => l.rel === "payer-action" || l.rel === "approve")?.href ?? "";
    const order: KitOrder = { orderId: res.body.id, item: k.item, amount: k.amount, approveUrl, withTracking: k.withTracking, createdAt: now() };
    simWrite("kit_order", order.orderId, order);
    created.push(order);
  }
  audit("system", `Created ${created.length} sandbox test orders for new demo cases`, { orders: created.map((o) => o.orderId) });
  return created;
}

let trackingSeq = 0;

export async function captureKitOrders(): Promise<{ captured: number; pending: string[]; errors: string[] }> {
  const pending: string[] = [];
  const errors: string[] = [];
  let captured = 0;
  for (const o of listKitOrders()) {
    try {
      if (!o.captureId) {
        const res = await paypalRequest("POST", `/v2/checkout/orders/${o.orderId}/capture`, { json: {}, attempts: 1 });
        o.captureId = res.body.purchase_units?.[0]?.payments?.captures?.[0]?.id;
        captured++;
      }
      if (o.captureId) {
        const cap = await paypalRequest("GET", `/v2/payments/captures/${o.captureId}`);
        o.captureStatus = cap.body.status;
        o.captureReason = cap.body.status_details?.reason;
        if (o.captureStatus !== "COMPLETED" && o.captureStatus !== "PENDING") pending.push(`${o.item}: ${o.captureStatus}`);
        if (o.captureStatus === "PENDING" && o.captureReason !== "BUYER_COMPLAINT") pending.push(`${o.item}: PENDING (${o.captureReason ?? "no reason"})`);
        if (o.withTracking && !o.tracking && o.captureStatus === "COMPLETED") {
          const number = `9400111899${Date.now().toString().slice(-8)}${String(trackingSeq++ % 10)}`.slice(0, 22);
          await paypalRequest("POST", `/v2/checkout/orders/${o.orderId}/track`, {
            json: { capture_id: o.captureId, tracking_number: number, carrier: "USPS", notify_payer: false },
          });
          o.tracking = `USPS ${number}`;
        }
      }
    } catch (err) {
      const msg = (err as Error).message;
      // An order the buyer has not approved yet cannot be captured.
      errors.push(`${o.item}: ${/UNPROCESSABLE|ORDER_NOT_APPROVED|422/.test(msg) ? "not approved by the buyer yet" : msg}`);
    }
    simWrite("kit_order", o.orderId, o);
  }
  return { captured, pending, errors };
}
