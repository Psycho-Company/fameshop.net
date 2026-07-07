PROXY EKLENDI

.env dosyasina proxy URL dogru formatta eklendi.

Yapman gereken:
1. start-windows.bat dosyasina cift tikla
2. http://localhost:3000 acilacak
3. Instagram username test et

API test:
http://localhost:3000/api/health
http://localhost:3000/api/profile?platform=instagram&username=instagram

Vercel icin:
Project -> Settings -> Environment Variables

Name:
PROXY_URL

Value:
.env dosyasindaki PROXY_URL satirinin aynisi

Sonra Redeploy.

ONEMLI:
Bu zip icinde proxy sifren var. Public GitHub reposuna koyma.
Vercel'a ekledikten sonra istersen IPRoyal panelinden proxy password degistir/rotate et.
