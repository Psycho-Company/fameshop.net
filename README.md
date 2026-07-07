# Growly — real live Instagram/TikTok profile lookup

This version has **no mock/demo fallback**. The account check calls the real backend API:

- `/api/health`
- `/api/profile?platform=instagram&username=instagram`
- `/api/profile?platform=tiktok&username=tiktok`

## Local run

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Vercel

Repo root must contain:

```text
api/
index.html
search.html
checkout.html
package.json
server.js
vercel.json
```

Vercel settings:

```text
Framework Preset: Other
Root Directory: ./
Build Command: empty
Output Directory: empty
Install Command: npm install
```

## Important

Instagram/TikTok may block Vercel/cloud datacenter IPs. If `/api/profile` returns `upstream_blocked`, add a residential proxy in Vercel Environment Variables:

```text
PROXY_URL=http://user:pass@host:port
```

Then redeploy.
