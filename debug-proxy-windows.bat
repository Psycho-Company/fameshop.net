@echo off
cd /d "%~dp0"

echo.
echo ==========================================
echo   Growly proxy debug
echo ==========================================
echo.

echo 1) Health:
curl "http://localhost:3000/api/health"

echo.
echo.
echo 2) Proxy test:
curl "http://localhost:3000/api/proxy-test"

echo.
echo.
echo 3) Instagram profile test:
curl "http://localhost:3000/api/profile?platform=instagram&username=instagram"

echo.
echo.
pause
