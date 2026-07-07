@echo off
title Growly Local Server
cd /d "%~dp0"

echo.
echo ==========================================
echo   Growly local server setup
echo ==========================================
echo.
echo Current folder:
echo %cd%
echo.

if not exist package.json (
  echo ERROR: package.json bu klasorde yok.
  echo.
  echo Bu dosyayi zipten cikan klasorun icinde calistirman lazim.
  echo start-windows.bat ile ayni klasorde package.json olmali.
  echo.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js bulunamadi.
  echo.
  echo Once Node.js LTS yukle:
  echo https://nodejs.org/
  echo.
  pause
  exit /b 1
)

echo Checking PROXY_URL...
findstr /R "^PROXY_URL=http" .env >nul 2>nul
if errorlevel 1 (
  echo.
  echo UYARI: .env icinde PROXY_URL bos gorunuyor.
  echo Instagram/TikTok data cekmek icin edit-env-windows.bat ile proxy URL ekle.
  echo Server yine acilir ama profile lookup block yiyebilir.
  echo.
)

echo Installing packages...
call npm install

if errorlevel 1 (
  echo.
  echo npm install sirasinda hata oldu.
  pause
  exit /b 1
)

echo.
echo Server aciliyor...
echo Tarayici birazdan http://localhost:3000 adresini acacak.
echo.

start "Growly Server" cmd /k "cd /d ""%~dp0"" && npm run dev"

timeout /t 3 /nobreak >nul
start http://localhost:3000

echo.
echo Eger sayfa acilmazsa elle bunu ac:
echo http://localhost:3000
echo.
pause
