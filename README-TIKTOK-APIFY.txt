TIKTOK DOGRU DATA SETUP

Instagram mevcut proxy + HTML meta ile stabil.

TikTok'ta dogru profil fotografi + follower/following/likes icin Apify provider eklendi.

Yapman gereken:
1. Apify account ac.
2. API token al.
3. edit-env-windows.bat cift tikla.
4. .env icine sunu ekle/doldur:

APIFY_TOKEN=buraya_token
APIFY_TIKTOK_ACTOR=apidojo~tiktok-profile-scraper

5. Kaydet.
6. Tum eski CMD pencerelerini kapat.
7. start-windows.bat cift tikla.

Test:
http://localhost:3000/api/profile?platform=tiktok&username=tiktok

Vercel:
Project Settings -> Environment Variables:
APIFY_TOKEN = token
APIFY_TIKTOK_ACTOR = apidojo~tiktok-profile-scraper
PROXY_URL = mevcut proxy url

Sonra Redeploy.

Not:
APIFY_TOKEN yoksa sistem eski fallback ile calisir ama TikTok stats/avatar stabil olmayabilir.
