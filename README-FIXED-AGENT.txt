BU VERSIYONDA PROXY AGENT DEGISTI

cURL proxy testin calisti ama Node tarafinda undici ProxyAgent hata veriyordu.
Bu zipte proxy katmani node-fetch + https-proxy-agent olarak degistirildi.

Yap:
1. Eski tum CMD pencerelerini kapat.
2. Bu zipi ayikla.
3. start-windows.bat dosyasina cift tikla.
4. http://localhost:3000/api/proxy-test ac.

Beklenen:
ok: true

Sonra:
http://localhost:3000/api/profile?platform=instagram&username=instagram

Vercel:
Bu zipi repo root olarak yukle.
Vercel Environment Variables icine ayni PROXY_URL koy.
Redeploy yap.
