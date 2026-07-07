PROXY BAGLAMA

1. Proxy panelinden su bilgileri al:
   - host
   - port
   - username
   - password

2. Bunlari tek satir haline getir:
   PROXY_URL=http://username:password@host:port

3. edit-env-windows.bat dosyasina cift tikla

4. Acilan Notepad icine sunu yaz:
   PROXY_URL=http://username:password@host:port

5. Kaydet, kapat.

6. start-windows.bat dosyasina cift tikla.

Test:
http://localhost:3000/api/health

Instagram test:
http://localhost:3000/api/profile?platform=instagram&username=instagram

TikTok test:
http://localhost:3000/api/profile?platform=tiktok&username=tiktok

VERCEL:
Vercel panelinde Environment Variables kismina aynisini ekle:
Name: PROXY_URL
Value: http://username:password@host:port

Sonra redeploy yap.
