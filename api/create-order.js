import { readJsonBody } from "../lib/http.js";
import { getCatalogItem } from "../lib/catalog.js";
import { createOrder, usingSupabase } from "../lib/orders.js";

function cleanUsername(input) {
  let u = String(input || "").trim();
  u = u
    .replace(/^@/, "")
    .replace(/^https?:\/\/(www\.)?(instagram\.com|tiktok\.com)\/@?/i, "")
    .split(/[/?#]/)[0]
    .trim();
  if (!u || !/^[A-Za-z0-9._-]{1,60}$/.test(u)) return null;
  return u;
}

function cleanUrl(input, platform) {
  const raw = String(input || "").trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    if (platform === "instagram" && !["instagram.com", "instagr.am"].includes(host)) return null;
    if (platform === "tiktok" && !["tiktok.com", "vm.tiktok.com", "vt.tiktok.com"].includes(host)) return null;
    return url.toString();
  } catch (_) {
    return null;
  }
}

function toNullableNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export default async function handler(req, res) {
  if (req.method && req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  try {
    const body = await readJsonBody(req);
    const item = getCatalogItem(body);
    if (!item) {
      return res.status(400).json({
        ok: false,
        error: "invalid_package",
        message: "Invalid platform, service, or amount. Package must exist in backend catalog.",
      });
    }

    const username = cleanUsername(body.username);
    if (!username) {
      return res.status(400).json({ ok: false, error: "invalid_username", message: "Enter a valid username." });
    }

    const needsPost = ["likes", "views", "shares"].includes(item.service);
    const postUrl = cleanUrl(body.post_url || body.postUrl, item.platform);
    if (needsPost && !postUrl) {
      return res.status(400).json({ ok: false, error: "post_url_required", message: "This service requires a valid post URL." });
    }

    const order = await createOrder({
      ...item,
      username,
      quality: "usa-only",
      post_url: postUrl,
      post_id: body.post_id || body.postId || null,
      post_thumb: body.post_thumb || body.postThumb || null,
      post_caption: body.post_caption || body.postCaption || null,
      profile_name: body.profile_name || body.profileName || null,
      avatar: body.avatar || null,
      followers: toNullableNumber(body.followers),
      following: toNullableNumber(body.following),
      posts: toNullableNumber(body.posts),
      post_likes: toNullableNumber(body.post_likes || body.postLikes),
      post_views: toNullableNumber(body.post_views || body.postViews),
      post_shares: toNullableNumber(body.post_shares || body.postShares),
      post_comments: toNullableNumber(body.post_comments || body.postComments),
    });

    return res.status(200).json({
      ok: true,
      order,
      order_code: order.order_code,
      storage: usingSupabase() ? "supabase" : "local-dev",
      checkout_page: `/checkout.html?order=${encodeURIComponent(order.order_code)}`,
    });
  } catch (e) {
    return res.status(e.status || 500).json({ ok: false, error: "create_order_failed", message: e.message, data: e.data || null });
  }
}
