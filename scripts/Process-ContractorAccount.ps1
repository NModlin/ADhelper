# Process-ContractorAccount.ps1
# Bridge script for contractor account extension processing
# Reads parameters from a JSON temp file to prevent command injection
# Called with: -File Process-ContractorAccount.ps1 -ParamsFile <path-to-json>
#
# For each contractor user:
#   1. Validates user exists in AD
#   2. Verifies user is in Non-Rehrig OU
#   3. Checks/Updates Display Name to end with " - Contractor"
#   4. Extends account expiration by 1 year from today

param (
    [Parameter(Mandatory=$true)]
    [string]$ParamsFile
)

$ErrorActionPreference = "Continue"

# ── 1. Read and validate params file ──────────────────────────────────────────
if (-not (Test-Path $ParamsFile)) {
    @{ Success = $false; Error = "Parameters file not found: $ParamsFile" } | ConvertTo-Json
    exit 1
}

try {
    $params = Get-Content $ParamsFile -Raw | ConvertFrom-Json
}
catch {
    @{ Success = $false; Error = "Failed to parse parameters file: $($_.Exception.Message)" } | ConvertTo-Json
    exit 1
}
finally {
    if (Test-Path $ParamsFile) {
        Remove-Item $ParamsFile -Force -ErrorAction SilentlyContinue
    }
}

# ── 2. Load dependencies ─────────────────────────────────────────────────────
$scriptRoot = $PSScriptRoot
$credManagerPath = Join-Path $scriptRoot "CredentialManager.ps1"

if (Test-Path $credManagerPath) {
    . $credManagerPath
}

# ── 3. Get stored credentials ────────────────────────────────────────────────
$credential = Get-StoredCredential -Target "ADHelper_AdminCred"
if (-not $credential) {
    @{ Success = $false; Error = "No stored credentials found. Please configure credentials in Settings." } | ConvertTo-Json
    exit 1
}

# ── 4. Import Active Directory module ────────────────────────────────────────
try {
    Import-Module ActiveDirectory -ErrorAction Stop
}
catch {
    @{ Success = $false; Error = "ActiveDirectory module not available: $($_.Exception.Message)" } | ConvertTo-Json
    exit 1
}

# ── 5. Parse usernames from params ───────────────────────────────────────────
$usernames = @()
if ($params.usernames -and $params.usernames.Count -gt 0) {
    $usernames = @($params.usernames)
}

if ($usernames.Count -eq 0) {
    @{ Success = $false; Error = "No usernames provided." } | ConvertTo-Json
    exit 1
}

$targetOU = "OU=Non-Rehrig,OU=Accounts,DC=RPL,DC=Local"
$contractorSuffix = " - Contractor"
$totalUsers = $usernames.Count

# Statistics tracking
$stats = @{
    TotalProcessed = 0
    UsersFound = 0
    UsersSkipped = 0
    UsersInCorrectOU = 0
    UsersWrongOU = 0
    DisplayNamesUpdated = 0
    DisplayNamesAlreadyCorrect = 0
    ExpirationsExtended = 0
    Errors = 0
}

# Per-user results array
$userResults = @()

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Contractor Account Processing" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Users to process: $totalUsers" -ForegroundColor White
Write-Host "  Target OU: $targetOU" -ForegroundColor Gray
Write-Host "  Display Name Suffix: '$contractorSuffix'" -ForegroundColor Gray
Write-Host ""

