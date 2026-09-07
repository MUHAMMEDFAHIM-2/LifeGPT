@echo off
rem Stops the LifeGPT dev servers by killing whatever listens on ports 3000 and 8000.
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r ":3000.*LISTENING :8000.*LISTENING"') do taskkill /f /pid %%p >nul 2>&1
echo LifeGPT servers stopped.
timeout /t 3 >nul
