import nodeFetch from "node-fetch";

function mask(v) {
  if (!v) return null;
  return String(v).slice(0, 8) + "…" + String(v).slice(-4);
}

function cleanUsername(input) {
  let u = String(input || "").trim().replace(/^@/, "").split(/[/?#]/)[0];
  if (!u || !/^[A-Za-z0-9._-]{1,60}$/.test(u)) return null;
  return u;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

export default async function handler(req, res) {
  const username = cleanUsername(req.query?.username || "tiktok");
  const token = process.env.APIFY_TOKEN;
  const actor = process.env.APIFY_TIKTOK_ACTOR || "clockworks~tiktok-profile-scraper";

  if (!token) {
    return res.status(400).json({ ok: false, hasToken: false, actor });
  }

  try {
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

    const startUrl = `https://api.apify.com/v2/acts/${actor}/runs?token=${encodeURIComponent(token)}&memory=2048&timeout=75`;
    const start = await nodeFetch(startUrl, {
      method: "POST",
      headers: { "content-type": "application/json", "accept": "application/json" },
      body: JSON.stringify(input),
    });

    const startText = await start.text();
    let startJson;
    try { startJson = JSON.parse(startText); } catch { startJson = { raw: startText.slice(0, 300) }; }

    if (!start.ok) {
      return res.status(502).json({ ok: false, stage: "start", status: start.status, actor, tokenPreview: mask(token), response: startJson });
    }

    const runId = startJson?.data?.id;
    let run;
    for (let i = 0; i < 35; i++) {
      await sleep(1800);
      const rr = await nodeFetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${encodeURIComponent(token)}`);
      run = (await rr.json())?.data;
      if (["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"].includes(run?.status)) break;
    }

    if (run?.status !== "SUCCEEDED") {
      return res.status(504).json({ ok: false, stage: "run", status: run?.status, runId, actor });
    }

    const datasetId = run?.defaultDatasetId;
    const itemsRes = await nodeFetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${encodeURIComponent(token)}&clean=true&limit=3`);
    const items = await itemsRes.json().catch(() => []);

    return res.status(200).json({
      ok: true,
      actor,
      tokenPreview: mask(token),
      runId,
      datasetId,
      itemCount: Array.isArray(items) ? items.length : null,
      firstItemKeys: items?.[0] ? Object.keys(items[0]) : [],
      firstItem: items?.[0] || null
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message, actor });
  }
}
