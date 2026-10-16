import { eq } from "drizzle-orm";
import { db, now } from "../db";
import { evidenceBundles } from "../db/schema";
import type { Case } from "../cases/model";
import { getRawDispute } from "../cases/repo";
import { paypal } from "../paypal";
import { scrubPersonalData } from "./redact";

// Gathers everything known about a dispute into one bundle of numbered items
// the agent can cite (E1, E2, ...). Items say where they came from, and buyer
// messages are marked untrusted so the model treats them as data only.

export type EvidenceKind = "dispute" | "order" | "payment" | "tracking" | "buyer_message" | "seller_message" | "refund" | "store_policy";

export type EvidenceItem = {
  id: string;
  kind: EvidenceKind;
  title: string;
  detail: string;
  source: string; // e.g. "PayPal Orders API", "Seller policy"
  fromPayPal: boolean;
  untrusted: boolean;
  at?: string;
};

export type EvidenceBundle = {
  caseId: string;
  collectedAt: string;
  items: EvidenceItem[];
  gaps: string[]; // evidence a reviewer would expect but we could not find
  facts: { hasTracking: boolean; trackingDelivered: boolean; trackingShipped: boolean; captureStatus?: string; orderFound: boolean };
};

export async function collectEvidence(c: Case, storePolicy: string): Promise<EvidenceBundle> {
  const gw = paypal();
  const source = gw.mode === "sandbox" ? "PayPal Sandbox" : "Simulated PayPal";
  const raw = getRawDispute(c.id);
  const buyerNames = (raw?.disputed_transactions ?? []).map((t) => t.buyer?.name ?? "").filter(Boolean);
  const items: EvidenceItem[] = [];
  const gaps: string[] = [];
  const add = (item: Omit<EvidenceItem, "id">) => items.push({ id: `E${items.length + 1}`, ...item });

  add({
    kind: "dispute",
    title: `Dispute opened: ${c.reasonLabel}`,
    detail: `${c.currency} ${c.amount.toFixed(2)} disputed. Stage ${c.stage ?? "unknown"}, PayPal status ${c.paypalStatus}.${c.itemSummary ? ` Items: ${c.itemSummary}.` : ""}`,
    source: `${source} Disputes API`,
    fromPayPal: true,
    untrusted: false,
    at: c.createdAt,
  });

  const facts: EvidenceBundle["facts"] = { hasTracking: false, trackingDelivered: false, trackingShipped: false, orderFound: false };

  if (c.captureId) {
    const capture = await gw.getCapture(c.captureId);
    if (capture) {
      facts.captureStatus = capture.status;
      add({
        kind: "payment",
        title: `Payment ${capture.status.toLowerCase()}`,
        detail: `Capture ${capture.id} for ${capture.currency ?? c.currency} ${capture.amount ?? ""}, status ${capture.status}${capture.statusReason ? ` (${capture.statusReason})` : ""}.`,
        source: `${source} Payments API`,
        fromPayPal: true,
        untrusted: false,
        at: capture.createTime,
      });
      if (capture.orderId) {
        const order = await gw.getOrder(capture.orderId);
        if (order) {
          facts.orderFound = true;
          add({
            kind: "order",
            title: "Order details",
            detail: `Order ${order.id} (${order.status}). ${order.items.map((i) => `${i.quantity} x ${i.name}${i.unitAmount ? ` at ${i.unitAmount}` : ""}`).join("; ") || order.description || "No line items"}.${order.shipToCountry ? ` Ships to ${order.shipToCountry}.` : ""}${order.invoiceId ? ` Invoice ${order.invoiceId}.` : ""}`,
            source: `${source} Orders API`,
            fromPayPal: true,
            untrusted: false,
            at: order.createTime,
          });
        }
      }
      const trackers = await gw.getTrackers(c.captureId);
      for (const t of trackers) {
        facts.hasTracking = true;
        if (t.status === "DELIVERED") facts.trackingDelivered = true;
        if (t.status === "SHIPPED" || t.status === "DELIVERED") facts.trackingShipped = true;
        add({
          kind: "tracking",
          title: `Shipment ${t.status.toLowerCase()} (${t.carrier})`,
          detail: `Tracking number ${t.trackingNumber}, carrier ${t.carrier}, status ${t.status}${t.shipmentDate ? `, shipped ${t.shipmentDate}` : ""}.`,
          source: `${source} Tracking API`,
          fromPayPal: true,
          untrusted: false,
          at: t.shipmentDate,
        });
      }
    }
  }
  if (!facts.orderFound) gaps.push("No order record linked to this payment");
  if (!facts.hasTracking) gaps.push("No shipment tracking on file for this payment");
  else if (!facts.trackingDelivered) gaps.push("Tracking shows shipped but not delivered");

  for (const m of c.messages) {
    const fromBuyer = m.postedBy === "BUYER";
    add({
      kind: fromBuyer ? "buyer_message" : "seller_message",
      title: fromBuyer ? "Message from buyer" : "Message from seller",
      detail: scrubPersonalData(m.content, buyerNames),
      source: `${source} dispute messages`,
      fromPayPal: true,
      untrusted: fromBuyer,
      at: m.at,
    });
  }

  for (const id of c.refundIds) {
    const r = await gw.getRefund(id);
    if (r) {
      add({ kind: "refund", title: `Refund ${r.status.toLowerCase()}`, detail: `Refund ${r.id} for ${r.currency} ${r.amount}, status ${r.status}.`, source: `${source} Payments API`, fromPayPal: true, untrusted: false, at: r.updateTime });
    }
  }

  if (storePolicy.trim()) {
    add({ kind: "store_policy", title: "Store shipping and returns policy", detail: storePolicy.trim(), source: "Seller policy (entered in DisputeDesk)", fromPayPal: false, untrusted: false });
  }

  const bundle: EvidenceBundle = { caseId: c.id, collectedAt: now(), items, gaps, facts };
  db()
    .insert(evidenceBundles)
    .values({ caseId: c.id, data: JSON.stringify(bundle), createdAt: bundle.collectedAt })
    .onConflictDoUpdate({ target: evidenceBundles.caseId, set: { data: JSON.stringify(bundle), createdAt: bundle.collectedAt } })
    .run();
  return bundle;
}

export function getEvidence(caseId: string): EvidenceBundle | null {
  const row = db().select().from(evidenceBundles).where(eq(evidenceBundles.caseId, caseId)).get();
  return row ? (JSON.parse(row.data) as EvidenceBundle) : null;
}
