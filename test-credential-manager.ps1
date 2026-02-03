# Test script for Windows Credential Manager integration
# This script demonstrates how to save, retrieve, and delete credentials

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ADHelper Credential Manager Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$scriptPath = Join-Path $PSScriptRoot "scripts\CredentialManager.ps1"

if (-not (Test-Path $scriptPath)) {
    Write-Host "❌ Error: CredentialManager.ps1 not found at: $scriptPath" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Found CredentialManager.ps1" -ForegroundColor Green
Write-Host ""

# Test 1: Save a credential
Write-Host "Test 1: Saving a test credential..." -ForegroundColor Yellow
$saveResult = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $scriptPath `
    -Action Save `
    -Target "ADHelper_Test" `
    -Username "testuser@domain.com" `
    -Password "TestPassword123!"

$saveData = $saveResult | ConvertFrom-Json
if ($saveData.success) {
    Write-Host "✅ Save successful: $($saveData.message)" -ForegroundColor Green
} else {
    Write-Host "❌ Save failed: $($saveData.error)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Retrieve the credential
Write-Host "Test 2: Retrieving the test credential..." -ForegroundColor Yellow
$getResult = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $scriptPath `
    -Action Get `
    -Target "ADHelper_Test"

$getData = $getResult | ConvertFrom-Json
if ($getData.success) {
    Write-Host "✅ Retrieval successful!" -ForegroundColor Green
    Write-Host "   Username: $($getData.username)" -ForegroundColor Cyan
    Write-Host "   Password: $('*' * $getData.password.Length) (hidden)" -ForegroundColor Cyan
} else {
    Write-Host "❌ Retrieval failed: $($getData.error)" -ForegroundColor Red
}
Write-Host ""

# Test 3: Try to get a non-existent credential
Write-Host "Test 3: Trying to get a non-existent credential..." -ForegroundColor Yellow
$getNonExistentResult = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $scriptPath `
    -Action Get `
    -Target "ADHelper_NonExistent"

$getNonExistentData = $getNonExistentResult | ConvertFrom-Json
if ($getNonExistentData.success) {
    Write-Host "⚠️  Unexpected success (should not find credential)" -ForegroundColor Yellow
} else {
    Write-Host "✅ Correctly reported: $($getNonExistentData.error)" -ForegroundColor Green
}
Write-Host ""

# Test 4: Delete the credential
Write-Host "Test 4: Deleting the test credential..." -ForegroundColor Yellow
$deleteResult = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $scriptPath `
    -Action Delete `
    -Target "ADHelper_Test"

$deleteData = $deleteResult | ConvertFrom-Json
if ($deleteData.success) {
    Write-Host "✅ Delete successful: $($deleteData.message)" -ForegroundColor Green
} else {
    Write-Host "❌ Delete failed: $($deleteData.error)" -ForegroundColor Red
}
Write-Host ""

# Test 5: Verify deletion
Write-Host "Test 5: Verifying credential was deleted..." -ForegroundColor Yellow
$verifyResult = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $scriptPath `
    -Action Get `
    -Target "ADHelper_Test"

$verifyData = $verifyResult | ConvertFrom-Json
if ($verifyData.success) {
    Write-Host "⚠️  Credential still exists (deletion may have failed)" -ForegroundColor Yellow
} else {
    Write-Host "✅ Credential successfully deleted: $($verifyData.error)" -ForegroundColor Green
}
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "All tests completed!" -ForegroundColor Green
Write-Host ""
Write-Host "You can now use the credential manager in your application:" -ForegroundColor White
Write-Host "  • Save credentials: ADHelper_ActiveDirectory" -ForegroundColor Gray
Write-Host "  • Save credentials: ADHelper_Jira" -ForegroundColor Gray
Write-Host "  • Credentials are stored securely in Windows Credential Manager" -ForegroundColor Gray
Write-Host ""
Write-Host "To view stored credentials manually:" -ForegroundColor White
Write-Host "  1. Open Control Panel" -ForegroundColor Gray
Write-Host "  2. Go to User Accounts > Credential Manager" -ForegroundColor Gray
Write-Host "  3. Look under 'Windows Credentials'" -ForegroundColor Gray
Write-Host ""

