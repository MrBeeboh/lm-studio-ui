@echo off
setlocal
title AI Stack Launcher

REM Docker-free startup: LM Studio server + lm-studio-ui dev server.
REM Use this path for your desktop shortcut: C:\CURSOR\lm-studio-ui\START-EVERYTHING.bat

cd /d "%~dp0"

REM Config
set "LM_PORT=1234"
set "PAUSE_ON_EXIT=1"
set "LM_GUI_PATH_1=%LOCALAPPDATA%\Programs\LM Studio\LM Studio.exe"
set "LM_GUI_PATH_2=%ProgramFiles%\LM Studio\LM Studio.exe"

echo [INFO] Starting AI stack from: %CD%

REM 1) Start LM Studio headless server (port 1234). Keeps running in its own window.
where lms >nul 2>nul
if errorlevel 1 goto no_lms

echo [INFO] Launching LM Studio server on port %LM_PORT%...
start "LM Studio Server" cmd /k "lms server start --port %LM_PORT%"
goto start_ui

:no_lms
echo [WARN] 'lms' CLI not found in PATH. Starting LM Studio UI instead.
call :start_gui

:start_ui
REM 2) Ensure deps then start the chat UI dev server (Vite).
if not exist "node_modules" goto install_deps
goto run_ui

:install_deps
echo Installing dependencies...
call npm install

:run_ui
start "LM Studio UI" cmd /k "npm run dev"

REM 3) Open browser when Vite is up (Vite default is 5173)
timeout /t 5 /nobreak >nul
start "" "http://localhost:5173"

echo.
echo Started: LM Studio server (port %LM_PORT%), lm-studio-ui dev server (5173), browser.
echo Close the two command windows to stop the server and UI.
if "%PAUSE_ON_EXIT%"=="1" pause
exit /b 0

:start_gui
if exist "%LM_GUI_PATH_1%" goto start_gui_1
if exist "%LM_GUI_PATH_2%" goto start_gui_2
echo [WARN] LM Studio GUI not found. Launch it manually.
exit /b 1

:start_gui_1
start "" "%LM_GUI_PATH_1%"
exit /b 0

:start_gui_2
start "" "%LM_GUI_PATH_2%"
exit /b 0
