@echo off
title Fameshop Local Test - Clean Start
cd /d "%~dp0"

if not exist package.json (
  echo HATA: Bu dosya proje klasorunun icinde calismali.
  pause
  exit /b 1
)

if not exist .env (
  echo .env bulunamadi, olusturuluyor...
  copy .env.example .env >nul
)

findstr /C:"LEMONSQUEEZY_API_KEY=BURAYA_LEMON_API_KEY_YAPISTIR" .env >nul 2>nul
if %errorlevel%==0 (
  echo.
  echo ONCE API KEY'I GIR.
  start notepad .env
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js yok. Once Node.js LTS kurulmali: https://nodejs.org/
  pause
  exit /b 1
)

echo Eski localhost:3000 server varsa kapatiliyor...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
  taskkill /PID %%a /F >nul 2>nul
)

echo Paketler kuruluyor. Ilk acilista 1-2 dk surebilir...
call npm install
if errorlevel 1 (
  echo.
  echo npm install sirasinda hata oldu.
  pause
  exit /b 1
)

echo.
echo Fameshop local server temiz baslatiliyor...
start "Fameshop Server" cmd /k "cd /d ""%~dp0"" && npm run dev"
timeout /t 3 /nobreak >nul
start http://localhost:3000/api/env-check
start http://localhost:3000
start http://localhost:3000/admin.html?key=123456

echo.
echo Once acilan env-check sayfasinda lemon.hasApiKey true gorunmeli.
echo Sonra sitede paket secip Pay securely test et.
echo.
pause
