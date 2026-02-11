# ADConfig.psm1 — Loads externalized ADHelper configuration
# Usage:
#   Import-Module "$PSScriptRoot\ADConfig.psm1" -Force
#   $cfg = Get-ADHelperConfig
#   $cfg.standardGroups          # array of group DNs
#   $cfg.mfaBlockingGroup        # single group DN
#   $cfg.proxyAddressTemplates   # proxy address template objects
#   $cfg.contractor.targetOU     # contractor OU
#
# Config file locations searched (in order):
#   1. %APPDATA%\adhelper-app\adhelper-config.json   (user override)
#   2. <repo-root>\config\adhelper-config.json        (bundled default)
#   3. <process.resourcesPath>\config\adhelper-config.json (installed app)

$script:ADHelperConfig = $null

function Get-ADHelperConfig {
    [CmdletBinding()]
    param()

    if ($null -ne $script:ADHelperConfig) {
        return $script:ADHelperConfig
    }

    $configPaths = @(
        # User override
        (Join-Path $env:APPDATA "adhelper-app\adhelper-config.json"),
        # Dev: repo root (scripts/../config)
        (Join-Path (Split-Path $PSScriptRoot -Parent) "config\adhelper-config.json"),
        # Installed: resources/config
        (Join-Path $PSScriptRoot "..\config\adhelper-config.json")
    )

    $configFile = $null
    foreach ($p in $configPaths) {
        if (Test-Path $p) {
            $configFile = $p
            break
        }
    }

    if (-not $configFile) {
        Write-Warning "ADHelper config file not found. Searched: $($configPaths -join ', ')"
        return $null
    }

    try {
        $script:ADHelperConfig = Get-Content $configFile -Raw | ConvertFrom-Json
        return $script:ADHelperConfig
    }
    catch {
        Write-Warning "Failed to parse ADHelper config: $($_.Exception.Message)"
        return $null
    }
}

function Get-ProxyAddresses {
    <#
    .SYNOPSIS
        Generates proxy addresses for a username using the externalized config templates.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [string]$SamAccountName
    )

    $cfg = Get-ADHelperConfig
    if (-not $cfg -or -not $cfg.proxyAddressTemplates) {
        Write-Warning "No proxy address templates in config, falling back to empty"
        return @()
    }

    $lower = $SamAccountName.ToLower()
    $titleCase = (Get-Culture).TextInfo.ToTitleCase($lower)

    $addresses = @()
    foreach ($tpl in $cfg.proxyAddressTemplates) {
        switch ($tpl.casing) {
            "lower"     { $user = $lower }
            "titleCase" { $user = $titleCase }
            default     { $user = $lower }
        }
        $addresses += "$($tpl.prefix):$user@$($tpl.domain)"
    }

    return $addresses
}

Export-ModuleMember -Function Get-ADHelperConfig, Get-ProxyAddresses

