import "dotenv/config";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".otf": "font/otf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".mp4": "video/mp4",
};

function createRes(res) {
  return {
    setHeader: (...args) => res.setHeader(...args),
    status(code) {
      res.statusCode = code;
      return {
        json(obj) {
          res.setHeader("content-type", "application/json; charset=utf-8");
          res.end(JSON.stringify(obj));
        },
        send(body) {
          if (Buffer.isBuffer(body)) res.end(body);
          else res.end(String(body));
        },
      };
    },
  };
}

async function collectBody(req) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method || "")) return "";
  return new Promise((resolve, reject) => {
    let data = "";
    req.setEncoding("utf8");
    req.on("data", chunk => { data += chunk; });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname.startsWith("/api/")) {
    try {
      const name = url.pathname.replace("/api/", "").replace(/\.js$/, "");
      const file = path.join(__dirname, "api", `${name}.js`);
      if (!fs.existsSync(file)) {
        res.statusCode = 404;
        res.end("api not found");
        return;
      }

      const rawBody = await collectBody(req);
      const query = Object.fromEntries(url.searchParams.entries());
      const localReq = {
        query,
        method: req.method,
        url: req.url,
        headers: req.headers,
        rawBody,
        body: rawBody,
      };

      const mod = await import(pathToFileURL(file).href + `?t=${Date.now()}`);
      await mod.default(localReq, createRes(res));
      return;
    } catch (e) {
      res.statusCode = 500;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: "server_error", message: e.message }));
      return;
    }
  }

  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";
  if (pathname === "/search") pathname = "/search.html";
  if (pathname === "/checkout") pathname = "/checkout.html";

  const filePath = path.join(__dirname, pathname);
  if (!filePath.startsWith(__dirname) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.statusCode = 404;
    res.end("Not found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mime[ext] || "application/octet-stream";
  const stat = fs.statSync(filePath);
  const range = req.headers.range;

  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    const start = match[1] ? parseInt(match[1], 10) : 0;
    const end = match[2] ? parseInt(match[2], 10) : stat.size - 1;
    res.statusCode = 206;
    res.setHeader("content-range", `bytes ${start}-${end}/${stat.size}`);
    res.setHeader("accept-ranges", "bytes");
    res.setHeader("content-length", end - start + 1);
    res.setHeader("content-type", contentType);
    fs.createReadStream(filePath, { start, end }).pipe(res);
    return;
  }

  res.setHeader("content-type", contentType);
  res.setHeader("accept-ranges", "bytes");
  res.setHeader("content-length", stat.size);
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
  console.log(`Fameshop live server running: http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
