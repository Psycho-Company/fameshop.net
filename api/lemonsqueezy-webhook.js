export const config = { api: { bodyParser: false } };

import { readRawBody } from "../lib/http.js";
import { verifyLemonSignature } from "../lib/lemonsqueezy.js";
import { getOrderByCode, updateOrderByCode } from "../lib/orders.js";

function getEmail(payload) {
  return payload?.data?.attributes?.user_email ||
    payload?.data?.attributes?.customer_email ||
    payload?.data?.attributes?.email ||
    null;
}

export default async function handler(req, res) {
  if (req.method && req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  const raw = await readRawBody(req);
  const signature = req.headers?.["x-signature"];
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

  if (!secret) {
    return res.status(500).json({ ok: false, error: "missing_webhook_secret" });
  }

  if (!verifyLemonSignature(raw, signature, secret)) {
    return res.status(401).json({ ok: false, error: "invalid_signature" });
  }

  let payload;
  try { payload = JSON.parse(raw); } catch (_) { return res.status(400).json({ ok: false, error: "invalid_json" }); }

  const event = req.headers?.["x-event-name"] || payload?.meta?.event_name;
  if (event !== "order_created") {
    return res.status(200).json({ ok: true, ignored: true, event });
  }

  const custom = payload?.meta?.custom_data || {};
  const orderCode = custom.order_code || custom.order;
  if (!orderCode) {
    return res.status(200).json({ ok: true, ignored: true, reason: "missing_order_code" });
  }

  const existing = await getOrderByCode(orderCode);
  if (!existing) {
    return res.status(200).json({ ok: true, ignored: true, reason: "order_not_found", order_code: orderCode });
  }

  if (["paid", "processing", "delivered"].includes(existing.status)) {
    return res.status(200).json({ ok: true, duplicate: true, order_code: orderCode });
  }

  const updated = await updateOrderByCode(orderCode, {
    status: "paid",
    lemonsqueezy_order_id: payload?.data?.id || null,
    customer_email: getEmail(payload),
    payment_raw: payload,
  });

  return res.status(200).json({ ok: true, order_code: orderCode, status: updated?.status || "paid" });
}
