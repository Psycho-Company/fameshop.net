INSTAGRAM HTML-FIRST BUILD

Sorun:
Instagram'in i.instagram.com/web_profile_info endpointi proxy ile bazi dogru hesaplarda bile 404 dondurebiliyor.
Bu build Instagram icin direkt www.instagram.com/{username}/ HTML meta datasini okur.
cURL testinde calisan yol buydu.

Yap:
1. Eski tum CMD pencerelerini kapat.
2. Bu klasorde start-windows.bat dosyasina cift tikla.
3. Once:
   http://localhost:3000/api/proxy-test

4. Sonra:
   http://localhost:3000/api/profile?platform=instagram&username=instagram

Beklenen:
JSON icinde username, name, avatar, followers, following, posts.

Not:
Kendi handle'in @evren.karsit ise noktayla dene:
http://localhost:3000/api/profile?platform=instagram&username=evren.karsit
