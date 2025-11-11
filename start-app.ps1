# MarketingBy App Startup Script
# App Location: C:\Users\raman\OneDrive\Desktop\wetechfor u\main app\MarketingBy_web_app_react

$appPath = "C:\Users\raman\OneDrive\Desktop\wetechfor u\main app\MarketingBy_web_app_react"

Write-Host "🚀 Starting MarketingBy Application..." -ForegroundColor Green
Write-Host "📍 App Location: $appPath" -ForegroundColor Cyan

# Start Backend Server
Write-Host "`n🔧 Starting Backend Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$appPath\backend'; if (`$?) { npm run dev }" -WindowStyle Normal

# Wait a moment for backend to start
Start-Sleep -Seconds 2

# Start Frontend Server
Write-Host "🎨 Starting Frontend Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$appPath\frontend'; if (`$?) { npm run dev }" -WindowStyle Normal

Write-Host "`n✅ Both servers are starting in separate windows!" -ForegroundColor Green
Write-Host "📊 Backend API: http://localhost:3001" -ForegroundColor Cyan
Write-Host "🌐 Frontend App: http://localhost:5173" -ForegroundColor Cyan
Write-Host "`n💡 Check the opened PowerShell windows for server status." -ForegroundColor Yellow

