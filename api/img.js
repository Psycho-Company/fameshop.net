import nodeFetch from "node-fetch";

export default async function handler(req, res) {
  const raw = String(req.query?.url || "");

  if (!raw || !/^https?:\/\//i.test(raw)) {
    return res.status(400).send("bad url");
  }

  try {
    const r = await nodeFetch(raw, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
        "accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
      timeout: 25000
    });

    if (!r.ok) return res.status(r.status).send("image fetch failed");

    const contentType = r.headers.get("content-type") || "image/jpeg";
    const buf = Buffer.from(await r.arrayBuffer());

    res.setHeader("content-type", contentType);
    res.setHeader("cache-control", "public, s-maxage=86400, stale-while-revalidate=604800");
    return res.status(200).send(buf);
  } catch (e) {
    return res.status(502).send("image proxy failed");
  }
}
