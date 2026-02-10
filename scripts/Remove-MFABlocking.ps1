# Remove-MFABlocking.ps1
# Bridge script for secure MFA blocking group removal
# Called with -File parameter to prevent command injection

param (
    [Parameter(Mandatory=$true)]
    [string]$Username
)

$ErrorActionPreference = "Continue"

# Determine script paths
$scriptRoot = $PSScriptRoot
$adHelperPath = Join-Path (Split-Path $scriptRoot -Parent) "ADhelper.ps1"
$credManagerPath = Join-Path $scriptRoot "CredentialManager.ps1"

# Validate ADhelper.ps1 exists
if (-not (Test-Path $adHelperPath)) {
    @{
        Success = $false
        Error = "ADhelper.ps1 not found at: $adHelperPath"
    } | ConvertTo-Json
    exit 1
}

# Dot-source ADhelper.ps1 to get Remove-UserFromMFABlocking function
. $adHelperPath

# Load credential manager and get stored credentials
if (Test-Path $credManagerPath) {
    . $credManagerPath
}

$credential = Get-StoredCredential -Target "ADHelper_AdminCred"
if (-not $credential) {
    @{
        Success = $false
        Error = "No stored credentials found. Please configure credentials in Settings."
    } | ConvertTo-Json
    exit 1
}

# Call the function with safely-passed parameter
# $Username is treated as a literal string by PowerShell's -File parameter parsing
try {
    $result = Remove-UserFromMFABlocking -SamAccountName $Username -Credential $credential
    $result | ConvertTo-Json -Depth 10
}
catch {
    @{
        Success = $false
        Error = $_.Exception.Message
    } | ConvertTo-Json
    exit 1
}

