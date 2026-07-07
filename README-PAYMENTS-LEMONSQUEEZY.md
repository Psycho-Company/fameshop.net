# Fameshop Lemon Squeezy order system

This build adds a secure backend order flow without requiring real API keys in the code.

## Flow

1. User selects a package on `search.html`.
2. Frontend calls `POST /api/create-order`.
3. Backend validates platform/service/amount from `lib/catalog.js` and creates a pending order.
4. User lands on `checkout.html?order=FS-XXX-XXX`.
5. Checkout page calls `POST /api/create-checkout`.
6. Backend creates a Lemon Squeezy hosted checkout with one variant + `custom_price`.
7. Lemon redirects to `order-success.html?order=FS-XXX-XXX`.
8. Lemon webhook `order_created` marks the order as `paid`.
9. `/admin.html` shows orders and lets you move them through fulfillment statuses.

## Required env values

```env
PUBLIC_SITE_URL=https://fameshop.net

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

LEMONSQUEEZY_API_KEY=
LEMONSQUEEZY_STORE_ID=
LEMONSQUEEZY_VARIANT_ID=
LEMONSQUEEZY_WEBHOOK_SECRET=

ADMIN_KEY=change-this-admin-password
```

Existing lookup env values still work:

```env
PROXY_URL=
APIFY_TOKEN=
APIFY_TIKTOK_ACTOR=clockworks~tiktok-profile-scraper
APIFY_TIKTOK_POST_ACTOR=clockworks~tiktok-profile-scraper
APIFY_INSTAGRAM_POST_ACTOR=apify~instagram-scraper
```

## Supabase setup

Run `supabase-orders.sql` in Supabase SQL editor.

Use the service role key only in Vercel environment variables. Never put it in frontend JS.

## Lemon Squeezy setup

- Create one product: `Fameshop Order`
- Create one variant: `Custom Order`
- Put the variant ID in `LEMONSQUEEZY_VARIANT_ID`
- Put store ID in `LEMONSQUEEZY_STORE_ID`
- Create API key and set `LEMONSQUEEZY_API_KEY`
- Create webhook:
  - URL: `https://fameshop.net/api/lemonsqueezy-webhook`
  - Event: `order_created`
  - Signing secret: same value as `LEMONSQUEEZY_WEBHOOK_SECRET`

## Admin

Open `/admin.html`.

If `ADMIN_KEY` is set, paste it into the admin key input once and save.

## Important security notes

- Frontend no longer passes trusted price into checkout.
- Backend calculates price from `lib/catalog.js`.
- Lemon checkout receives `custom_price` from backend only.
- Webhook verifies `X-Signature` before marking an order as paid.
- Supabase service role key is only used inside API routes.
