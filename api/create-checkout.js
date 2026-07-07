import { readJsonBody } from "../lib/http.js";
import { getOrderByCode, updateOrderByCode } from "../lib/orders.js";
import { createLemonCheckout, lemonMissingKeys } from "../lib/lemonsqueezy.js";

export default async function handler(req, res) {
  if (req.method && req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  try {
    const body = await readJsonBody(req);
    const code = body.order_code || body.order || req.query?.order || req.query?.code;
    const order = await getOrderByCode(code);
    if (!order) return res.status(404).json({ ok: false, error: "order_not_found" });

    if (order.status === "paid" || order.status === "processing" || order.status === "delivered") {
      return res.status(409).json({ ok: false, error: "order_already_paid", message: "This order has already been paid." });
    }

    if (order.lemonsqueezy_checkout_url) {
      return res.status(200).json({ ok: true, checkout_url: order.lemonsqueezy_checkout_url, order });
    }

    const checkout = await createLemonCheckout(order, req);
    const updated = await updateOrderByCode(order.order_code, {
      lemonsqueezy_checkout_id: checkout.checkout_id,
      lemonsqueezy_checkout_url: checkout.checkout_url,
    });

    return res.status(200).json({ ok: true, checkout_url: checkout.checkout_url, checkout_id: checkout.checkout_id, order: updated });
  } catch (e) {
    return res.status(e.status || 500).json({
      ok: false,
      error: e.status === 503 ? "payment_config_missing" : "checkout_failed",
      message: e.message,
      missing: e.missing || lemonMissingKeys(),
      data: e.data || null,
    });
  }
}