# ── 6. Process each user ─────────────────────────────────────────────────────
for ($i = 0; $i -lt $usernames.Count; $i++) {
    $samAccountName = $usernames[$i].Trim()
    $stats.TotalProcessed++

    # Handle email addresses - extract username portion
    if ($samAccountName -like "*@*") {
        $samAccountName = ($samAccountName -split "@")[0]
    }

    if ([string]::IsNullOrWhiteSpace($samAccountName)) {
        Write-Host "Skipping empty username at position $($i + 1)" -ForegroundColor Yellow
        $stats.UsersSkipped++
        continue
    }

    $userResult = @{
        Username = $samAccountName
        Status = "Pending"
        DisplayNameUpdated = $false
        ExpirationExtended = $false
        Error = $null
    }

    Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "Processing user $($i + 1) of $totalUsers : $samAccountName" -ForegroundColor Cyan
    Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray

    # Step 1: Validate user exists in AD
    $user = $null
    try {
        $user = Get-ADUser -Identity $samAccountName `
            -Properties AccountExpirationDate, DisplayName, Enabled, DistinguishedName `
            -Credential $credential -ErrorAction Stop
        Write-Host "  Found user: $($user.DisplayName) ($samAccountName)" -ForegroundColor Green
        $enabled = if ($user.Enabled) { "Yes" } else { "No" }
        Write-Host "  Account Enabled: $enabled" -ForegroundColor $(if ($user.Enabled) { 'Green' } else { 'Yellow' })
        $stats.UsersFound++
    }
    catch {
        Write-Host "  ERROR: User '$samAccountName' not found or error: $($_.Exception.Message)" -ForegroundColor Red
        $stats.Errors++
        $userResult.Status = "Error"
        $userResult.Error = "User not found: $($_.Exception.Message)"
        $userResults += $userResult
        continue
    }

    # Step 2: OU Verification
    Write-Host ""
    Write-Host "  --- OU Verification ---" -ForegroundColor Magenta
    $userDN = $user.DistinguishedName
    $isInTargetOU = $userDN -like "*$targetOU*"

    if ($isInTargetOU) {
        Write-Host "  User is in the correct OU (Non-Rehrig)" -ForegroundColor Green
        $stats.UsersInCorrectOU++
    } else {
        $currentOUMatch = $userDN -replace "^CN=[^,]+,", ""
        Write-Host "  WARNING: User '$samAccountName' is NOT in the Non-Rehrig OU" -ForegroundColor Yellow
        Write-Host "    Current Location: $currentOUMatch" -ForegroundColor Gray
        Write-Host "    Required OU: $targetOU" -ForegroundColor Gray
        Write-Host "  Skipping user (wrong OU)" -ForegroundColor Yellow
        $stats.UsersWrongOU++
        $stats.UsersSkipped++
        $userResult.Status = "Skipped"
        $userResult.Error = "User not in Non-Rehrig OU. Current: $currentOUMatch"
        $userResults += $userResult
        continue
    }

    # Step 3: Display Name Verification & Update
    Write-Host ""
    Write-Host "  --- Display Name Check ---" -ForegroundColor Magenta
    $currentDisplayName = $user.DisplayName

    if ($currentDisplayName -like "*$contractorSuffix") {
        Write-Host "  Display name already ends with '$contractorSuffix'" -ForegroundColor Green
        Write-Host "    Current: $currentDisplayName" -ForegroundColor Gray
        $stats.DisplayNamesAlreadyCorrect++
    } else {
        $newDisplayName = "$currentDisplayName$contractorSuffix"
        Write-Host "  Updating display name..." -ForegroundColor Cyan
        Write-Host "    From: $currentDisplayName" -ForegroundColor Gray
        Write-Host "    To:   $newDisplayName" -ForegroundColor Cyan

        try {
            Set-ADUser -Identity $samAccountName -DisplayName $newDisplayName -Credential $credential -ErrorAction Stop
            Write-Host "  Display name updated successfully!" -ForegroundColor Green
            $stats.DisplayNamesUpdated++
            $userResult.DisplayNameUpdated = $true
        }
        catch {
            Write-Host "  ERROR: Failed to update display name: $($_.Exception.Message)" -ForegroundColor Red
            $stats.Errors++
        }
    }

    # Step 4: Set Account Expiration to 1 Year from Today
    Write-Host ""
    Write-Host "  --- Account Expiration ---" -ForegroundColor Magenta

    try {
        # Refresh user to get current expiration
        $user = Get-ADUser -Identity $samAccountName -Properties AccountExpirationDate -Credential $credential -ErrorAction Stop
        $currentExpiration = $user.AccountExpirationDate

        if ($null -ne $currentExpiration) {
            Write-Host "    Current Expiration: $($currentExpiration.ToString('yyyy-MM-dd'))" -ForegroundColor Gray
        } else {
            Write-Host "    Current Expiration: None (never expires)" -ForegroundColor Gray
        }

        $newExpiration = (Get-Date).AddYears(1)
        Write-Host "    New Expiration: $($newExpiration.ToString('yyyy-MM-dd'))" -ForegroundColor Green

        Set-ADAccountExpiration -Identity $samAccountName -DateTime $newExpiration -Credential $credential -ErrorAction Stop
        Write-Host "  Account expiration extended successfully!" -ForegroundColor Green
        $stats.ExpirationsExtended++
        $userResult.ExpirationExtended = $true
        $userResult.Status = "Success"
    }
    catch {
        Write-Host "  ERROR: Failed to set account expiration: $($_.Exception.Message)" -ForegroundColor Red
        $stats.Errors++
        $userResult.Error = "Failed to set expiration: $($_.Exception.Message)"
        $userResult.Status = "PartialError"
    }

    $userResults += $userResult
}

# ── 7. Display Summary ───────────────────────────────────────────────────────
Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Processing Summary" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Total users in input:           $totalUsers" -ForegroundColor White
Write-Host "  Users found & processed:        $($stats.UsersFound)" -ForegroundColor Green
Write-Host "  Users skipped:                  $($stats.UsersSkipped)" -ForegroundColor Yellow
Write-Host ""
Write-Host "  OU Verification:" -ForegroundColor White
Write-Host "    In Non-Rehrig OU:             $($stats.UsersInCorrectOU)" -ForegroundColor Green
Write-Host "    Not in required OU:           $($stats.UsersWrongOU)" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Display Name Changes:" -ForegroundColor White
Write-Host "    Already correct:              $($stats.DisplayNamesAlreadyCorrect)" -ForegroundColor Gray
Write-Host "    Updated with ' - Contractor': $($stats.DisplayNamesUpdated)" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Expirations extended:           $($stats.ExpirationsExtended)" -ForegroundColor Cyan

if ($stats.Errors -gt 0) {
    Write-Host ""
    Write-Host "  Errors encountered:             $($stats.Errors)" -ForegroundColor Red
}

Write-Host ""

# ── 8. Output JSON result ────────────────────────────────────────────────────
@{
    Success = ($stats.Errors -eq 0)
    Stats = $stats
    UserResults = $userResults
} | ConvertTo-Json -Depth 3

