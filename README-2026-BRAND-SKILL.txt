GROWLY 2026 BRAND SKILL BUILD

What changed:
- New landing page art direction
- Premium hero visual system
- Trust-first brand system
- Dense legal/trust footer
- Modern CSS: cascade layers, progressive scroll-driven reveal, View Transition API fallback
- Search/package page re-styled to match the brand
- Secrets scrubbed: .env is NOT included, use .env.example

Run:
1. Copy .env.example to .env
2. Add PROXY_URL / APIFY_TOKEN values
3. npm install
4. npm run dev

Test:
http://localhost:3000
http://localhost:3000/api/env-check
http://localhost:3000/api/profile?platform=instagram&username=instagram
http://localhost:3000/api/profile?platform=tiktok&username=tiktok
