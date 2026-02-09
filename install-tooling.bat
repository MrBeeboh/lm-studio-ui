@echo off
REM One-time setup: install deps, run tests
cd /d "%~dp0"
echo Installing dependencies...
call npm install
if errorlevel 1 exit /b 1
echo.
echo Running tests...
call npm run test:run
if errorlevel 1 exit /b 1
echo.
echo Done. Use: npm run dev, npm run test, npm run lint
