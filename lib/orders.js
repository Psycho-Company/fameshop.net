import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import nodeFetch from "node-fetch";

const LOCAL_FILE = path.join(process.cwd(), ".data", "orders.json");

function supabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function supabaseHeaders(extra = {}) {
  return {
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    "content-type": "application/json",
    ...extra,
  };
}

function supabaseUrl(pathname) {
  return `${process.env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${pathname}`;
}

async function supabaseRequest(pathname, init = {}) {
  const r = await nodeFetch(supabaseUrl(pathname), {
    ...init,
    headers: supabaseHeaders(init.headers || {}),
  });
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!r.ok) {
    const msg = data?.message || data?.error_description || data?.hint || text || "supabase_error";
    const err = new Error(msg);
    err.status = r.status;
    err.data = data;
    throw err;
  }
  return data;
}

function ensureLocal() {
  fs.mkdirSync(path.dirname(LOCAL_FILE), { recursive: true });
  if (!fs.existsSync(LOCAL_FILE)) fs.writeFileSync(LOCAL_FILE, "[]", "utf8");
}

function readLocal() {
  ensureLocal();
  try { return JSON.parse(fs.readFileSync(LOCAL_FILE, "utf8")); } catch { return []; }
}

function writeLocal(rows) {
  ensureLocal();
  fs.writeFileSync(LOCAL_FILE, JSON.stringify(rows, null, 2));
}

export function generateOrderCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(6);
  let body = "";
  for (const b of bytes) body += alphabet[b % alphabet.length];
  return `FS-${body.slice(0, 3)}-${body.slice(3, 6)}`;
}

export function cleanOrderCode(input) {
  const code = String(input || "").trim().toUpperCase();
  return /^FS-[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(code) ? code : null;
}

export function nowIso() {
  return new Date().toISOString();
}

export async function createOrder(row) {
  const data = {
    id: row.id || crypto.randomUUID(),
    order_code: row.order_code || generateOrderCode(),
    platform: row.platform,
    username: row.username,
    service: row.service,
    amount: row.amount,
    price_cents: row.price_cents,
    currency: row.currency || "USD",
    quality: row.quality || "usa-only",
    post_url: row.post_url || null,
    post_id: row.post_id || null,
    post_thumb: row.post_thumb || null,
    post_caption: row.post_caption || null,
    profile_name: row.profile_name || null,
    avatar: row.avatar || null,
    followers: row.followers ?? null,
    following: row.following ?? null,
    posts: row.posts ?? null,
    post_likes: row.post_likes ?? null,
    post_views: row.post_views ?? null,
    post_shares: row.post_shares ?? null,
    post_comments: row.post_comments ?? null,
    status: row.status || "pending",
    payment_provider: row.payment_provider || "lemonsqueezy",
    lemonsqueezy_checkout_id: row.lemonsqueezy_checkout_id || null,
    lemonsqueezy_checkout_url: row.lemonsqueezy_checkout_url || null,
    lemonsqueezy_order_id: row.lemonsqueezy_order_id || null,
    customer_email: row.customer_email || null,
    payment_raw: row.payment_raw || null,
    created_at: row.created_at || nowIso(),
    updated_at: row.updated_at || nowIso(),
  };

  if (supabaseConfigured()) {
    const result = await supabaseRequest("orders", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(data),
    });
    return Array.isArray(result) ? result[0] : result;
  }

  const rows = readLocal();
  rows.unshift(data);
  writeLocal(rows);
  return data;
}

export async function getOrderByCode(code) {
  const clean = cleanOrderCode(code);
  if (!clean) return null;

  if (supabaseConfigured()) {
    const result = await supabaseRequest(`orders?order_code=eq.${encodeURIComponent(clean)}&select=*&limit=1`, { method: "GET" });
    return Array.isArray(result) ? result[0] || null : null;
  }

  return readLocal().find(row => row.order_code === clean) || null;
}

export async function listOrders({ limit = 100, status } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 250);

  if (supabaseConfigured()) {
    const filters = [`select=*`, `order=created_at.desc`, `limit=${safeLimit}`];
    if (status) filters.push(`status=eq.${encodeURIComponent(status)}`);
    return await supabaseRequest(`orders?${filters.join("&")}`, { method: "GET" });
  }

  return readLocal()
    .filter(row => !status || row.status === status)
    .slice(0, safeLimit);
}

export async function updateOrderByCode(code, patch) {
  const clean = cleanOrderCode(code);
  if (!clean) return null;
  const data = { ...patch, updated_at: nowIso() };

  if (supabaseConfigured()) {
    const result = await supabaseRequest(`orders?order_code=eq.${encodeURIComponent(clean)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(data),
    });
    return Array.isArray(result) ? result[0] || null : result;
  }

  const rows = readLocal();
  const idx = rows.findIndex(row => row.order_code === clean);
  if (idx === -1) return null;
  rows[idx] = { ...rows[idx], ...data };
  writeLocal(rows);
  return rows[idx];
}

export function usingSupabase() {
  return supabaseConfigured();
}
