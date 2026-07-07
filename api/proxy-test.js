import nodeFetch from "node-fetch";
import { HttpsProxyAgent } from "https-proxy-agent";

export default async function handler(req, res) {
  const proxyUrl = process.env.PROXY_URL || "";

  if (!proxyUrl) {
    return res.status(400).json({
      ok: false,
      error: "missing_proxy_url",
      message: "PROXY_URL is empty or not loaded"
    });
  }

  let parsed;
  try {
    parsed = new URL(proxyUrl);
  } catch (e) {
    return res.status(400).json({
      ok: false,
      error: "invalid_proxy_url",
      message: e.message,
      expected: "http://username:password@host:port"
    });
  }

  try {
    const agent = new HttpsProxyAgent(proxyUrl);

    const r = await nodeFetch("https://api.ipify.org?format=json", {
      agent,
      headers: {
        "user-agent": "Mozilla/5.0 GrowlyProxyTest"
      },
      timeout: 25000
    });

    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    return res.status(200).json({
      ok: true,
      proxyLoaded: true,
      proxyHost: parsed.hostname,
      proxyPort: parsed.port,
      status: r.status,
      exitIp: data.ip || null,
      response: data
    });
  } catch (e) {
    return res.status(502).json({
      ok: false,
      proxyLoaded: true,
      error: "proxy_fetch_failed",
      message: e.message,
      proxyHost: parsed.hostname,
      proxyPort: parsed.port,
      hint: "cURL works, so this should work too. Restart server and run npm install again."
    });
  }
}
