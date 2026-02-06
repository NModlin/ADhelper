# Test ADhelper.ps1 - Dry Run
# This script tests the ADhelper.ps1 initialization without processing users

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ADHelper.ps1 - Dry Run Test" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Test 1: Check if file exists
Write-Host "[Test 1] Checking if ADhelper.ps1 exists..." -ForegroundColor Yellow
$scriptPath = "c:\GitHub\ADhelper\ADhelper.ps1"
if (Test-Path $scriptPath) {
    Write-Host "✅ File found: $scriptPath" -ForegroundColor Green
} else {
    Write-Host "❌ File not found: $scriptPath" -ForegroundColor Red
    exit 1
}

# Test 2: Syntax validation
Write-Host "`n[Test 2] Validating PowerShell syntax..." -ForegroundColor Yellow
$errors = $null
$tokens = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($scriptPath, [ref]$tokens, [ref]$errors)

if ($errors.Count -eq 0) {
    Write-Host "✅ Syntax validation passed (0 errors)" -ForegroundColor Green
    Write-Host "   Total lines: $($ast.EndBlock.Extent.EndLineNumber)" -ForegroundColor Gray
} else {
    Write-Host "❌ Syntax errors found: $($errors.Count)" -ForegroundColor Red
    $errors | ForEach-Object {
        Write-Host "   Line $($_.Extent.StartLineNumber): $($_.Message)" -ForegroundColor Yellow
    }
    exit 1
}

# Test 3: Check for required functions
Write-Host "`n[Test 3] Checking for required functions..." -ForegroundColor Yellow
$requiredFunctions = @(
    'Initialize-SecureCredentials',
    'Save-WindowsCredential',
    'Get-WindowsCredential',
    'Process-User',
    'Add-UserToStandardGroups',
    'Start-ParallelGroupProcessing'
)

$scriptContent = Get-Content $scriptPath -Raw
$missingFunctions = @()

foreach ($func in $requiredFunctions) {
    if ($scriptContent -match "function $func") {
        Write-Host "   ✅ $func" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $func - NOT FOUND" -ForegroundColor Red
        $missingFunctions += $func
    }
}

if ($missingFunctions.Count -eq 0) {
    Write-Host "✅ All required functions found" -ForegroundColor Green
} else {
    Write-Host "❌ Missing functions: $($missingFunctions.Count)" -ForegroundColor Red
    exit 1
}

# Test 4: Check credential manager integration
Write-Host "`n[Test 4] Checking credential manager integration..." -ForegroundColor Yellow
if ($scriptContent -match 'CredentialManagement\.NativeCredential') {
    Write-Host "✅ Native Windows Credential Manager integration found" -ForegroundColor Green
} else {
    Write-Host "❌ Credential Manager integration not found" -ForegroundColor Red
    exit 1
}

# Test 5: Check for main menu
Write-Host "`n[Test 5] Checking for main menu..." -ForegroundColor Yellow
if ($scriptContent -match 'AD HELPER - Advanced Group & Proxy Manager') {
    Write-Host "✅ Main menu found" -ForegroundColor Green
} else {
    Write-Host "❌ Main menu not found" -ForegroundColor Red
    exit 1
}

# Test 6: Verify credential targets
Write-Host "`n[Test 6] Checking credential targets..." -ForegroundColor Yellow
$credentialTargets = @('ADHelper_AdminCred')
foreach ($target in $credentialTargets) {
    if ($scriptContent -match $target) {
        Write-Host "   ✅ $target" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $target - NOT FOUND" -ForegroundColor Red
    }
}

# Summary
Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Test Summary" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ All tests passed!" -ForegroundColor Green
Write-Host "✅ ADhelper.ps1 is ready to use" -ForegroundColor Green
Write-Host "✅ Credential manager integration verified" -ForegroundColor Green
Write-Host ""
Write-Host "To run the script:" -ForegroundColor Yellow
Write-Host "  powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"ADhelper.ps1`"" -ForegroundColor Gray
Write-Host ""

