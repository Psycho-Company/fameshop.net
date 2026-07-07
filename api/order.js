import { getOrderByCode, usingSupabase } from "../lib/orders.js";

export default async function handler(req, res) {
  const code = req.query?.code || req.query?.order;
  const order = await getOrderByCode(code);
  if (!order) return res.status(404).json({ ok: false, error: "order_not_found" });
  return res.status(200).json({ ok: true, order, storage: usingSupabase() ? "supabase" : "local-dev" });
}
