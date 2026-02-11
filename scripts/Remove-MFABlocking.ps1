# Remove-MFABlocking.ps1
# Self-contained bridge script for MFA blocking group removal
# Called with -File parameter to prevent command injection
#
# NOTE: This script does NOT dot-source ADhelper.ps1 because that file
# contains interactive code (Read-Host, menu loops) that hangs when
# spawned from Node.js in non-interactive mode.

param (
    [Parameter(Mandatory=$true)]
    [string]$Username
)

$ErrorActionPreference = "Stop"

# ── 0. Structured logging ──────────────────────────────────────────────────
Import-Module "$PSScriptRoot\PSLogger.psm1" -Force
Initialize-PSLogger -ScriptName "Remove-MFABlocking"
Write-PSLog -Level "INFO" -Message "Script started" -Data @{ username = $Username }

# ── 1. Configuration ────────────────────────────────────────────────────────
# Load externalized config for MFA blocking group
Import-Module "$PSScriptRoot\ADConfig.psm1" -Force -ErrorAction SilentlyContinue
$adConfig = Get-ADHelperConfig -ErrorAction SilentlyContinue
$mfaBlockingGroupEncoded = if ($adConfig -and $adConfig.mfaBlockingGroup) { $adConfig.mfaBlockingGroup } else { "CN=MFA_registration_blocking,OU=Security%20Groups,DC=RPL,DC=Local" }

# ── 2. Load System.Web for URL decoding ─────────────────────────────────────
try {
    Add-Type -AssemblyName System.Web -ErrorAction Stop
}
catch {
    Write-PSLog -Level "ERROR" -Message "Failed to load System.Web assembly" -Data @{ error = $_.Exception.Message }
    @{ Success = $false; Error = "Failed to load System.Web assembly: $($_.Exception.Message)" } | ConvertTo-Json
    exit 0
}

$mfaBlockingGroup = [System.Web.HttpUtility]::UrlDecode($mfaBlockingGroupEncoded)

# ── 3. Load CredentialManager and get stored credentials ────────────────────
# IMPORTANT: Save $Username BEFORE dot-sourcing CredentialManager.ps1 because
# that script has its own $Username parameter that would overwrite ours.
$targetUsername = $Username

$scriptRoot = $PSScriptRoot
$credManagerPath = Join-Path $scriptRoot "CredentialManager.ps1"

if (Test-Path $credManagerPath) {
    . $credManagerPath
}
else {
    Write-PSLog -Level "ERROR" -Message "CredentialManager.ps1 not found" -Data @{ path = $credManagerPath }
    @{ Success = $false; Error = "CredentialManager.ps1 not found at: $credManagerPath" } | ConvertTo-Json
    exit 0
}

$credential = Get-StoredCredential -Target "ADHelper_AdminCred"
if (-not $credential) {
    Write-PSLog -Level "ERROR" -Message "No stored credentials found"
    @{ Success = $false; Error = "No stored credentials found. Please configure credentials in Settings." } | ConvertTo-Json
    exit 0
}
Write-PSLog -Level "DEBUG" -Message "Credentials loaded successfully"

# ── 4. Import Active Directory module ───────────────────────────────────────
try {
    Import-Module ActiveDirectory -ErrorAction Stop
}
catch {
    Write-PSLog -Level "ERROR" -Message "ActiveDirectory module not available" -Data @{ error = $_.Exception.Message }
    @{ Success = $false; Error = "ActiveDirectory module not available: $($_.Exception.Message)" } | ConvertTo-Json
    exit 0
}

# ── 5. Perform MFA Blocking Group Removal ───────────────────────────────────
# Strip @domain.com if email format was passed (defense-in-depth; main.ts also strips)
if ($targetUsername -match '@') {
    $original = $targetUsername
    $targetUsername = ($targetUsername -split '@')[0]
    Write-PSLog -Level "INFO" -Message "Stripped email domain" -Data @{ original = $original; resolved = $targetUsername }
    Write-Host "Stripped email domain, using sAMAccountName: $targetUsername" -ForegroundColor Yellow
}

