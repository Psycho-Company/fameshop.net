APIFY CLOCKWORKS PROFILE SETUP

Bu build TikTok icin clockworks/tiktok-profile-scraper actor'una gore ayarlandi.

Apify tarafinda:
1. Apify Store'da "TikTok Profile Scraper" ac.
   Actor ID: clockworks/tiktok-profile-scraper
2. Input testinde:
   - Profile(s): tiktok veya test etmek istedigin username
   - Max posts per profile / resultsPerPage: 1
   - Max followers per profile: 0
   - Max following per profile: 0
   - Include profile avatars: ON
   - video download/comment/subtitle gibi seyler OFF
3. Save & start ile bir test run baslat.
4. Output'ta authorMeta / followers / avatar data geldiyse tamam.

Siteye baglamak:
1. Apify API token al.
2. edit-env-windows.bat ac.
3. .env icine ekle:
   APIFY_TOKEN=tokenin
   APIFY_TIKTOK_ACTOR=clockworks~tiktok-profile-scraper
4. start-windows.bat calistir.

Test:
http://localhost:3000/api/profile?platform=tiktok&username=tiktok

Vercel:
Environment Variables:
APIFY_TOKEN
APIFY_TIKTOK_ACTOR=clockworks~tiktok-profile-scraper
PROXY_URL
