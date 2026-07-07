// /api/profile?platform=instagram|tiktok&username=xxx
// Instagram: proxy + HTML meta.
// TikTok: Apify actor run + dataset polling + robust normalization.

import nodeFetch from "node-fetch";
import { HttpsProxyAgent } from "https-proxy-agent";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const cache = new Map();
const TTL = 10 * 60 * 1000;

function isPlaceholderProxy(proxy) {
  return !proxy || /username:password@host:port/i.test(proxy) || proxy.trim() === "";
}

function limitedProfile(platform, username, reason = "local_payment_test") {
  return {
    platform,
    username,
    name: username,
    avatar: null,
    verified: null,
    private: null,
    bio: "",
    stats: {},
    limited: true,
    source: reason
  };
}

function getCache(k) {
  const v = cache.get(k);
  if (v && Date.now() - v.t < TTL) return v.d;
  cache.delete(k);
  return null;
}

function setCache(k, d) {
  cache.set(k, { t: Date.now(), d });
}

function getProxyAgent() {
  const proxy = process.env.PROXY_URL;
  if (isPlaceholderProxy(proxy)) return null;
  try {
    new URL(proxy);
    return new HttpsProxyAgent(proxy);
  } catch (_) {
    return null;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function doFetch(url, opts = {}, config = {}) {
  const timeoutMs = config.timeoutMs || 8500;
  const retries = config.retries ?? 1;

  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const headers = {
      "user-agent": UA,
      "accept-language": "en-US,en;q=0.9",
      ...(opts.headers || {}),
    };

    const init = {
      ...opts,
      headers,
      redirect: "follow",
      compress: true,
      signal: controller.signal,
    };

    const agent = getProxyAgent();
    if (agent) init.agent = agent;

    try {
      const response = await nodeFetch(url, init);
      clearTimeout(timer);
      return response;
    } catch (e) {
      clearTimeout(timer);
      lastError = e;
      if (attempt < retries) {
        await sleep(350);
        continue;
      }
    }
  }

  if (lastError?.name === "AbortError") {
    throw httpErr(504, "lookup_timeout", "Profile lookup took too long. Please try again.");
  }

  throw httpErr(502, "proxy_or_fetch_failed", lastError?.message || "fetch failed");
}

function cleanUsername(input) {
  let u = String(input || "").trim();

  u = u
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^https?:\/\/(www\.)?tiktok\.com\/@?/i, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0]
    .trim();

  if (!u || !/^[A-Za-z0-9._-]{1,60}$/.test(u)) return null;
  return u;
}

async function instagram(username) {
  const htmlUrl = `https://www.instagram.com/${encodeURIComponent(username)}/`;

  const r = await doFetch(htmlUrl, {
    headers: {
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "referer": "https://www.instagram.com/",
      "sec-fetch-site": "none",
      "sec-fetch-mode": "navigate",
      "sec-fetch-dest": "document",
      "upgrade-insecure-requests": "1",
      "cache-control": "no-cache",
      "pragma": "no-cache"
    },
  }, { timeoutMs: 7500, retries: 1 });

  if (r.status === 404) throw httpErr(404, "not_found", "Instagram account not found.");
  if (r.status === 429 || r.status === 403) throw httpErr(502, "upstream_blocked", `Instagram blocked this request with HTTP ${r.status}.`);
  if (r.status === 407) throw httpErr(502, "proxy_auth_error", "Proxy returned HTTP 407. Check PROXY_URL auth.");
  if (!r.ok) throw httpErr(502, "upstream_error", `Instagram returned HTTP ${r.status}.`);

  const html = await r.text();

  const ogTitle = decodeHtml(
    html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/i)?.[1] ||
    html.match(/<meta\s+content="([^"]*)"\s+property="og:title"/i)?.[1] ||
    ""
  );

  const desc = decodeHtml(
    html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/i)?.[1] ||
    html.match(/<meta\s+content="([^"]*)"\s+property="og:description"/i)?.[1] ||
    html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1] ||
    html.match(/<meta\s+content="([^"]*)"\s+name="description"/i)?.[1] ||
    ""
  );

  const avatar = decodeHtml(
    html.match(/<meta\s+property="og:image"\s+content="([^"]*)"/i)?.[1] ||
    html.match(/<meta\s+content="([^"]*)"\s+property="og:image"/i)?.[1] ||
    ""
  ) || null;

  const statsMatch = desc.match(/([\d.,]+)\s*([KMB])?\s*Followers?,\s*([\d.,]+)\s*([KMB])?\s*Following,\s*([\d.,]+)\s*([KMB])?\s*Posts?/i);

  let name = username;
  let normalizedUsername = username;
  const titleMatch = ogTitle.match(/^(.+?)\s+\(@([^)]+)\)/);
  if (titleMatch) {
    name = titleMatch[1].trim() || username;
    normalizedUsername = titleMatch[2].trim() || username;
  }

  const loginWall = /loginAndSignupPage|Log in to Instagram|Login • Instagram/i.test(html);
  if (!avatar && !statsMatch && loginWall) {
    throw httpErr(502, "login_wall", "Instagram returned a login wall instead of public profile data.");
  }

  if (!avatar && !statsMatch && !ogTitle) {
    throw httpErr(404, "not_found", "Instagram account not found or public profile metadata was not readable.");
  }

  return {
    platform: "instagram",
    username: normalizedUsername,
    name,
    avatar,
    verified: null,
    private: null,
    bio: "",
    stats: {
      followers: statsMatch ? parseAbbrev(statsMatch[1] + (statsMatch[2] || "")) : null,
      following: statsMatch ? parseAbbrev(statsMatch[3] + (statsMatch[4] || "")) : null,
      posts: statsMatch ? parseAbbrev(statsMatch[5] + (statsMatch[6] || "")) : null,
    },
    source: "instagram_html_meta"
  };
}

