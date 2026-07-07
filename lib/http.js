export async function readRawBody(req) {
  if (typeof req.rawBody === "string" || Buffer.isBuffer(req.rawBody)) {
    return Buffer.isBuffer(req.rawBody) ? req.rawBody.toString("utf8") : req.rawBody;
  }

  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === "string") return req.body;
    if (Buffer.isBuffer(req.body)) return req.body.toString("utf8");
    return JSON.stringify(req.body);
  }

  if (!req.on || typeof req.on !== "function") return "";

  return new Promise((resolve, reject) => {
    let data = "";
    req.setEncoding?.("utf8");
    req.on("data", chunk => { data += chunk; });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

export async function readJsonBody(req) {
  const raw = await readRawBody(req);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (_) {
    const params = new URLSearchParams(raw);
    return Object.fromEntries(params.entries());
  }
}

export function json(res, status, payload) {
  return res.status(status).json(payload);
}

export function getOrigin(req) {
  const configured = process.env.PUBLIC_SITE_URL || process.env.SITE_URL || process.env.BASE_URL;
  if (configured) return configured.replace(/\/$/, "");

  const proto = req.headers?.["x-forwarded-proto"] || "https";
  const host = req.headers?.["x-forwarded-host"] || req.headers?.host || "localhost:3000";
  return `${proto}://${host}`.replace(/\/$/, "");
}