Write-Host "`n=== MFA Blocking Group Removal ===" -ForegroundColor Cyan
Write-Host "Target Group: $mfaBlockingGroup" -ForegroundColor Gray
Write-Host "Username: $targetUsername" -ForegroundColor Cyan

try {
    # Get user with MemberOf property
    $user = Get-ADUser -Identity $targetUsername -Properties MemberOf, DisplayName -Credential $credential -ErrorAction Stop

    Write-Host "User found: $($user.DisplayName) ($targetUsername)" -ForegroundColor Cyan

    # Check if user is in the MFA blocking group
    $isInGroup = $user.MemberOf | Where-Object { $_ -eq $mfaBlockingGroup }

    if ($isInGroup) {
        Write-Host "  WARNING User IS in MFA Blocking group. Proceeding with removal..." -ForegroundColor Yellow

        # Remove from group
        Remove-ADGroupMember -Identity $mfaBlockingGroup -Members $targetUsername -Credential $credential -Confirm:$false -ErrorAction Stop
        Write-PSLog -Level "INFO" -Message "User removed from MFA Blocking group" -Data @{ user = $targetUsername; displayName = $user.DisplayName }
        Write-Host "  SUCCESS User successfully removed from MFA Blocking group" -ForegroundColor Green

        @{
            Success        = $true
            WasInGroup     = $true
            Message        = "User removed from MFA Blocking group"
            ErrorType      = $null
            SamAccountName = $targetUsername
            DisplayName    = $user.DisplayName
        } | ConvertTo-Json -Depth 5
    }
    else {
        Write-PSLog -Level "INFO" -Message "User not in MFA Blocking group, no action needed" -Data @{ user = $targetUsername }
        Write-Host "  INFO User is NOT in MFA Blocking group - no action needed" -ForegroundColor Green

        @{
            Success        = $true
            WasInGroup     = $false
            Message        = "User is not a member of the MFA Blocking group"
            ErrorType      = $null
            SamAccountName = $targetUsername
            DisplayName    = $user.DisplayName
        } | ConvertTo-Json -Depth 5
    }
}
catch [Microsoft.ActiveDirectory.Management.ADIdentityNotFoundException] {
    Write-PSLog -Level "ERROR" -Message "User not found in AD" -Data @{ user = $targetUsername }
    Write-Host "  ERROR User '$targetUsername' not found in Active Directory." -ForegroundColor Red
    @{
        Success        = $false
        WasInGroup     = $false
        Message        = "User not found in Active Directory"
        ErrorType      = "UserNotFound"
        SamAccountName = $targetUsername
    } | ConvertTo-Json -Depth 5
    exit 0
}
catch {
    $errorMessage = $_.Exception.Message
    $errorType = "Unknown"
    Write-PSLog -Level "ERROR" -Message "MFA removal failed" -Data @{ user = $targetUsername; error = $errorMessage }

    # Detect credential/authentication errors
    if ($errorMessage -match "Access is denied|password|credential|authentication|logon|unauthorized|permission" -or
        $_.Exception.GetType().Name -match "UnauthorizedAccess|Authentication|Security") {
        $errorType = "CredentialError"
        Write-Host "  ERROR Credential/Authentication Error" -ForegroundColor Red
        Write-Host "     Your admin credentials may be invalid or expired." -ForegroundColor Yellow
    }
    # Detect group not found errors
    elseif ($errorMessage -match "Cannot find an object with identity|group.*not found") {
        $errorType = "GroupNotFound"
        Write-Host "  ERROR MFA Blocking group not found in Active Directory." -ForegroundColor Red
    }
    # Generic error
    else {
        Write-Host "  ERROR Failed to process MFA Blocking group removal: $errorMessage" -ForegroundColor Red
    }

    @{
        Success        = $false
        WasInGroup     = $false
        Message        = $errorMessage
        ErrorType      = $errorType
        SamAccountName = $targetUsername
    } | ConvertTo-Json -Depth 5
    exit 0
}