function pick(obj, paths) {
  for (const path of paths) {
    const val = path.split(".").reduce((acc, key) => acc && acc[key], obj);
    if (val !== undefined && val !== null && val !== "") return val;
  }
  return null;
}

function deepFind(obj, keys) {
  const wanted = new Set(keys.map(k => k.toLowerCase()));
  const seen = new Set();
  function walk(v, depth = 0) {
    if (!v || typeof v !== "object" || depth > 7 || seen.has(v)) return null;
    seen.add(v);
    if (Array.isArray(v)) {
      for (const item of v) {
        const res = walk(item, depth + 1);
        if (res !== null && res !== undefined && res !== "") return res;
      }
      return null;
    }
    for (const [k, val] of Object.entries(v)) {
      if (wanted.has(k.toLowerCase()) && val !== null && val !== undefined && val !== "") return val;
    }
    for (const val of Object.values(v)) {
      const res = walk(val, depth + 1);
      if (res !== null && res !== undefined && res !== "") return res;
    }
    return null;
  }
  return walk(obj);
}

function toNumber(v) {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return v;
  return parseAbbrev(String(v));
}

function firstUrl(v) {
  if (!v) return null;
  if (typeof v === "string" && /^https?:\/\//i.test(v)) return v;
  if (Array.isArray(v)) {
    for (const item of v) {
      const found = firstUrl(item);
      if (found) return found;
    }
  }
  if (typeof v === "object") {
    for (const key of ["url", "uri", "src", "avatarLarger", "avatarMedium", "avatarThumb", "avatar", "avatarUrl", "profilePicUrl", "image", "thumbnailUrl", "cover"]) {
      const found = firstUrl(v[key]);
      if (found) return found;
    }
    for (const val of Object.values(v)) {
      const found = firstUrl(val);
      if (found) return found;
    }
  }
  return null;
}

function normalizeTikTokItem(item, fallbackUsername, source) {
  const user =
    item?.authorMeta ||
    item?.author ||
    item?.user ||
    item?.userInfo?.user ||
    item?.profile ||
    item?.channel ||
    item?.userData ||
    item?.data?.user ||
    item ||
    {};

  const stats =
    item?.stats ||
    item?.userInfo?.stats ||
    item?.authorStats ||
    item?.authorMeta ||
    item?.profileStats ||
    item?.statistics ||
    item?.data?.stats ||
    item ||
    {};

  const username =
    pick(user, ["uniqueId", "username", "handle", "name"]) ||
    pick(item, ["uniqueId", "username", "handle", "authorUniqueId"]) ||
    deepFind(item, ["uniqueId", "username", "authorUniqueId", "handle"]) ||
    fallbackUsername;

  const name =
    pick(user, ["nickname", "nickName", "displayName", "fullName", "name", "authorName"]) ||
    pick(item, ["nickname", "displayName", "fullName", "name", "authorName", "author"]) ||
    deepFind(item, ["nickname", "displayName", "fullName", "authorName"]) ||
    username;

  const avatar =
    firstUrl(pick(user, ["avatarLarger", "avatarMedium", "avatarThumb", "avatar", "avatarUrl", "profilePicUrl", "profileImage", "image"])) ||
    firstUrl(pick(item, ["avatarLarger", "avatarMedium", "avatarThumb", "avatar", "avatarUrl", "profilePicUrl", "profileImage", "image", "thumbnailUrl", "cover"])) ||
    firstUrl(deepFind(item, ["avatarLarger", "avatarMedium", "avatarThumb", "avatar", "avatarUrl", "profilePicUrl", "profileImage"]));

  const followers = toNumber(
    pick(stats, ["followerCount", "followers", "fans", "fansCount"]) ??
    pick(user, ["followerCount", "followers", "fans", "fansCount"]) ??
    pick(item, ["followerCount", "followers", "fans", "fansCount"]) ??
    deepFind(item, ["followerCount", "followers", "fans", "fansCount"])
  );

  const following = toNumber(
    pick(stats, ["followingCount", "following"]) ??
    pick(user, ["followingCount", "following"]) ??
    pick(item, ["followingCount", "following"]) ??
    deepFind(item, ["followingCount", "following"])
  );

  const likes = toNumber(
    pick(stats, ["heartCount", "heart", "likes", "diggCount"]) ??
    pick(user, ["heartCount", "heart", "likes", "diggCount"]) ??
    pick(item, ["heartCount", "heart", "likes", "diggCount"]) ??
    deepFind(item, ["heartCount", "heart", "likes", "diggCount"])
  );

  const videos = toNumber(
    pick(stats, ["videoCount", "videos", "awemeCount"]) ??
    pick(user, ["videoCount", "videos", "awemeCount"]) ??
    pick(item, ["videoCount", "videos", "awemeCount"]) ??
    deepFind(item, ["videoCount", "videos", "awemeCount"])
  );

  return {
    platform: "tiktok",
    username: String(username || fallbackUsername).replace(/^@/, ""),
    name: name || username || fallbackUsername,
    avatar: avatar || null,
    verified: Boolean(pick(user, ["verified", "isVerified"]) || pick(item, ["verified", "isVerified"]) || false),
    private: pick(user, ["privateAccount", "isPrivate"]) ?? null,
    bio: pick(user, ["signature", "bio", "description"]) || pick(item, ["signature", "bio", "description", "text"]) || deepFind(item, ["signature", "bio", "description"]) || "",
    stats: { followers, following, likes, videos },
    source
  };
}

async function runApifyAndGetItems(actor, input, timeoutSec = 75) {
  const token = process.env.APIFY_TOKEN;
  if (!token) return null;

  // Start actor run
  const startUrl = `https://api.apify.com/v2/acts/${actor}/runs?token=${encodeURIComponent(token)}&memory=2048&timeout=${timeoutSec}`;
  const start = await nodeFetch(startUrl, {
    method: "POST",
    headers: { "content-type": "application/json", "accept": "application/json" },
    body: JSON.stringify(input),
  });

  if (!start.ok) {
    const text = await start.text().catch(() => "");
    throw httpErr(502, "apify_start_error", `TikTok data provider could not start. HTTP ${start.status}${text ? ": " + text.slice(0, 180) : ""}`);
  }

  const runData = await start.json();
  const runId = runData?.data?.id;
  if (!runId) throw httpErr(502, "apify_start_error", "TikTok data provider did not return a run ID.");

  // Poll until run finishes or timeout
  const startedAt = Date.now();
  let run;
  while (Date.now() - startedAt < timeoutSec * 1000) {
    await sleep(1800);
    const rr = await nodeFetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${encodeURIComponent(token)}`, {
      headers: { "accept": "application/json" },
    });
    if (!rr.ok) continue;
    run = (await rr.json())?.data;
    if (["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"].includes(run?.status)) break;
  }

  if (run?.status !== "SUCCEEDED") {
    throw httpErr(504, "apify_timeout", `TikTok data provider did not finish in time${run?.status ? ` (${run.status})` : ""}.`);
  }

  const datasetId = run?.defaultDatasetId;
  if (!datasetId) throw httpErr(502, "apify_dataset_missing", "TikTok data provider did not return a dataset.");

  const itemsRes = await nodeFetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${encodeURIComponent(token)}&clean=true&limit=10`, {
    headers: { "accept": "application/json" },
  });

  if (!itemsRes.ok) {
    throw httpErr(502, "apify_dataset_error", `Could not read TikTok dataset. HTTP ${itemsRes.status}.`);
  }

  return await itemsRes.json().catch(() => []);
}

async function tiktokViaApify(username) {
  if (!process.env.APIFY_TOKEN) return null;

  const actor = process.env.APIFY_TIKTOK_ACTOR || "clockworks~tiktok-profile-scraper";

  // Clockworks profile scraper: request one profile, no follower/following lists, one latest video only.
  const input = {
    profiles: [username],
    profileScrapeSections: ["videos"],
    profileSorting: "latest",
    resultsPerPage: 1,
    maxFollowersPerProfile: 0,
    maxFollowingPerProfile: 0,
    excludePinnedPosts: true,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
    shouldDownloadAvatars: true,
    commentsPerPost: 0,
    topLevelCommentsPerPost: 0,
    maxRepliesPerComment: 0
  };

  const items = await runApifyAndGetItems(actor, input, 75);
  if (!Array.isArray(items) || !items.length) {
    throw httpErr(404, "not_found", "TikTok account not found by data provider.");
  }

  // Prefer an item that has stats/avatar; otherwise use first.
  const item =
    items.find(x => deepFind(x, ["followerCount", "followers", "fans", "avatar", "avatarUrl", "avatarLarger"])) ||
    items[0];

  const normalized = normalizeTikTokItem(item, username, "apify_tiktok_profile_polling");

  if (!normalized.avatar && !normalized.stats.followers) {
    // Return limited info only if name/username exists, but mark limited so UI does not pretend it's complete.
    normalized.limited = true;
  }

  return normalized;
}

async function tiktokFallbackHtml(username) {
  // Fallback only; usually lacks reliable stats.
  const profileUrl = `https://www.tiktok.com/@${encodeURIComponent(username)}`;
  const r = await doFetch(profileUrl, {
    headers: {
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "referer": "https://www.tiktok.com/",
      "cache-control": "no-cache",
      "pragma": "no-cache"
    },
  }, { timeoutMs: 6000, retries: 0 });

  if (!r.ok) throw httpErr(404, "not_found", "TikTok account not found or not publicly readable.");
  const html = await r.text();

  const title = decodeHtml(
    html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/i)?.[1] ||
    html.match(/<meta\s+name="twitter:title"\s+content="([^"]*)"/i)?.[1] ||
    ""
  );
  const avatar = decodeHtml(
    html.match(/<meta\s+property="og:image"\s+content="([^"]*)"/i)?.[1] ||
    html.match(/<meta\s+name="twitter:image"\s+content="([^"]*)"/i)?.[1] ||
    ""
  ) || null;

  let name = title.replace(/\s*\|\s*TikTok.*$/i, "").trim() || username;
  let normalizedUsername = username;
  const m = name.match(/(.+?)\s*\(@([^)]+)\)/);
  if (m) {
    name = m[1].trim();
    normalizedUsername = m[2].trim();
  }

  return {
    platform: "tiktok",
    username: normalizedUsername,
    name,
    avatar,
    verified: null,
    private: null,
    bio: "",
    stats: {},
    limited: true,
    source: "tiktok_html_fallback"
  };
}

