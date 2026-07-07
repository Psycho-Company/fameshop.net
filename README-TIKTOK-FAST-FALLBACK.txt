TIKTOK FAST FALLBACK BUILD

TikTok artik 20 saniye bekletmez.

Yeni TikTok sirası:
1. Lightweight TikTok API detail endpoint, max 4.5s
2. TikTok oEmbed fallback, max 4.5s
3. HTML fallback, max 5.5s
4. Controlled error

Instagram ayni stabil HTML-first akista kaldi.

Not:
TikTok Instagram kadar stabil degil. Follower stats her zaman gelmeyebilir.
Ama UI artik uzun loading'e dusmez.

Test:
http://localhost:3000/api/profile?platform=instagram&username=instagram
http://localhost:3000/api/profile?platform=tiktok&username=tiktok
