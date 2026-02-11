@echo off
setlocal enabledelayedexpansion
title ATOM UI
cd /d "%~dp0"

echo [ATOM] Running from: %CD%
echo [ATOM] If your app shows no changes, hard-refresh the browser: Ctrl+Shift+R
echo.

echo [ATOM] Clearing port 5173 if in use...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" 2>nul
echo [ATOM] Clearing port 8765 if in use (voice server)...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8765 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" 2>nul
echo [ATOM] Clearing port 5000 if in use (hardware metrics)...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" 2>nul
echo [ATOM] Clearing port 8766 if in use (unload helper)...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8766 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" 2>nul
ping 127.0.0.1 -n 2 >nul

echo [ATOM] Starting Unload helper (Port 8766) [minimized]...
start /min "ATOM Unload Helper" cmd /c "cd /d "%~dp0" && pip install -r scripts/requirements-unload.txt -q && python scripts/unload_helper_server.py"
echo [ATOM] Starting Hardware metrics server (Port 5000) [minimized]...
start /min "ATOM Hardware Metrics" cmd /c "cd /d "%~dp0" && pip install -r scripts/requirements-hardware.txt -q && python scripts/hardware_server.py"
echo [ATOM] Starting Voice server (Port 8765) [minimized]...
start /min "ATOM Voice Server" cmd /c "cd /d "%~dp0voice-server" && if exist .venv\Scripts\activate.bat (call .venv\Scripts\activate.bat && uvicorn app:app --host 0.0.0.0 --port 8765) else (echo Voice server not set up. See voice-server\README.md && pause)"

echo [ATOM] Starting Frontend (Port 5173) [minimized]...
start /min "ATOM Frontend" cmd /c "npm run dev"

echo [ATOM] Waiting 10s for Vite dev server...
ping 127.0.0.1 -n 11 >nul

echo [ATOM] Launching browser...
start http://localhost:5173

echo.
echo =============================================
echo   ATOM UI is running!
echo =============================================
echo.
echo   This PC:    http://localhost:5173
echo   Phone/LAN:  http://10.0.0.51:5173
echo.
echo   To use on your Pixel: open Chrome and go to
echo   http://10.0.0.51:5173
echo.
echo   LM Studio: run on port 1234 for your models.
echo   To stop: run kill_atom_ui.bat
echo =============================================
echo.

REM Keep this window open briefly so user can see the URL, then exit
timeout /t 8 /nobreak >nul
exit
