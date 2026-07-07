import { listOrders, usingSupabase } from "../lib/orders.js";

function authed(req) {
  const key = process.env.ADMIN_KEY;
  if (!key) return true;
  const supplied = req.headers?.["x-admin-key"] || req.query?.key;
  return supplied === key;
}

export default async function handler(req, res) {
  if (!authed(req)) return res.status(401).json({ ok: false, error: "unauthorized" });
  try {
    const orders = await listOrders({ limit: req.query?.limit || 100, status: req.query?.status || null });
    return res.status(200).json({ ok: true, orders, storage: usingSupabase() ? "supabase" : "local-dev" });
  } catch (e) {
    return res.status(e.status || 500).json({ ok: false, error: "admin_orders_failed", message: e.message });
  }
}
