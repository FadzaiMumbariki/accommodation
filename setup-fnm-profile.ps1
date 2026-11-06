# Setup fnm in PowerShell profile for permanent configuration
Write-Host "Configuring fnm in PowerShell profile..." -ForegroundColor Cyan

# Get PowerShell profile path
$profilePath = $PROFILE

# Create profile directory if it doesn't exist
$profileDir = Split-Path -Parent $profilePath
if (!(Test-Path $profileDir)) {
    New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
    Write-Host "Created profile directory: $profileDir" -ForegroundColor Yellow
}

# Create profile file if it doesn't exist
if (!(Test-Path $profilePath)) {
    New-Item -ItemType File -Path $profilePath -Force | Out-Null
    Write-Host "Created profile file: $profilePath" -ForegroundColor Yellow
}

# Check if fnm is already in profile
$profileContent = Get-Content $profilePath -Raw -ErrorAction SilentlyContinue
$fnmConfig = "fnm env --use-on-cd | Out-String | Invoke-Expression"

if ($profileContent -notlike "*fnm env*") {
    # Add fnm configuration to profile
    Add-Content -Path $profilePath -Value "`n# fnm (Fast Node Manager) configuration"
    Add-Content -Path $profilePath -Value $fnmConfig
    Write-Host "`n✓ Added fnm configuration to PowerShell profile" -ForegroundColor Green
    Write-Host "  Location: $profilePath" -ForegroundColor Gray
} else {
    Write-Host "`n✓ fnm is already configured in PowerShell profile" -ForegroundColor Green
}

Write-Host "`nTo apply changes:" -ForegroundColor Yellow
Write-Host "  1. Run: . $profilePath" -ForegroundColor White
Write-Host "  2. Or restart your PowerShell terminal" -ForegroundColor White
Write-Host "`nThen you can use 'fnm use 22' in any new session." -ForegroundColor Cyan
