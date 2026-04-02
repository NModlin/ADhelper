#Requires -Modules ActiveDirectory

<#
.SYNOPSIS
    Updates the DisplayName (and GivenName) of an Active Directory user account.

.DESCRIPTION
    Non-interactive (IPC) mode: supply -ParamsFile with a JSON file containing
    "samAccountName" and "newDisplayName". The script applies the change and
    outputs a JSON result object, then exits.

    Interactive mode: run without -ParamsFile. Prompts for sAMAccountName and
    new DisplayName in a loop, allowing multiple accounts to be updated per
    session. All changes are appended to a persistent log file.

.PARAMETER ParamsFile
    Optional. Path to a JSON temp file produced by the Electron main process.
    When supplied the script runs non-interactively and exits after one update.

.NOTES
    Requires the ActiveDirectory PowerShell module (RSAT or AD DS role).
    Uses stored credentials from Windows Credential Manager (ADHelper_AdminCred).
#>

param (
    [Parameter(Mandatory=$false)]
    [string]$ParamsFile
)

# ──────────────────────────────────────────────
#  Configuration
# ──────────────────────────────────────────────

# Log file lives next to the script and persists across sessions.
$LogFile = Join-Path -Path $PSScriptRoot -ChildPath "ADDisplayName_Changes.log"

# ──────────────────────────────────────────────
#  Load stored credentials
# ──────────────────────────────────────────────
$credManagerPath = Join-Path $PSScriptRoot "CredentialManager.ps1"
if (Test-Path $credManagerPath) {
    . $credManagerPath
} else {
    Write-Host "ERROR: CredentialManager.ps1 not found at: $credManagerPath" -ForegroundColor Red
    exit 1
}

$credential = Get-StoredCredential -Target "ADHelper_AdminCred"
if (-not $credential) {
    Write-Host "ERROR: No stored credentials found. Please configure credentials in Settings." -ForegroundColor Red
    exit 1
}

# ──────────────────────────────────────────────
#  Helper: Write to console AND log file
# ──────────────────────────────────────────────
function Write-Log {
    param(
        [string]$Message,
        [ValidateSet("INFO","SUCCESS","WARNING","ERROR")]
        [string]$Level = "INFO"
    )

    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogEntry  = "[$Timestamp] [$Level] $Message"

    # Append to persistent log file
    Add-Content -Path $LogFile -Value $LogEntry -Encoding UTF8

    # Color-coded console output
    switch ($Level) {
        "SUCCESS" { Write-Host $LogEntry -ForegroundColor Green  }
        "WARNING" { Write-Host $LogEntry -ForegroundColor Yellow }
        "ERROR"   { Write-Host $LogEntry -ForegroundColor Red    }
        default   { Write-Host $LogEntry -ForegroundColor Cyan   }
    }
}

# ──────────────────────────────────────────────
#  Helper: Parse GivenName from a DisplayName
#  Returns the first "word" (everything before
#  the first space, or the whole string if no
#  space is present).
# ──────────────────────────────────────────────
function Get-GivenNameFromDisplayName {
    param([string]$DisplayName)

    $Parts = $DisplayName.Trim() -split '\s+', 2
    return $Parts[0]
}

# ──────────────────────────────────────────────
#  Non-interactive (IPC / params-file) mode
# ──────────────────────────────────────────────
if (-not [string]::IsNullOrWhiteSpace($ParamsFile)) {

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

    $SAM            = ($params.samAccountName -as [string]).Trim()
    $NewDisplayName = ($params.newDisplayName  -as [string]).Trim()

    if ([string]::IsNullOrWhiteSpace($SAM)) {
        @{ Success = $false; Error = "samAccountName is required." } | ConvertTo-Json
        exit 1
    }
    if ([string]::IsNullOrWhiteSpace($NewDisplayName)) {
        @{ Success = $false; Error = "newDisplayName is required." } | ConvertTo-Json
        exit 1
    }

    Write-Host "Looking up account: $SAM" -ForegroundColor Cyan

    try {
        $ADUser = Get-ADUser -Identity $SAM -Properties DisplayName, GivenName, SurName -Credential $credential -ErrorAction Stop
    }
    catch [Microsoft.ActiveDirectory.Management.ADIdentityNotFoundException] {
        @{ Success = $false; Error = "Account not found: $SAM" } | ConvertTo-Json
        exit 1
    }
    catch {
        @{ Success = $false; Error = "Error querying AD for '$SAM': $($_.Exception.Message)" } | ConvertTo-Json
        exit 1
    }

    $OldDisplayName = $ADUser.DisplayName
    $NewGivenName   = Get-GivenNameFromDisplayName -DisplayName $NewDisplayName

    Write-Host "Updating DisplayName: '$OldDisplayName' → '$NewDisplayName'" -ForegroundColor Cyan
    Write-Host "Derived GivenName: '$NewGivenName'" -ForegroundColor Cyan

    try {
        Set-ADUser -Identity $SAM -DisplayName $NewDisplayName -GivenName $NewGivenName -Credential $credential -ErrorAction Stop

        $LogEntry = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] [SUCCESS] $SAM | DisplayName changed from '$OldDisplayName' to '$NewDisplayName' | GivenName set to '$NewGivenName' | Changed by: $env:USERNAME"
        Add-Content -Path $LogFile -Value $LogEntry -Encoding UTF8

        Write-Host "✅ DisplayName updated successfully." -ForegroundColor Green

        @{
            Success        = $true
            SamAccountName = $SAM
            OldDisplayName = $OldDisplayName
            NewDisplayName = $NewDisplayName
            NewGivenName   = $NewGivenName
            Message        = "DisplayName updated successfully"
        } | ConvertTo-Json
        exit 0
    }
    catch {
        $LogEntry = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] [ERROR] Failed to update $SAM - $($_.Exception.Message)"
        Add-Content -Path $LogFile -Value $LogEntry -Encoding UTF8

        @{ Success = $false; Error = "Failed to update DisplayName for '$SAM': $($_.Exception.Message)" } | ConvertTo-Json
        exit 1
    }
}

