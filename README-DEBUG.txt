DEBUG ADIMLARI

1. Tum eski CMD pencerelerini kapat.
   Ozellikle npm run dev calisan eski pencereler varsa kapat.

2. Bu klasorde start-windows.bat dosyasina cift tikla.

3. Sonra tarayicida ac:
   http://localhost:3000/api/proxy-test

Beklenen sonuc:
{
  "ok": true,
  "exitIp": "..."
}

Eger ok false ise proxy baglantisi problemli.

Sonra test:
http://localhost:3000/api/profile?platform=instagram&username=instagram

Vercel icin:
Environment Variables'a PROXY_URL ekledikten sonra redeploy yapmadan calismaz.
