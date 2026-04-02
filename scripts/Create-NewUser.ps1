# Create-NewUser.ps1
# Bridge script for secure new user creation
# Reads parameters from a JSON temp file to prevent command injection
# Called with: -File Create-NewUser.ps1 -ParamsFile <path-to-json>

param (
    [Parameter(Mandatory=$true)]
    [string]$ParamsFile
)

$ErrorActionPreference = "Continue"

# ── 0. Structured logging ──────────────────────────────────────────────────
Import-Module "$PSScriptRoot\PSLogger.psm1" -Force
Initialize-PSLogger -ScriptName "Create-NewUser"
Write-PSLog -Level "INFO" -Message "Script started" -Data @{ paramsFile = $ParamsFile }

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
    # Always delete temp file for security (contains no secrets, but good hygiene)
    if (Test-Path $ParamsFile) {
        Remove-Item $ParamsFile -Force -ErrorAction SilentlyContinue
    }
}

# ── 2. Load dependencies ─────────────────────────────────────────────────────
$scriptRoot = $PSScriptRoot
$adHelperPath = Join-Path (Split-Path $scriptRoot -Parent) "ADhelper.ps1"
$emailScriptPath = Join-Path $scriptRoot "Send-NewUserEmail.ps1"
$credManagerPath = Join-Path $scriptRoot "CredentialManager.ps1"

if (-not (Test-Path $adHelperPath)) {
    @{ Success = $false; Error = "ADhelper.ps1 not found at: $adHelperPath" } | ConvertTo-Json
    exit 1
}

. $adHelperPath

if (Test-Path $emailScriptPath) {
    . $emailScriptPath
}

if (Test-Path $credManagerPath) {
    . $credManagerPath
}

# ── 3. Get stored credentials ────────────────────────────────────────────────
$credential = Get-StoredCredential -Target "ADHelper_AdminCred"
if (-not $credential) {
    @{ Success = $false; Error = "No stored credentials found. Please configure credentials in Settings." } | ConvertTo-Json
    exit 1
}

# ── 4. Extract parameters from JSON ──────────────────────────────────────────
$userParams = @{
    FirstName         = $params.firstName
    LastName          = $params.lastName
    SamAccountName    = $params.username
    UserPrincipalName = "$($params.username)@rehrig.com"
    Path              = "OU=Rehrig,OU=Accounts,DC=RPL,DC=Local"
}

if (-not [string]::IsNullOrWhiteSpace($params.title))      { $userParams.Title = $params.title }
if (-not [string]::IsNullOrWhiteSpace($params.department))  { $userParams.Department = $params.department }

# Convert JSON arrays to PowerShell arrays
$siteGroups = @()
if ($params.siteGroups -and $params.siteGroups.Count -gt 0) {
    $siteGroups = @($params.siteGroups)
}

$jobProfileGroups = @()
if ($params.jobProfileGroups -and $params.jobProfileGroups.Count -gt 0) {
    $jobProfileGroups = @($params.jobProfileGroups)
}

$managerEmail = $params.managerEmail

# ── Manager lookup by display name ───────────────────────────────────────────
$managerDN = $null
$managerDisplayName = Read-Host "Enter manager's display name (optional, press Enter to skip)"
if (-not [string]::IsNullOrWhiteSpace($managerDisplayName)) {
    try {
        $managerMatches = @(Get-ADUser -Filter "DisplayName -eq '$managerDisplayName'" `
            -Properties DisplayName, EmailAddress, DistinguishedName `
            -Credential $credential -ErrorAction Stop)

        if ($managerMatches.Count -eq 0) {
            Write-Warning "No AD account found for display name '$managerDisplayName'. Proceeding with no manager set."
        }
        elseif ($managerMatches.Count -eq 1) {
            $managerDN = $managerMatches[0].DistinguishedName
            Write-Host "✅ Manager resolved: $($managerMatches[0].DisplayName) ($managerDN)" -ForegroundColor Green
        }
        else {
            Write-Host "Multiple users found with that display name:" -ForegroundColor Yellow
            foreach ($m in $managerMatches) {
                Write-Host "  - $($m.DisplayName) ($($m.EmailAddress))" -ForegroundColor Yellow
            }
            $disambigEmail = Read-Host "Multiple users found. Enter the manager's email address to disambiguate"
            $emailMatches = @($managerMatches | Where-Object { $_.EmailAddress -eq $disambigEmail })
            if ($emailMatches.Count -eq 1) {
                $managerDN = $emailMatches[0].DistinguishedName
                Write-Host "✅ Manager resolved: $($emailMatches[0].DisplayName) ($managerDN)" -ForegroundColor Green
            }
            else {
                Write-Warning "Could not resolve manager from email address. Proceeding with no manager set."
            }
        }
    }
    catch {
        Write-Warning "Manager lookup failed: $($_.Exception.Message). Proceeding with no manager set."
    }
}

if (-not [string]::IsNullOrWhiteSpace($managerDN)) { $userParams.Manager = $managerDN }

