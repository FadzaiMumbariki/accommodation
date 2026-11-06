# Setup Node.js 22 with fnm
Write-Host "Setting up Node.js 22..." -ForegroundColor Cyan

# Setup fnm environment
fnm env --use-on-cd | Out-String | Invoke-Expression

# Install Node.js 22 if not already installed
Write-Host "Installing Node.js 22..." -ForegroundColor Yellow
fnm install 22

# Set as default
Write-Host "Setting Node.js 22 as default..." -ForegroundColor Yellow
fnm default 22

# Use it in current session
fnm use 22

# Verify installation
Write-Host "`nNode.js version:" -ForegroundColor Green
node --version

Write-Host "`nnpm version:" -ForegroundColor Green
npm --version

Write-Host "`nSetup complete! Node.js 22 is now active." -ForegroundColor Green
Write-Host "To use Node.js 22 in new PowerShell sessions, add this to your PowerShell profile:" -ForegroundColor Yellow
Write-Host "  fnm env --use-on-cd | Out-String | Invoke-Expression" -ForegroundColor White
