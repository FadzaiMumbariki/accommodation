# ImbaFind - Deploy Supabase Migrations Script
# Run this script after completing Supabase CLI login

Write-Host "=== ImbaFind Supabase Migration Deployment ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if logged in
Write-Host "Step 1: Checking Supabase CLI authentication..." -ForegroundColor Yellow
npx supabase projects list
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Not logged in to Supabase CLI" -ForegroundColor Red
    Write-Host "Please run: npx supabase login" -ForegroundColor Yellow
    Write-Host "Then enter the verification code: 518bd733" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Authenticated successfully!" -ForegroundColor Green
Write-Host ""

# Step 2: Link project
Write-Host "Step 2: Linking to Supabase project..." -ForegroundColor Yellow
npx supabase link --project-ref zmrbxxwrlvcqloewmchs
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to link project" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Project linked successfully!" -ForegroundColor Green
Write-Host ""

# Step 3: Push migrations
Write-Host "Step 3: Pushing migrations to production..." -ForegroundColor Yellow
npx supabase db push
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to push migrations" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Migrations pushed successfully!" -ForegroundColor Green
Write-Host ""

# Step 4: Verify
Write-Host "Step 4: Verifying deployment..." -ForegroundColor Yellow
npx supabase migration list
Write-Host ""

Write-Host "=== Deployment Complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Enable pg_net extension in Supabase Dashboard"
Write-Host "2. Deploy Edge Functions: npx supabase functions deploy"
Write-Host "3. Set GEMINI_API_KEY secret"
Write-Host ""
