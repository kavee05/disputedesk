import { ACTION_PATH, PayPalDispute, type AllowedAction, type PayPalGateway } from "./types";
import { PayPalError, paypalRequest } from "./http";

// Real PayPal Sandbox. Every value shown in the UI for a sandbox case comes
// from one of these calls.
export class RestPayPalGateway implements PayPalGateway {
  readonly mode = "sandbox" as const;

  async listDisputeIds(): Promise<string[]> {
    const ids: string[] = [];
    let path: string | undefined = "/v1/customer/disputes?page_size=50";
    for (let page = 0; path && page < 20; page++) {
      const res: { body: any } = await paypalRequest("GET", path);
      for (const item of res.body?.items ?? []) ids.push(item.dispute_id);
      const next = (res.body?.links ?? []).find((l: any) => l.rel === "next")?.href as string | undefined;
      path = next ? next.replace(/^https:\/\/api-m\.sandbox\.paypal\.com/, "") : undefined;
    }
    return ids;
  }

  async getDispute(id: string) {
    const res = await paypalRequest("GET", `/v1/customer/disputes/${encodeURIComponent(id)}`, { caseId: id });
    return PayPalDispute.parse(res.body);
  }

  async getCapture(id: string) {
    const b = await this.optional(`/v2/payments/captures/${encodeURIComponent(id)}`);
    if (!b) return null;
    const up = (b.links ?? []).find((l: any) => l.rel === "up")?.href as string | undefined;
    return {
      id: b.id,
      status: b.status,
      statusReason: b.status_details?.reason,
      amount: b.amount?.value,
      currency: b.amount?.currency_code,
      createTime: b.create_time,
      orderId: up?.match(/\/orders\/([^/?]+)/)?.[1],
    };
  }

  async getOrder(id: string) {
    const b = await this.optional(`/v2/checkout/orders/${encodeURIComponent(id)}`);
    if (!b) return null;
    const unit = b.purchase_units?.[0] ?? {};
    return {
      id: b.id,
      status: b.status,
      description: unit.description,
      invoiceId: unit.invoice_id,
      shipToCountry: unit.shipping?.address?.country_code,
      createTime: b.create_time,
      items: (unit.items ?? []).map((i: any) => ({ name: i.name, quantity: i.quantity, unitAmount: i.unit_amount?.value })),
    };
  }

  async getTrackers(captureId: string) {
    const b = await this.optional(`/v1/shipping/trackers?transaction_id=${encodeURIComponent(captureId)}`);
    return (b?.trackers ?? []).map((t: any) => ({
      carrier: t.carrier === "OTHER" ? t.carrier_name_other ?? "Other" : t.carrier,
      trackingNumber: t.tracking_number,
      status: t.status,
      shipmentDate: t.shipment_date,
    }));
  }

  async getRefund(id: string) {
    const b = await this.optional(`/v2/payments/refunds/${encodeURIComponent(id)}`);
    if (!b) return null;
    return { id: b.id, status: b.status, amount: b.amount?.value, currency: b.amount?.currency_code, updateTime: b.update_time };
  }

  async act(disputeId: string, action: AllowedAction, payload: unknown, caseId: string) {
    const path = `/v1/customer/disputes/${encodeURIComponent(disputeId)}/${ACTION_PATH[action]}`;
    if (action === "provide_evidence") {
      // The evidence endpoint only accepts multipart with a JSON "input" part.
      const form = new FormData();
      form.append("input", new Blob([JSON.stringify(payload)], { type: "application/json" }));
      return paypalRequest("POST", path, { form, caseId, attempts: 1 });
    }
    // Actions are not retried: a timeout after PayPal accepted the call must
    // not send it twice.
    return paypalRequest("POST", path, { json: payload, caseId, attempts: 1 });
  }

  private async optional(path: string): Promise<any | null> {
    try {
      return (await paypalRequest("GET", path)).body;
    } catch (err) {
      if (err instanceof PayPalError && (err.status === 404 || err.status === 403)) return null;
      throw err;
    }
  }
}
