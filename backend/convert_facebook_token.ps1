# Facebook Token Converter
# Converts short-lived token to long-lived token (60 days)

Write-Host "`n🔐 Facebook Token Converter" -ForegroundColor Cyan
Write-Host "=" * 60

# Your App Credentials
$appId = "1518539219154610"
$appSecret = "6b4924d4db16f9715c6c460f14fe208c"

# Prompt for short-lived token
Write-Host "`nPaste your short-lived token (from Graph API Explorer):" -ForegroundColor Yellow
$shortLivedToken = Read-Host

if ([string]::IsNullOrWhiteSpace($shortLivedToken)) {
    Write-Host "`n❌ Error: Token cannot be empty!" -ForegroundColor Red
    exit
}

Write-Host "`n🔄 Converting to long-lived token..." -ForegroundColor Yellow

# Build URL
$url = "https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=$appId&client_secret=$appSecret&fb_exchange_token=$shortLivedToken"

try {
    # Make request
    $response = Invoke-RestMethod -Uri $url -Method Get
    
    $longLivedToken = $response.access_token
    $expiresIn = $response.expires_in
    $daysValid = [math]::Round($expiresIn / 86400)
    
    Write-Host "`n✅ SUCCESS! Long-lived token generated!" -ForegroundColor Green
    Write-Host "=" * 60
    Write-Host "`n📋 Your Long-Lived Token:" -ForegroundColor Cyan
    Write-Host $longLivedToken -ForegroundColor White
    Write-Host "`n⏰ Valid for: $daysValid days" -ForegroundColor Yellow
    Write-Host "`n" + "=" * 60
    
    # Copy to clipboard
    Write-Host "`n📋 Token copied to clipboard!" -ForegroundColor Green
    $longLivedToken | Set-Clipboard
    
    Write-Host "`n📝 Next Step:" -ForegroundColor Cyan
    Write-Host "   Run this SQL in Heroku Dataclips:" -ForegroundColor White
    Write-Host ""
    Write-Host "   UPDATE client_credentials" -ForegroundColor Yellow
    Write-Host "   SET credentials = jsonb_set(" -ForegroundColor Yellow
    Write-Host "     credentials," -ForegroundColor Yellow
    Write-Host "     '{access_token}'," -ForegroundColor Yellow
    Write-Host "     '`"$longLivedToken`"'::jsonb" -ForegroundColor Yellow
    Write-Host "   )" -ForegroundColor Yellow
    Write-Host "   WHERE client_id = 1 AND service_type = 'facebook';" -ForegroundColor Yellow
    Write-Host ""
    
} catch {
    Write-Host "`n❌ Error converting token!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Message -like "*400*" -or $_.Exception.Message -like "*Invalid*") {
        Write-Host "`n   Possible reasons:" -ForegroundColor Yellow
        Write-Host "   1. Token is invalid or already expired" -ForegroundColor White
        Write-Host "   2. Token doesn't have required permissions" -ForegroundColor White
        Write-Host "   3. App credentials are incorrect" -ForegroundColor White
    }
}

Write-Host "`nPress any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