# ──────────────────────────────────────────────
#  Session header in log
# ──────────────────────────────────────────────
$SessionStart = "=" * 60
Add-Content -Path $LogFile -Value $SessionStart              -Encoding UTF8
Add-Content -Path $LogFile -Value "  SESSION STARTED: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  |  User: $env:USERNAME  |  Host: $env:COMPUTERNAME" -Encoding UTF8
Add-Content -Path $LogFile -Value $SessionStart              -Encoding UTF8

Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "   AD DisplayName Update Utility" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  Log file: $LogFile"
Write-Host ""

# ──────────────────────────────────────────────
#  Main loop — allows updating multiple accounts
#  without re-running the script
# ──────────────────────────────────────────────
do {

    # ── Step 1: Get sAMAccountName ────────────
    do {
        $SAM = (Read-Host "Enter sAMAccountName (or 'Q' to quit)").Trim()

        if ($SAM -eq 'Q' -or $SAM -eq 'q') {
            Write-Log "Operator chose to quit." "INFO"
            Write-Host "`nExiting. Log saved to: $LogFile`n" -ForegroundColor Magenta
            exit 0
        }

        if ([string]::IsNullOrWhiteSpace($SAM)) {
            Write-Host "  [!] sAMAccountName cannot be blank. Please try again." -ForegroundColor Yellow
        }

    } until (-not [string]::IsNullOrWhiteSpace($SAM))

    Write-Log "Looking up account: $SAM"

    # ── Step 2: Verify account exists ─────────
    try {
        $ADUser = Get-ADUser -Identity $SAM -Properties DisplayName, GivenName, SurName, DistinguishedName -Credential $credential -ErrorAction Stop
    }
    catch [Microsoft.ActiveDirectory.Management.ADIdentityNotFoundException] {
        Write-Log "Account NOT FOUND: $SAM" "ERROR"
        Write-Host ""
        continue   # loop back to prompt for another sAMAccountName
    }
    catch {
        Write-Log "Unexpected error querying AD for '$SAM': $_" "ERROR"
        Write-Host ""
        continue
    }

    # Account found — show current values
    Write-Log "Account found: $SAM | Current DisplayName: '$($ADUser.DisplayName)' | GivenName: '$($ADUser.GivenName)' | Surname: '$($ADUser.SurName)'" "INFO"
    Write-Host ""
    Write-Host "  Account        : $SAM" -ForegroundColor White
    Write-Host "  Distinguished  : $($ADUser.DistinguishedName)" -ForegroundColor White
    Write-Host "  Current DisplayName : $($ADUser.DisplayName)" -ForegroundColor White
    Write-Host "  Current GivenName   : $($ADUser.GivenName)" -ForegroundColor White
    Write-Host "  Current Surname     : $($ADUser.SurName)" -ForegroundColor White
    Write-Host ""

    # ── Step 3: Get new DisplayName ───────────
    do {
        $NewDisplayName = (Read-Host "Enter new DisplayName (spaces allowed, e.g. 'Jane Smith')").Trim()

        if ([string]::IsNullOrWhiteSpace($NewDisplayName)) {
            Write-Host "  [!] DisplayName cannot be blank. Please try again." -ForegroundColor Yellow
        }

    } until (-not [string]::IsNullOrWhiteSpace($NewDisplayName))

    # Derive GivenName from the new DisplayName
    $NewGivenName = Get-GivenNameFromDisplayName -DisplayName $NewDisplayName

    Write-Host ""
    Write-Host "  New DisplayName : $NewDisplayName" -ForegroundColor White
    Write-Host "  Derived GivenName will be set to: $NewGivenName" -ForegroundColor White
    Write-Host ""

    # ── Step 4: Confirm before applying ───────
    $Confirm = (Read-Host "Apply these changes? (Y/N)").Trim().ToUpper()

    if ($Confirm -ne 'Y') {
        Write-Log "Change CANCELLED by operator for account: $SAM" "WARNING"
        Write-Host ""
        continue
    }

    # ── Step 5: Apply the change ───────────────
    try {
        Set-ADUser -Identity $SAM -DisplayName $NewDisplayName -GivenName $NewGivenName -Credential $credential -ErrorAction Stop

        Write-Log "SUCCESS - $SAM | DisplayName changed from '$($ADUser.DisplayName)' to '$NewDisplayName' | GivenName set to '$NewGivenName' | Changed by: $env:USERNAME" "SUCCESS"
        Write-Host ""
    }
    catch {
        Write-Log "FAILED to update $SAM - Error: $_" "ERROR"
        Write-Host ""
    }

    # ── Step 6: Continue or quit ───────────────
    $Another = (Read-Host "Update another account? (Y/N)").Trim().ToUpper()
    Write-Host ""

} while ($Another -eq 'Y')

# ── Session footer ─────────────────────────────
Write-Log "Session ended by: $env:USERNAME" "INFO"
Add-Content -Path $LogFile -Value "" -Encoding UTF8

Write-Host "Done. Log saved to: $LogFile`n" -ForegroundColor Magenta