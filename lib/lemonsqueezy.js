import crypto from "node:crypto";
import nodeFetch from "node-fetch";
import { getOrigin } from "./http.js";
import { formatMoney } from "./catalog.js";

let lemonCatalogCache = null;
let lemonCatalogCacheAt = 0;
const LEMON_CACHE_MS = 5 * 60 * 1000;

export function lemonConfigured() {
  return Boolean(
    process.env.LEMONSQUEEZY_API_KEY &&
    process.env.LEMONSQUEEZY_STORE_ID &&
    process.env.LEMONSQUEEZY_VARIANT_ID
  );
}

export function lemonMissingKeys() {
  return [
    "LEMONSQUEEZY_API_KEY",
    "LEMONSQUEEZY_STORE_ID",
    "LEMONSQUEEZY_VARIANT_ID",
  ].filter(key => !process.env[key]);
}

function lemonHeaders() {
  return {
    accept: "application/vnd.api+json",
    "content-type": "application/vnd.api+json",
    authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
  };
}

function serviceAliases(service) {
  const s = String(service || "").toLowerCase();
  if (s === "followers") return ["followers", "follower", "growth"];
  if (s === "likes") return ["likes", "like"];
  if (s === "views") return ["views", "view"];
  if (s === "shares") return ["shares", "share"];
  return [s];
}

function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/[,._-]+/g, " ").replace(/\s+/g, " ").trim();
}

function amountMatchesName(name, amount) {
  const normalized = normalizeText(name).replace(/,/g, "");
  const target = String(Number(amount));
  const numericTokens = normalized.match(/\d+/g) || [];
  return numericTokens.some(token => String(Number(token)) === target);
}

async function lemonGet(url) {
  const response = await nodeFetch(url, { method: "GET", headers: lemonHeaders() });
  const text = await response.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  if (!response.ok) {
    const message = json?.errors?.[0]?.detail || json?.message || text || "lemonsqueezy_api_failed";
    const err = new Error(message);
    err.status = response.status;
    err.data = json;
    throw err;
  }
  return json;
}

async function loadLemonCatalog() {
  const now = Date.now();
  if (lemonCatalogCache && now - lemonCatalogCacheAt < LEMON_CACHE_MS) return lemonCatalogCache;

  const storeId = String(process.env.LEMONSQUEEZY_STORE_ID || "").trim();
  const productsUrl = `https://api.lemonsqueezy.com/v1/products?filter[store_id]=${encodeURIComponent(storeId)}&page[size]=100`;
  const productsJson = await lemonGet(productsUrl);
  const products = Array.isArray(productsJson?.data) ? productsJson.data : [];

  const rows = [];
  for (const product of products) {
    const productId = String(product?.id || "");
    if (!productId) continue;
    const productName = product?.attributes?.name || "";
    const productStatus = product?.attributes?.status || "";
    const variantsUrl = `https://api.lemonsqueezy.com/v1/variants?filter[product_id]=${encodeURIComponent(productId)}&page[size]=100`;
    const variantsJson = await lemonGet(variantsUrl);
    const variants = Array.isArray(variantsJson?.data) ? variantsJson.data : [];
    for (const variant of variants) {
      const variantId = String(variant?.id || "");
      if (!variantId) continue;
      rows.push({
        productId,
        productName,
        productStatus,
        variantId,
        variantName: variant?.attributes?.name || "",
        variantStatus: variant?.attributes?.status || "",
        price: variant?.attributes?.price ?? null,
      });
    }
  }

  lemonCatalogCache = rows;
  lemonCatalogCacheAt = now;
  return rows;
}

