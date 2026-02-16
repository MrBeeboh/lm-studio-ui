@echo off
cd /d "%~dp0"
echo Starting local CORS proxy on port 8080...
call node local-cors-proxy.js
