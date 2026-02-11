# PSLogger.psm1 — Structured JSON logging module for ADHelper bridge scripts
# Usage:
#   Import-Module "$PSScriptRoot\PSLogger.psm1" -Force
#   Initialize-PSLogger -ScriptName "Remove-MFABlocking"
#   Write-PSLog -Level "INFO" -Message "Starting operation" -Data @{ user = "jsmith" }
#
# Logs are written to %APPDATA%\adhelper-app\logs\adhelper-ps.log as one JSON
# object per line (JSON Lines format) for easy parsing.

$script:PSLoggerFile = $null
$script:PSLoggerScriptName = "Unknown"

function Initialize-PSLogger {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [string]$ScriptName
    )

    $script:PSLoggerScriptName = $ScriptName

    try {
        $logDir = Join-Path $env:APPDATA "adhelper-app\logs"
        if (-not (Test-Path $logDir)) {
            New-Item -ItemType Directory -Path $logDir -Force | Out-Null
        }
        $script:PSLoggerFile = Join-Path $logDir "adhelper-ps.log"

        # Rotate if over 5 MB
        if ((Test-Path $script:PSLoggerFile) -and (Get-Item $script:PSLoggerFile).Length -gt 5MB) {
            $rotated = "$($script:PSLoggerFile).1"
            if (Test-Path $rotated) { Remove-Item $rotated -Force -ErrorAction SilentlyContinue }
            Rename-Item $script:PSLoggerFile $rotated -Force -ErrorAction SilentlyContinue
        }
    }
    catch {
        # Non-fatal — logging should never break the script
        $script:PSLoggerFile = $null
    }
}

function Write-PSLog {
    [CmdletBinding()]
    param(
        [ValidateSet("DEBUG","INFO","WARN","ERROR")]
        [string]$Level = "INFO",

        [Parameter(Mandatory=$true)]
        [string]$Message,

        [hashtable]$Data = @{}
    )

    $entry = @{
        timestamp  = (Get-Date -Format "o")
        level      = $Level
        script     = $script:PSLoggerScriptName
        message    = $Message
    }

    if ($Data.Count -gt 0) {
        $entry["data"] = $Data
    }

    $json = $entry | ConvertTo-Json -Depth 5 -Compress

    if ($script:PSLoggerFile) {
        try {
            Add-Content -Path $script:PSLoggerFile -Value $json -Encoding UTF8 -ErrorAction SilentlyContinue
        }
        catch {
            # Swallow
        }
    }
}

Export-ModuleMember -Function Initialize-PSLogger, Write-PSLog

