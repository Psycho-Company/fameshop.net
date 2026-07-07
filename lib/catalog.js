const FOLLOWERS_TABLE = [
  { amount: 100, price_cents: 399 },
  { amount: 250, price_cents: 699 },
  { amount: 500, price_cents: 1099 },
  { amount: 1000, price_cents: 1799 },
  { amount: 2500, price_cents: 3499 },
  { amount: 5000, price_cents: 5999 },
  { amount: 10000, price_cents: 9999 },
  { amount: 20000, price_cents: 18999 },
  { amount: 50000, price_cents: 44999 },
];

const SHARES_TABLE = [
  { amount: 100, price_cents: 199 },
  { amount: 250, price_cents: 299 },
  { amount: 500, price_cents: 499 },
  { amount: 1000, price_cents: 849 },
  { amount: 2500, price_cents: 1899 },
  { amount: 5000, price_cents: 3499 },
  { amount: 10000, price_cents: 6299 },
  { amount: 25000, price_cents: 14299 },
  { amount: 50000, price_cents: 25999 },
  { amount: 100000, price_cents: 47999 },
];

const LIKES_TABLE = [
  { amount: 100, price_cents: 249 },
  { amount: 250, price_cents: 399 },
  { amount: 500, price_cents: 589 },
  { amount: 1000, price_cents: 789 },
  { amount: 2500, price_cents: 1299 },
  { amount: 5000, price_cents: 2399 },
  { amount: 10000, price_cents: 4599 },
  { amount: 20000, price_cents: 9999 },
  { amount: 40000, price_cents: 17999 },
];

const VIEWS_TABLE = [
  { amount: 300, price_cents: 69 },
  { amount: 500, price_cents: 79 },
  { amount: 1000, price_cents: 139 },
  { amount: 2500, price_cents: 299 },
  { amount: 5000, price_cents: 389 },
  { amount: 10000, price_cents: 679 },
  { amount: 25000, price_cents: 1399 },
  { amount: 50000, price_cents: 2399 },
  { amount: 100000, price_cents: 4399 },
  { amount: 250000, price_cents: 9999 },
  { amount: 500000, price_cents: 18999 },
  { amount: 1000000, price_cents: 34999 },
];

const BASE_SERVICES = {
  followers: FOLLOWERS_TABLE,
  shares: SHARES_TABLE,
  likes: LIKES_TABLE,
  views: VIEWS_TABLE,
};

export const CATALOG = {
  instagram: BASE_SERVICES,
  tiktok: BASE_SERVICES,
};

export function cleanPlatform(input) {
  const platform = String(input || "").trim().toLowerCase();
  return ["instagram", "tiktok"].includes(platform) ? platform : null;
}

export function cleanService(input) {
  const service = String(input || "").trim().toLowerCase();
  return ["followers", "shares", "likes", "views"].includes(service) ? service : null;
}

export function cleanAmount(input) {
  const amount = Number(String(input || "").replace(/,/g, ""));
  return Number.isInteger(amount) && amount > 0 ? amount : null;
}

export function getCatalogItem({ platform, service, amount }) {
  const p = cleanPlatform(platform);
  const s = cleanService(service);
  const a = cleanAmount(amount);
  if (!p || !s || !a) return null;
  const item = CATALOG[p]?.[s]?.find(row => row.amount === a);
  if (!item) return null;
  return {
    platform: p,
    service: s,
    amount: item.amount,
    price_cents: item.price_cents,
    currency: "USD",
  };
}

export function formatMoney(cents, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format((Number(cents) || 0) / 100);
}

export function publicCatalog() {
  const out = {};
  for (const [platform, services] of Object.entries(CATALOG)) {
    out[platform] = {};
    for (const [service, rows] of Object.entries(services)) {
      out[platform][service] = rows.map(row => ({
        amount: row.amount,
        price_cents: row.price_cents,
        price: row.price_cents / 100,
      }));
    }
  }
  return out;
}
