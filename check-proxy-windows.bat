@echo off
cd /d "%~dp0"

echo Testing proxy through local API...
echo.
echo First start the server with start-windows.bat if it is not already running.
echo.

curl "http://localhost:3000/api/health"
echo.
echo.
curl "http://localhost:3000/api/profile?platform=instagram&username=instagram"
echo.
pause