async function tiktok(username) {
  if (process.env.APIFY_TOKEN) {
    return await tiktokViaApify(username);
  }
  return await tiktokFallbackHtml(username);
}

function parseAbbrev(s) {
  if (s == null) return null;
  const m = String(s).replace(/,/g, "").match(/([\d.]+)\s*([KMB])?/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  const mult = { K: 1e3, M: 1e6, B: 1e9 }[(m[2] || "").toUpperCase()] || 1;
  return Math.round(n * mult);
}

function decodeHtml(s) {
  return String(s || "")
    .replace(/&#x([0-9a-fA-F]+);?/g, (_, hex) => {
      try { return String.fromCodePoint(parseInt(hex, 16)); } catch { return _; }
    })
    .replace(/&#([0-9]+);?/g, (_, num) => {
      try { return String.fromCodePoint(parseInt(num, 10)); } catch { return _; }
    })
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function httpErr(status, code, message) {
  const e = new Error(message || code);
  e.status = status;
  e.code = code;
  e.message = message || code;
  return e;
}

export default async function handler(req, res) {
  res.setHeader("access-control-allow-origin", "*");

  const platform = String(req.query?.platform || "").toLowerCase();
  const username = cleanUsername(req.query?.username);

  if (!["instagram", "tiktok"].includes(platform)) {
    return res.status(400).json({ error: "invalid_platform", message: "platform must be instagram or tiktok" });
  }

  if (!username) {
    return res.status(400).json({ error: "invalid_username", message: "username is required" });
  }

  const key = `${platform}:${username.toLowerCase()}`;
  const hit = getCache(key);
  if (hit) {
    res.setHeader("cache-control", "public, s-maxage=600, stale-while-revalidate=1200");
    return res.status(200).json(hit);
  }

  try {
    const fn = platform === "instagram" ? instagram : tiktok;
    const data = await fn(username);

    if (data.avatar) {
      data.avatarProxied = `/api/img?url=${encodeURIComponent(data.avatar)}`;
    }

    setCache(key, data);
    res.setHeader("cache-control", "public, s-maxage=600, stale-while-revalidate=1200");
    return res.status(200).json(data);
  } catch (e) {
    // Payment-test mode: if live profile lookup fails because there is no working proxy/provider,
    // do not block checkout. Accept the username and let the user pick a package.
    const data = limitedProfile(platform, username, e.code || "profile_lookup_skipped");
    setCache(key, data);
    res.setHeader("cache-control", "no-store");
    return res.status(200).json(data);
  }
}
