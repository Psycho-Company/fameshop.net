CORRECTED PROXY BUILD

Bu build'de .env icindeki PROXY_URL, cURL testinde calisan proxy bilgisine gore duzeltildi.

Yap:
1. Eski tum CMD pencerelerini kapat.
2. Bu klasorde start-windows.bat dosyasina cift tikla.
3. Once bunu ac:
   http://localhost:3000/api/proxy-test

Beklenen:
ok: true

4. Sonra bunu ac:
   http://localhost:3000/api/profile?platform=instagram&username=instagram

5. Site icinde kendi username'ini dene.

ONEMLI:
Bu zip icinde proxy sifresi var. Public GitHub'a yukleme.
Vercel icin .env dosyasindaki PROXY_URL satirini Environment Variables'a ekle, sonra Redeploy yap.
