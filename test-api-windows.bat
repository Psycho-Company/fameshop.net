@echo off
title Growly API Test
echo Testing local API...
echo.
curl http://localhost:3000/api/health
echo.
echo.
echo Testing Instagram profile endpoint...
curl "http://localhost:3000/api/profile?platform=instagram&username=instagram"
echo.
pause
