# ImbaFind Local Android Build Script
# Run this script to build an APK using Android SDK

Write-Host "================================" -ForegroundColor Cyan
Write-Host "ImbaFind APK Build Script" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Step 1: Generate native Android project
Write-Host "[1/4] Generating native Android project..." -ForegroundColor Yellow
npx expo prebuild --platform android --clean

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[ERROR] Prebuild failed!" -ForegroundColor Red
    exit 1
}

# Step 2: Navigate to android directory
Write-Host "`n[2/4] Setting up build environment..." -ForegroundColor Yellow
cd android

# Step 3: Build debug APK
Write-Host "`n[3/4] Building APK (this may take 5-10 minutes)..." -ForegroundColor Yellow
.\gradlew.bat assembleRelease

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[ERROR] Build failed!" -ForegroundColor Red
    cd ..
    exit 1
}

# Step 4: Copy APK to root
Write-Host "`n[4/4] Copying APK..." -ForegroundColor Yellow
cd ..
$apkPath = "android\app\build\outputs\apk\release\app-release.apk"
if (Test-Path $apkPath) {
    Copy-Item $apkPath "ImbaFind-preview.apk" -Force
    Write-Host "`n================================" -ForegroundColor Green
    Write-Host "SUCCESS! APK created:" -ForegroundColor Green
    Write-Host "Location: ImbaFind-preview.apk" -ForegroundColor Green
    Write-Host "Size: $((Get-Item ImbaFind-preview.apk).Length / 1MB) MB" -ForegroundColor Green
    Write-Host "================================`n" -ForegroundColor Green
} else {
    Write-Host "`n[ERROR] APK not found at expected location!" -ForegroundColor Red
    exit 1
}
