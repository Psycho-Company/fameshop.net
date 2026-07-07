export default async function handler(req, res) {
  try {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      return res.status(200).json({ ok: true });
    }

    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers.host;

    if (!host) {
      return res.status(500).json({
        success: false,
        found: false,
        error: "Missing host header",
      });
    }

    const targetUrl = new URL(req.url, `${protocol}://${host}`);
    targetUrl.pathname = "/api/profile";

    const headers = { ...req.headers };
    delete headers.host;
    delete headers["content-length"];

    const options = {
      method: req.method,
      headers,
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      options.body = JSON.stringify(req.body || {});
      options.headers["content-type"] = "application/json";
    }

    const response = await fetch(targetUrl.toString(), options);
    const text = await response.text();

    res.statusCode = response.status;

    res.setHeader(
      "content-type",
      response.headers.get("content-type") || "application/json; charset=utf-8"
    );

    return res.end(text);
  } catch (error) {
    return res.status(500).json({
      success: false,
      found: false,
      error: error?.message || "check-account failed",
    });
  }
  
}
