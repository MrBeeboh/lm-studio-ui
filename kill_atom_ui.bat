@echo off
setlocal
title ATOM UI — Kill

echo [ATOM] Stopping frontend on port 5173...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" 2>nul
if %errorlevel% equ 0 goto :done

REM Fallback: netstat + taskkill
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173" ^| findstr "LISTENING"') do taskkill /PID %%a /F 2>nul

:done
echo [ATOM] Done. Port 5173 cleared.
pause
