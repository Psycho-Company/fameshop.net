import { publicCatalog } from "../lib/catalog.js";

export default function handler(req, res) {
  return res.status(200).json({ ok: true, catalog: publicCatalog() });
}
