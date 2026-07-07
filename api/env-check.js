export default function handler(req, res) {
  const mask = (v) => {
    if (!v) return null;
    const s = String(v);
    if (s.length <= 12) return `${s.slice(0, 3)}…${s.slice(-2)}`;
    return `${s.slice(0, 10)}…${s.slice(-6)}`;
  };

  const lemon = {
    hasApiKey: Boolean(process.env.LEMONSQUEEZY_API_KEY),
    apiKeyPreview: mask(process.env.LEMONSQUEEZY_API_KEY),
    storeId: process.env.LEMONSQUEEZY_STORE_ID || null,
    variantId: process.env.LEMONSQUEEZY_VARIANT_ID || null,
    hasWebhookSecret: Boolean(process.env.LEMONSQUEEZY_WEBHOOK_SECRET),
  };

  res.status(200).json({
    ok: true,
    lemon,
    apify: {
      hasApifyToken: Boolean(process.env.APIFY_TOKEN),
      apifyTokenPreview: mask(process.env.APIFY_TOKEN),
      tiktokActor: process.env.APIFY_TIKTOK_ACTOR || null,
      tiktokPostActor: process.env.APIFY_TIKTOK_POST_ACTOR || null,
      instagramPostActor: process.env.APIFY_INSTAGRAM_POST_ACTOR || null,
      hasProxyUrl: Boolean(process.env.PROXY_URL)
    }
  });
}
