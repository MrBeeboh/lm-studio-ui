@echo off
cd /d "%~dp0"
title LM Studio Unload Helper
echo [ATOM] Unload helper starting minimized: http://localhost:8766/unload-all
echo [ATOM] Set this URL in Settings > Unload helper (Python SDK) in the app.
echo.
pip install -r scripts/requirements-unload.txt -q
python scripts/unload_helper_server.py
pause
