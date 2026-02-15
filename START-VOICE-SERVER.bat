@echo off
setlocal
title ATOM Voice Server (port 8765)
cd /d "%~dp0"

echo Starting voice-to-text server on http://localhost:8765
echo Keep this window open while using the mic in ATOM UI.
echo.

cd voice-server
if not exist ".venv\Scripts\activate.bat" (
  echo [INFO] No .venv found. Using system Python. For best results run:
  echo   cd voice-server
  echo   python -m venv .venv
  echo   .venv\Scripts\activate
  echo   pip install -r requirements.txt
  echo.
  python -m uvicorn app:app --host 0.0.0.0 --port 8765
) else (
  call .venv\Scripts\activate.bat
  uvicorn app:app --host 0.0.0.0 --port 8765
)

pause
