@echo off
REM MarketingBy App Startup Script
REM App Location: C:\Users\raman\OneDrive\Desktop\wetechfor u\main app\MarketingBy_web_app_react

set "APP_PATH=C:\Users\raman\OneDrive\Desktop\wetechfor u\main app\MarketingBy_web_app_react"

echo.
echo 🚀 Starting MarketingBy Application...
echo 📍 App Location: %APP_PATH%
echo.

REM Start Backend Server
echo 🔧 Starting Backend Server...
start "MarketingBy Backend" cmd /k "cd /d "%APP_PATH%\backend" && npm run dev"

REM Wait a moment
timeout /t 2 /nobreak >nul

REM Start Frontend Server
echo 🎨 Starting Frontend Server...
start "MarketingBy Frontend" cmd /k "cd /d "%APP_PATH%\frontend" && npm run dev"

echo.
echo ✅ Both servers are starting in separate windows!
echo 📊 Backend API: http://localhost:3001
echo 🌐 Frontend App: http://localhost:5173
echo.
echo 💡 Check the opened command windows for server status.
echo.
pause

