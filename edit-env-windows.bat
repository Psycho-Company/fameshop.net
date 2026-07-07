@echo off
cd /d "%~dp0"

if not exist .env (
  echo PROXY_URL= > .env
)

notepad .env
