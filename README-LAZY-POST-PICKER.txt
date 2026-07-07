LAZY POST PICKER BUILD

Akis:
1. Username girilince sadece profile lookup calisir.
2. Followers tab default gelir, post request yok.
3. Kullanici Likes veya Views tabine basarsa /api/posts calisir.
4. Son 12 post cekilir, kullanici post secer.
5. Post secmeden Likes/Views checkout'a gidemez.
6. Postlar 30 dakika server cache'e girer.

Env:
APIFY_TOKEN=token
APIFY_TIKTOK_ACTOR=clockworks~tiktok-profile-scraper
APIFY_TIKTOK_POST_ACTOR=clockworks~tiktok-profile-scraper
APIFY_INSTAGRAM_POST_ACTOR=apify~instagram-post-scraper

Test:
http://localhost:3000/api/posts?platform=tiktok&username=tiktok&limit=12
http://localhost:3000/api/posts?platform=instagram&username=instagram&limit=12

Not:
Apify token olmadan post picker stabil calismaz.
