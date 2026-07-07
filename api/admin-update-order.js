import { readJsonBody } from "../lib/http.js";
import { updateOrderByCode } from "../lib/orders.js";

const ALLOWED = new Set(["pending", "paid", "processing", "delivered", "refunded", "failed"]);

function authed(req) {
  const key = process.env.ADMIN_KEY;
  if (!key) return true;
  const supplied = req.headers?.["x-admin-key"] || req.query?.key;
  return supplied === key;
}

export default async function handler(req, res) {
  if (req.method && req.method !== "POST") return res.status(405).json({ ok: false, error: "method_not_allowed" });
  if (!authed(req)) return res.status(401).json({ ok: false, error: "unauthorized" });

  try {
    const body = await readJsonBody(req);
    const code = body.order_code || body.order;
    const status = String(body.status || "").toLowerCase();
    if (!ALLOWED.has(status)) return res.status(400).json({ ok: false, error: "invalid_status" });
    const order = await updateOrderByCode(code, { status });
    if (!order) return res.status(404).json({ ok: false, error: "order_not_found" });
    return res.status(200).json({ ok: true, order });
  } catch (e) {
    return res.status(e.status || 500).json({ ok: false, error: "admin_update_failed", message: e.message });
  }
}
