@echo off
rem Starts LifeGPT backend (port 8000) and frontend (port 3000) in their own windows.
rem Close the windows (or run stop-lifegpt.bat) to stop the servers.

start "LifeGPT Backend" /min cmd /k "cd /d %~dp0backend && venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000 --reload"
start "LifeGPT Frontend" /min cmd /k "cd /d %~dp0frontend && npm run dev"

echo LifeGPT is starting...
echo   On this laptop:  http://localhost:3000
echo   On your phone:   http://192.168.1.199:3000  (same Wi-Fi)
timeout /t 5 >nul
