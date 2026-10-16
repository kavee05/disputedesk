// Probe 2: goods-and-services checkout orders plus shipment tracking.
//
//   npm run probe:orders -- create    creates 5 orders and prints approve links
//   (you approve each link as the sandbox Personal buyer)
//   npm run probe:orders -- capture   captures approved orders, adds tracking to D1 and D2
//   npm run probe:orders -- status    reads orders and trackers back
//
// D1-D4 become the hand-opened disputes. C1 is reserved for the chargeback probe.
import { api, loadState, saveState, type CaseKey, type CaseState } from "./lib.ts";

const PLAN: Record<CaseKey, { amount: string; item: string; tracking?: { carrier: string; number: string } }> = {
  D1: { amount: "48.00", item: "Handwoven rattan tote bag", tracking: { carrier: "USPS", number: "9400111899223197428490" } },
  D2: { amount: "32.00", item: "Batik silk scarf, indigo", tracking: { carrier: "USPS", number: "9400111899223197428506" } },
  D3: { amount: "15.00", item: "Coconut shell candle set" },
  D4: { amount: "27.00", item: "Pandan leaf placemats, set of 4" },
  C1: { amount: "20.00", item: "Teak wood serving spoon" },
};

const cmd = process.argv[2];
const state = loadState();

if (cmd === "create") {
  for (const [key, plan] of Object.entries(PLAN) as [CaseKey, (typeof PLAN)[CaseKey]][]) {
    if (state.cases[key]?.orderId) {
      console.log(`${key}: order already exists (${state.cases[key]!.orderId}), skipping`);
      continue;
    }
    const res = await api(`order-create-${key}`, "POST", "/v2/checkout/orders", {
      json: {
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: key,
            description: plan.item,
            amount: {
              currency_code: "USD",
              value: plan.amount,
              breakdown: { item_total: { currency_code: "USD", value: plan.amount } },
            },
            items: [
              {
                name: plan.item,
                quantity: "1",
                category: "PHYSICAL_GOODS",
                unit_amount: { currency_code: "USD", value: plan.amount },
              },
            ],
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
    if (!res.ok) continue;
    const approve = res.body.links?.find((l: any) => l.rel === "payer-action" || l.rel === "approve")?.href;
    state.cases[key] = { amount: plan.amount, item: plan.item, orderId: res.body.id, approveUrl: approve };
    saveState(state);
  }
  console.log("\nApprove each link as the sandbox Personal buyer (it redirects to example.com afterwards, that is expected):");
  for (const [key, c] of Object.entries(state.cases)) {
    if (!c.captureId) console.log(`  ${key}  $${c.amount}  ${c.item}\n      ${c.approveUrl}`);
  }
} else if (cmd === "capture") {
  const notCompleted: string[] = [];
  for (const [key, c] of Object.entries(state.cases) as [CaseKey, CaseState][]) {
    if (!c.orderId) continue;
    if (!c.captureId) {
      const res = await api(`order-capture-${key}`, "POST", `/v2/checkout/orders/${c.orderId}/capture`, { json: {} });
      if (!res.ok) {
        console.log(`  ${key}: capture failed, was the order approved? ${res.body?.details?.[0]?.issue ?? ""}`);
        notCompleted.push(`${key} (capture call failed)`);
        continue;
      }
      const capture = res.body.purchase_units?.[0]?.payments?.captures?.[0];
      c.captureId = capture?.id;
      c.merchantId = res.body.purchase_units?.[0]?.payee?.merchant_id;
      saveState(state);
    }
    // Trust PayPal's capture resource, not the order, for whether money moved.
    const cap = await api(`capture-get-${key}`, "GET", `/v2/payments/captures/${c.captureId}`);
    const status = cap.body?.status;
    console.log(`  ${key} $${c.amount}: capture ${c.captureId} ${status} ${JSON.stringify(cap.body?.status_details ?? {})}`);
    if (status !== "COMPLETED") {
      notCompleted.push(`${key} (${status})`);
      continue; // no tracking on money that has not settled
    }
    const plan = PLAN[key];
    if (plan.tracking && !c.tracking && c.captureId) {
      const res = await api(`order-track-${key}`, "POST", `/v2/checkout/orders/${c.orderId}/track`, {
        json: {
          capture_id: c.captureId,
          tracking_number: plan.tracking.number,
          carrier: plan.tracking.carrier,
          notify_payer: false,
        },
      });
      if (res.ok) {
        c.tracking = plan.tracking;
        saveState(state);
      } else {
        console.log(`  ${key}: add tracking failed: ${JSON.stringify(res.body?.details ?? res.body)}`);
      }
    }
  }
  if (notCompleted.length) {
    console.log(`\nSTOP: not COMPLETED: ${notCompleted.join(", ")}. Do not open disputes yet.`);
    process.exit(2);
  }
  console.log("\nAll captures COMPLETED.");
} else if (cmd === "status") {
  for (const [key, c] of Object.entries(state.cases) as [CaseKey, CaseState][]) {
    if (!c.orderId) continue;
    const order = await api(`order-get-${key}`, "GET", `/v2/checkout/orders/${c.orderId}`);
    const unit = order.body?.purchase_units?.[0];
    const trackers = unit?.shipping?.trackers ?? [];
    // The capture response omits the payee, so take the merchant id from here.
    if (unit?.payee?.merchant_id && !c.merchantId) {
      c.merchantId = unit.payee.merchant_id;
      saveState(state);
    }
    console.log(
      `  ${key}: order=${order.body?.status} capture=${unit?.payments?.captures?.[0]?.status ?? "-"} trackers=${trackers.length}`,
    );
    if (c.captureId) {
      // Second read path: the older Tracking API, keyed by transaction id.
      const t = await api(`tracker-list-${key}`, "GET", `/v1/shipping/trackers?transaction_id=${c.captureId}`);
      console.log(`      /v1/shipping/trackers: ${t.status} count=${t.body?.trackers?.length ?? 0}`);
    }
  }
} else if (cmd === "captures") {
  // Order status and capture status are separate: an order can be COMPLETED
  // while its capture is still PENDING (money held, not yet with the seller).
  for (const [key, c] of Object.entries(state.cases) as [CaseKey, CaseState][]) {
    if (!c.orderId) continue;
    const order = await api(`order-get-${key}`, "GET", `/v2/checkout/orders/${c.orderId}`);
    const embedded = order.body?.purchase_units?.[0]?.payments?.captures?.[0];
    console.log(`  ${key} $${c.amount}  order ${c.orderId}: ${order.body?.status}`);
    console.log(`      order view of capture: ${embedded?.status} ${JSON.stringify(embedded?.status_details ?? {})}`);
    if (!c.captureId) continue;
    const cap = await api(`capture-get-${key}`, "GET", `/v2/payments/captures/${c.captureId}`);
    const b = cap.body;
    console.log(`      capture ${c.captureId}: ${b?.status} ${JSON.stringify(b?.status_details ?? {})}`);
    console.log(
      `      final_capture=${b?.final_capture} seller_protection=${b?.seller_protection?.status ?? "-"} net=${b?.seller_receivable_breakdown?.net_amount?.value ?? "-"} fee=${b?.seller_receivable_breakdown?.paypal_fee?.value ?? "-"} updated=${b?.update_time}`,
    );
  }
} else {
  console.log("Usage: npm run probe:orders -- create | capture | status | captures");
}