# ── 5. Create user ───────────────────────────────────────────────────────────
try {
    # Generate secure password
    $passwordLength = 12
    $allowedChars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*"
    $password = -join ((1..$passwordLength) | ForEach-Object { Get-Random -InputObject $allowedChars.ToCharArray() })
    $securePassword = ConvertTo-SecureString -String $password -AsPlainText -Force

    Write-PSLog -Level "INFO" -Message "Creating user account" -Data @{ sam = $userParams.SamAccountName; upn = $userParams.UserPrincipalName; ou = $userParams.Path }
    Write-Host "Creating user account..." -ForegroundColor Cyan
    New-ADUser -Name "$($userParams.FirstName) $($userParams.LastName)" `
        -GivenName $userParams.FirstName `
        -Surname $userParams.LastName `
        -SamAccountName $userParams.SamAccountName `
        -UserPrincipalName $userParams.UserPrincipalName `
        -Path $userParams.Path `
        -AccountPassword $securePassword `
        -Enabled $true `
        -ChangePasswordAtLogon $true `
        -Credential $credential `
        -ErrorAction Stop

    # Set optional properties
    if ($userParams.Title) {
        Set-ADUser -Identity $userParams.SamAccountName -Title $userParams.Title -Credential $credential -ErrorAction SilentlyContinue
    }
    if ($userParams.Department) {
        Set-ADUser -Identity $userParams.SamAccountName -Department $userParams.Department -Credential $credential -ErrorAction SilentlyContinue
    }
    if ($userParams.Manager) {
        Set-ADUser -Identity $userParams.SamAccountName -Manager $userParams.Manager -Credential $credential -ErrorAction SilentlyContinue
    }

    Write-PSLog -Level "INFO" -Message "User account created" -Data @{ sam = $userParams.SamAccountName }
    Write-Host "User account created successfully!" -ForegroundColor Green

    # ── 6. Add user to groups ────────────────────────────────────────────────
    Write-Host "`nAdding user to groups..." -ForegroundColor Cyan

    if ($siteGroups.Count -gt 0) {
        $groupSuccess = Add-UserToStandardGroups -SamAccountName $userParams.SamAccountName -Credential $credential -AdditionalGroups $siteGroups
    }
    else {
        $groupSuccess = Add-UserToStandardGroups -SamAccountName $userParams.SamAccountName -Credential $credential
    }

    if (-not $groupSuccess) {
        Write-Warning "Some groups failed to be added, but user was created successfully."
    }

    # Apply job profile groups individually with a status line per group
    if ($jobProfileGroups.Count -gt 0) {
        Write-Host "`nApplying job profile groups..." -ForegroundColor Cyan
        foreach ($group in $jobProfileGroups) {
            try {
                Add-ADGroupMember -Identity $group -Members $userParams.SamAccountName -Credential $credential -ErrorAction Stop
                Write-Host "✅ Added to group: $group" -ForegroundColor Green
            }
            catch {
                Write-Warning "Failed to add user to group '$group': $($_.Exception.Message)"
            }
        }
    }

    # ── 7. Send email to manager ─────────────────────────────────────────────
    $emailSent = $false
    $resolvedManagerEmail = $null

    # Priority 1: If Manager DN is provided, retrieve email from AD
    if (-not [string]::IsNullOrWhiteSpace($userParams.Manager)) {
        Write-Host "Retrieving manager email address from AD..." -ForegroundColor Cyan
        $resolvedManagerEmail = Get-ManagerEmailFromDN -ManagerDN $userParams.Manager -Credential $credential

        if ($resolvedManagerEmail) {
            Write-Host "Sending credentials to manager: $resolvedManagerEmail" -ForegroundColor Cyan
            $emailParams = @{
                EmployeeName = "$($userParams.FirstName) $($userParams.LastName)"
                EmailAddress = $userParams.UserPrincipalName
                TempPassword = $password
                ManagerEmail = $resolvedManagerEmail
                CreationDate = (Get-Date -Format "MMMM dd, yyyy 'at' hh:mm tt")
            }
            $emailSent = Send-NewUserCredentialEmail @emailParams
        }
        else {
            Write-Warning "Could not retrieve manager email from AD."
        }
    }

    # Priority 2: If no Manager DN or AD lookup failed, use manual manager email
    if (-not $emailSent -and -not [string]::IsNullOrWhiteSpace($managerEmail)) {
        $resolvedManagerEmail = $managerEmail
        Write-Host "Using manually entered manager email: $resolvedManagerEmail" -ForegroundColor Cyan

        $emailParams = @{
            EmployeeName = "$($userParams.FirstName) $($userParams.LastName)"
            EmailAddress = $userParams.UserPrincipalName
            TempPassword = $password
            ManagerEmail = $resolvedManagerEmail
            CreationDate = (Get-Date -Format "MMMM dd, yyyy 'at' hh:mm tt")
        }
        $emailSent = Send-NewUserCredentialEmail @emailParams
    }

    # ── 8. Return result ─────────────────────────────────────────────────────
    Write-PSLog -Level "INFO" -Message "User creation complete" -Data @{ sam = $userParams.SamAccountName; emailSent = $emailSent }
    @{
        Success      = $true
        Username     = $userParams.SamAccountName
        Email        = $userParams.UserPrincipalName
        Password     = $password
        EmailSent    = $emailSent
        ManagerEmail = $resolvedManagerEmail
        Message      = "User created successfully"
    } | ConvertTo-Json
}
catch {
    Write-PSLog -Level "ERROR" -Message "User creation failed" -Data @{ sam = $userParams.SamAccountName; error = $_.Exception.Message }
    @{
        Success = $false
        Error   = $_.Exception.Message
    } | ConvertTo-Json
}

