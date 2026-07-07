// /api/posts?platform=instagram|tiktok&username=xxx
// Lazy post lookup for Likes / Views tabs only.
// Uses Apify only when user opens Likes/Views. Results are cached 30 minutes.

import nodeFetch from "node-fetch";

const cache = new Map();
const TTL = 30 * 60 * 1000;

function getCache(k) {
  const v = cache.get(k);
  if (v && Date.now() - v.t < TTL) return v.d;
  cache.delete(k);
  return null;
}

function setCache(k, d) {
  cache.set(k, { t: Date.now(), d });
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

function pick(obj, paths) {
  for (const path of paths) {
    const val = path.split(".").reduce((acc, key) => acc && acc[key], obj);
    if (val !== undefined && val !== null && val !== "") return val;
  }
  return null;
}

function toNumber(v) {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return v;
  const m = String(v).replace(/,/g, "").match(/([\d.]+)\s*([KMB])?/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  const mult = { K: 1e3, M: 1e6, B: 1e9 }[(m[2] || "").toUpperCase()] || 1;
  return Math.round(n * mult);
}

function firstArrayImage(v) {
  if (Array.isArray(v)) {
    const found = v.find(x => typeof x === "string" && /^https?:\/\//.test(x));
    return found || null;
  }
  return v || null;
}

function normalizePost(item, platform, username) {
  const id =
    pick(item, ["id", "aweme_id", "awemeId", "shortCode", "code", "pk", "mediaId"]) ||
    pick(item, ["video.id", "post.id"]) ||
    null;

  const shortCode = pick(item, ["shortCode", "code"]);
  const url =
    pick(item, ["url", "webVideoUrl", "videoUrl", "postUrl", "link", "permalink", "inputUrl"]) ||
    (platform === "tiktok" && id ? `https://www.tiktok.com/@${username}/video/${id}` : null) ||
    (platform === "instagram" && shortCode ? `https://www.instagram.com/p/${shortCode}/` : null);

  const thumb = firstArrayImage(
    pick(item, [
      "displayUrl",
      "display_url",
      "thumbnailUrl",
      "thumbnail_url",
      "cover",
      "covers.default",
      "video.cover",
      "video.dynamicCover",
      "image",
      "imageUrl",
      "images",
      "media.url",
      "videoMeta.coverUrl",
      "videoMeta.downloadAddr"
    ])
  );

  const caption =
    pick(item, [
      "caption",
      "text",
      "desc",
      "description",
      "title",
      "alt",
      "edge_media_to_caption.edges.0.node.text"
    ]) || "";

  const type = String(pick(item, ["type", "mediaType", "__typename"]) || "").toLowerCase();

  const isVideo =
    Boolean(pick(item, ["isVideo", "is_video", "videoUrl", "video.url", "videoMeta", "video"])) ||
    type.includes("video") ||
    type.includes("reel");

  const likes = toNumber(pick(item, ["likesCount", "likes", "likeCount", "diggCount", "statistics.diggCount"]));
  const views = toNumber(pick(item, ["playCount", "views", "viewCount", "videoViewCount", "videoPlayCount", "statistics.playCount"]));
  const comments = toNumber(pick(item, ["commentsCount", "comments", "commentCount", "statistics.commentCount"]));

  if (!url && !id) return null;

  return {
    id: String(id || url),
    platform,
    username,
    url,
    thumbnail: thumb,
    caption: String(caption || "").slice(0, 140),
    isVideo,
    likes,
    views,
    comments,
    takenAt: pick(item, ["timestamp", "takenAt", "taken_at_timestamp", "createTime", "createTimeISO", "date"]) || null
  };
}

function httpErr(status, code, message) {
  const e = new Error(message || code);
  e.status = status;
  e.code = code;
  e.message = message || code;
  return e;
}

async function runApifyActor(actor, input, timeoutSec = 75) {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw httpErr(400, "missing_apify_token", "APIFY_TOKEN is missing. Add it to .env and restart the server.");

  const url = `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}&memory=2048&timeout=${timeoutSec}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.min(timeoutSec * 1000 + 5000, 90000));

  try {
    const r = await nodeFetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "accept": "application/json" },
      body: JSON.stringify(input),
      signal: controller.signal
    });

    clearTimeout(timer);

    if (!r.ok) {
      const text = await r.text().catch(() => "");
      throw httpErr(502, "apify_error", `Apify returned HTTP ${r.status}${text ? ": " + text.slice(0, 240) : ""}`);
    }

    return await r.json().catch(() => []);
  } catch (e) {
    clearTimeout(timer);
    if (e.status) throw e;
    throw httpErr(504, "posts_timeout", e.name === "AbortError" ? "Post lookup timed out." : e.message);
  }
}

async function tiktokPosts(username, limit) {
  const actor = process.env.APIFY_TIKTOK_POST_ACTOR || process.env.APIFY_TIKTOK_ACTOR || "clockworks~tiktok-profile-scraper";

  const input = {
    profiles: [username],
    profileScrapeSections: ["videos"],
    profileSorting: "latest",
    resultsPerPage: limit,
    maxFollowersPerProfile: 0,
    maxFollowingPerProfile: 0,
    excludePinnedPosts: false,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
    shouldDownloadAvatars: false,
    commentsPerPost: 0,
    topLevelCommentsPerPost: 0,
    maxRepliesPerComment: 0
  };

  const items = await runApifyActor(actor, input, 75);

  // Clockworks can return either video items or one profile object with a videos array.
  const flat = [];
  for (const item of Array.isArray(items) ? items : [items]) {
    if (Array.isArray(item?.videos)) flat.push(...item.videos);
    if (Array.isArray(item?.posts)) flat.push(...item.posts);
    flat.push(item);
  }

  return flat
    .map(item => normalizePost(item, "tiktok", username))
    .filter(Boolean)
    .slice(0, limit);
}

async function instagramPosts(username, limit) {
  // More reliable default than apify/instagram-post-scraper for username-based latest posts.
  const actor = process.env.APIFY_INSTAGRAM_POST_ACTOR || "apify~instagram-scraper";

  const input = {
    // Do NOT send onlyPostsNewerThan: "".
    // That was causing Apify HTTP 400 validation errors.
    directUrls: [`https://www.instagram.com/${username}/`],
    resultsType: "posts",
    resultsLimit: limit,
    addParentData: false,
    searchType: "user"
  };

  const items = await runApifyActor(actor, input, 75);

  const flat = [];
  for (const item of Array.isArray(items) ? items : [items]) {
    if (Array.isArray(item?.latestPosts)) flat.push(...item.latestPosts);
    if (Array.isArray(item?.posts)) flat.push(...item.posts);
    if (Array.isArray(item?.items)) flat.push(...item.items);
    flat.push(item);
  }

  return flat
    .map(item => normalizePost(item, "instagram", username))
    .filter(Boolean)
    .slice(0, limit);
}

export default async function handler(req, res) {
  res.setHeader("access-control-allow-origin", "*");

  const platform = String(req.query?.platform || "").toLowerCase();
  const username = cleanUsername(req.query?.username);
  const limit = Math.max(1, Math.min(Number(req.query?.limit || 12), 18));

  if (!["instagram", "tiktok"].includes(platform)) {
    return res.status(400).json({ error: "invalid_platform", message: "platform must be instagram or tiktok" });
  }

  if (!username) {
    return res.status(400).json({ error: "invalid_username", message: "username is required" });
  }

  const key = `${platform}:posts:${username.toLowerCase()}:${limit}`;
  const hit = getCache(key);
  if (hit) {
    res.setHeader("cache-control", "public, s-maxage=1800, stale-while-revalidate=3600");
    return res.status(200).json(hit);
  }

  try {
    const posts = platform === "tiktok"
      ? await tiktokPosts(username, limit)
      : await instagramPosts(username, limit);

    const data = { platform, username, count: posts.length, posts };

    if (!posts.length) {
      return res.status(404).json({
        error: "no_posts_found",
        message: "No public posts were found for this profile."
      });
    }

    setCache(key, data);
    res.setHeader("cache-control", "public, s-maxage=1800, stale-while-revalidate=3600");
    return res.status(200).json(data);
  } catch (e) {
    return res.status(e.status || 502).json({
      error: e.code || "posts_error",
      message: e.message || "Could not fetch profile posts."
    });
  }
}