function parseVariantMapEnv() {
  const raw = process.env.LEMONSQUEEZY_VARIANT_MAP || process.env.LEMONSQUEEZY_VARIANT_IDS_JSON;
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

async function resolveVariantForOrder(order) {
  // Optional explicit mapping for later, if you ever want to hard-code exact Lemon variant IDs:
  // LEMONSQUEEZY_VARIANT_MAP={"instagram":{"followers":{"500":"1881771"}}}
  const map = parseVariantMapEnv();
  const mapped = map?.[order.platform]?.[order.service]?.[String(order.amount)] || map?.[order.service]?.[String(order.amount)];
  if (mapped) return { variantId: String(mapped), source: "env_map" };

  try {
    const catalog = await loadLemonCatalog();
    const aliases = serviceAliases(order.service);
    const amount = Number(order.amount);

    const exact = catalog.find(row => {
      const haystack = normalizeText(`${row.productName} ${row.variantName}`);
      const serviceOk = aliases.some(alias => haystack.includes(alias));
      const amountOk = amountMatchesName(row.variantName, amount) || amountMatchesName(`${row.productName} ${row.variantName}`, amount);
      const notDeleted = !["deleted", "archived"].includes(String(row.variantStatus || "").toLowerCase());
      return serviceOk && amountOk && notDeleted;
    });

    if (exact) return { variantId: String(exact.variantId), source: "lemon_catalog", matched: exact };
  } catch (error) {
    // Fallback below keeps checkout working even if Lemon catalog listing fails.
    console.warn("[lemonsqueezy] Could not auto-resolve variant:", error?.message || error);
  }

  return { variantId: String(process.env.LEMONSQUEEZY_VARIANT_ID), source: "fallback_env" };
}

export async function createLemonCheckout(order, req) {
  if (!lemonConfigured()) {
    const err = new Error(`missing_payment_config: ${lemonMissingKeys().join(", ")}`);
    err.status = 503;
    err.missing = lemonMissingKeys();
    throw err;
  }

  const origin = getOrigin(req);
  const serviceLabel = order.service.charAt(0).toUpperCase() + order.service.slice(1);
  const platformLabel = order.platform.charAt(0).toUpperCase() + order.platform.slice(1);
  const amountLabel = Number(order.amount).toLocaleString("en-US");
  const descriptionParts = [
    `${platformLabel} ${serviceLabel}`,
    `${amountLabel} package`,
    order.username ? `@${order.username}` : null,
    order.post_url ? "post-level order" : null,
  ].filter(Boolean);

  const resolvedVariant = await resolveVariantForOrder(order);
  const variantId = String(resolvedVariant.variantId);

  const payload = {
    data: {
      type: "checkouts",
      attributes: {
        custom_price: Number(order.price_cents),
        product_options: {
          name: `${platformLabel} ${amountLabel} ${serviceLabel}`,
          description: descriptionParts.join(" · "),
          redirect_url: `${origin}/order-success.html?order=${encodeURIComponent(order.order_code)}`,
          receipt_button_text: "View order",
          receipt_link_url: `${origin}/order-success.html?order=${encodeURIComponent(order.order_code)}`,
          enabled_variants: [variantId],
        },
        checkout_options: {
          embed: false,
          media: false,
          logo: true,
          discount: false,
        },
        checkout_data: {
          custom: {
            order_id: String(order.id || ""),
            order_code: String(order.order_code || ""),
            platform: String(order.platform || ""),
            service: String(order.service || ""),
            amount: String(order.amount || ""),
            selected_variant_id: String(variantId || ""),
            variant_source: String(resolvedVariant.source || ""),
          },
        },
        expires_at: null,
        preview: false,
      },
      relationships: {
        store: {
          data: {
            type: "stores",
            id: String(process.env.LEMONSQUEEZY_STORE_ID),
          },
        },
        variant: {
          data: {
            type: "variants",
            id: variantId,
          },
        },
      },
    },
  };

  const response = await nodeFetch("https://api.lemonsqueezy.com/v1/checkouts", {
    method: "POST",
    headers: lemonHeaders(),
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }

  if (!response.ok) {
    const message = json?.errors?.[0]?.detail || json?.message || text || "lemonsqueezy_checkout_failed";
    const err = new Error(message);
    err.status = response.status;
    err.data = json;
    throw err;
  }

  return {
    checkout_id: json?.data?.id || null,
    checkout_url: json?.data?.attributes?.url || null,
    raw: json,
    selected_variant_id: variantId,
    variant_source: resolvedVariant.source,
    label: `${formatMoney(order.price_cents, order.currency || "USD")} · ${descriptionParts.join(" · ")}`,
  };
}

export function verifyLemonSignature(rawBody, signature, secret) {
  if (!signature || !secret) return false;
  const digest = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(digest, "hex");
  const b = Buffer.from(String(signature), "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
