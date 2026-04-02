<#
.SYNOPSIS
    Pulls Adaxes activity/management history for the four affected lockout accounts.

.DESCRIPTION
    Connects to the Adaxes service using your credentials and retrieves all
    operations performed ON each affected account (management history) over
    the past 30 days. This tells us if Adaxes has any automated business rules
    or scheduled tasks acting on these accounts.

.NOTES
    Requires the Adaxes PowerShell module to be installed.
    Run as a user with Adaxes read access.
#>

param (
    [string]$AdaxesHost = "localhost",   # Change to your Adaxes server hostname if running remotely
    [int]$DaysBack      = 30,
    [string]$OutputDir  = ".\AdaxesAudit"
)

# -- Accounts to investigate ---------------------------------------------------
$AffectedUsers = @("jbarry", "rmartin", "shoover", "DWhitaker")

# -- Setup ---------------------------------------------------------------------
Import-Module Adaxes -ErrorAction Stop

if (-not (Test-Path $OutputDir)) { New-Item -ItemType Directory -Path $OutputDir | Out-Null }
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

# -- Connect to Adaxes service -------------------------------------------------
Write-Host "`nConnecting to Adaxes service on $AdaxesHost..." -ForegroundColor Cyan
$Credential = Get-Credential -Message "Enter your Adaxes admin credentials"

try {
    $ns      = New-Object "Softerra.Adaxes.Adsi.AdmNamespace"
    $service = $ns.GetServiceDirectly($AdaxesHost)
} catch {
    Write-Host "Failed to connect to Adaxes service: $_" -ForegroundColor Red
    exit
}

Write-Host "Connected. Querying management history for affected accounts...`n" -ForegroundColor Green

# -- Pull management history for each user -------------------------------------
$AllRecords = [System.Collections.Generic.List[PSObject]]::new()

foreach ($Username in $AffectedUsers) {
    Write-Host "  Pulling history for: $Username" -ForegroundColor White

    try {
        # Find the user object in AD via Adaxes
        $User = Get-ADUser -Identity $Username -ErrorAction Stop

        # Bind to the user object through Adaxes to get management history
        $UserPath = "Adaxes://$AdaxesHost/" + $User.DistinguishedName
        $AdaxesUser = $service.OpenObject($UserPath, $Credential.UserName,
                                          $Credential.GetNetworkCredential().Password, 0)

        # Get the management history (operations performed ON this account)
        $History = $AdaxesUser.GetEx("managementHistory") 2>$null

        if ($History) {
            $History | ForEach-Object {
                $AllRecords.Add([PSCustomObject]@{
                    Username    = $Username
                    Time        = $_.CompletionTime
                    Initiator   = $_.Initiator.Name
                    Operation   = $_.Description
                    Status      = if ($_.IsSuccessful) { "Success" } else { "Failed" }
                })
            }
        }
    } catch {
        Write-Warning "  Could not pull history for $Username -- $_"
    }
}

# -- If management history via ADSI didn't work, fall back to general log ------
# The general log approach filters by target object name
if ($AllRecords.Count -eq 0) {
    Write-Host "`nManagement history returned empty. Falling back to general log search...`n" -ForegroundColor Yellow

    try {
        $LogPath    = $service.Backend.GetConfigurationContainerPath("ServiceLog")
        $ServiceLog = $service.OpenObject($LogPath.ToString(),
                                          $Credential.UserName,
                                          $Credential.GetNetworkCredential().Password, 0)
        $GeneralLog = $ServiceLog.GeneralLog
        $GeneralLog.StartDateTime = (Get-Date).AddDays(-$DaysBack)
        $GeneralLog.EndDateTime   = Get-Date

        $Log     = $GeneralLog.Log
        $Records = $Log.GetPage(0)

        foreach ($Record in $Records) {
            # Filter to only records targeting our affected users
            if ($AffectedUsers | Where-Object { $Record.TargetObjectName -match $_ }) {
                $AllRecords.Add([PSCustomObject]@{
                    Username    = $Record.TargetObjectName
                    Time        = $Record.CompletionTime
                    Initiator   = $Record.Initiator.Name
                    Operation   = $Record.Description
                    Status      = if ($Record.IsSuccessful) { "Success" } else { "Failed" }
                })
            }
        }
    } catch {
        Write-Host "General log query also failed: $_" -ForegroundColor Red
        exit
    }
}

# -- Output -------------------------------------------------------------------
Write-Host "`n======================================================" -ForegroundColor Cyan
Write-Host "  ADAXES ACTIVITY LOG -- $(Get-Date -Format 'yyyy-MM-dd HH:mm')" -ForegroundColor Cyan
Write-Host "  Lookback: $DaysBack days | Accounts: $($AffectedUsers -join ', ')" -ForegroundColor Cyan
Write-Host "======================================================`n" -ForegroundColor Cyan

if ($AllRecords.Count -eq 0) {
    Write-Host "No Adaxes activity found for the affected accounts in the past $DaysBack days." -ForegroundColor Yellow
} else {
    foreach ($Username in $AffectedUsers) {
        $UserRecords = $AllRecords | Where-Object { $_.Username -match $Username } |
                       Sort-Object Time -Descending
        Write-Host "-- $Username ($($UserRecords.Count) operation(s)) ------" -ForegroundColor White
        if ($UserRecords) {
            $UserRecords | Format-Table -AutoSize Time, Initiator, Operation, Status
        } else {
            Write-Host "  No activity found.`n" -ForegroundColor DarkGray
        }
    }

    # Export to CSV
    $CsvPath = "$OutputDir\AdaxesActivity_$Timestamp.csv"
    $AllRecords | Sort-Object Username, Time |
        Export-Csv -Path $CsvPath -NoTypeInformation
    Write-Host "`nExported to: $CsvPath" -ForegroundColor Green
}

Write-Host "`nINVESTIGATION TIPS:" -ForegroundColor Magenta
Write-Host "  - Look for operations with Initiator = 'Adaxes Service' -- these are automated (business rules/scheduled tasks)" -ForegroundColor White
Write-Host "  - Any 'Unlock Account' or 'Reset Password' operations show Moveworks or Adaxes acting on these accounts" -ForegroundColor White
Write-Host "  - If no records exist, Adaxes has not touched these accounts -- narrows the source" -ForegroundColor White
