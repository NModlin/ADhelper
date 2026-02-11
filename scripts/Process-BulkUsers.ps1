# Process-BulkUsers.ps1
# Bridge script for bulk user processing (groups + proxy addresses)
# Reads parameters from a JSON temp file to prevent command injection
# Called with: -File Process-BulkUsers.ps1 -ParamsFile <path-to-json>
#
# Params JSON shape:
#   { "usernames": ["user1","user2"], "mode": "all"|"groupsOnly"|"proxiesOnly" }

param (
    [Parameter(Mandatory=$true)]
    [string]$ParamsFile
)

# ── 0. Structured logging ─────────────────────────────────────────────────────
Import-Module "$PSScriptRoot\PSLogger.psm1" -Force -ErrorAction SilentlyContinue
try { Initialize-PSLogger -ScriptName "Process-BulkUsers" } catch {}

# ── 1. Load & validate params ─────────────────────────────────────────────────
if (-not (Test-Path $ParamsFile)) {
    @{ Success = $false; Error = "Parameters file not found: $ParamsFile" } | ConvertTo-Json
    exit 1
}

try {
    $params = Get-Content $ParamsFile -Raw | ConvertFrom-Json
    Remove-Item $ParamsFile -Force -ErrorAction SilentlyContinue
} catch {
    @{ Success = $false; Error = "Failed to parse parameters: $($_.Exception.Message)" } | ConvertTo-Json
    exit 1
}

$usernames = @($params.usernames | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
$mode = if ($params.mode) { $params.mode } else { "all" }

if ($usernames.Count -eq 0) {
    @{ Success = $false; Error = "No usernames provided." } | ConvertTo-Json
    exit 1
}

Write-PSLog -Level "INFO" -Message "Bulk processing started" -Data @{ count = $usernames.Count; mode = $mode }

# ── 2. Load externalized config ───────────────────────────────────────────────
Import-Module "$PSScriptRoot\ADConfig.psm1" -Force -ErrorAction SilentlyContinue
$adConfig = Get-ADHelperConfig -ErrorAction SilentlyContinue

if ($adConfig -and $adConfig.standardGroups) {
    $standardGroups = @($adConfig.standardGroups)
} else {
    $standardGroups = @(
        "CN=All_Employees,OU=Adaxes%20Managed,OU=Security%20Groups,DC=RPL,DC=Local",
        "CN=US%20Employees,OU=Distribution%20Lists,DC=RPL,DC=Local",
        "CN=USEmployees,OU=Adaxes%20Managed,OU=Security%20Groups,DC=RPL,DC=Local",
        "CN=Password%20Policy%20-%20Standard%20User%20No%20Expiration,OU=Security%20Groups,DC=RPL,DC=Local",
        "CN=Intune%20User%20Enrollment,OU=Security%20Groups,DC=RPL,DC=Local",
        "CN=Help%20Desk%20Access,OU=Security%20Groups,DC=RPL,DC=Local",
        "CN=RehrigVPN,OU=Mgr-Owner-Approval-Required,OU=Self%20Service%20Groups,DC=RPL,DC=Local",
        "CN=RehrigVPN_Distro,OU=Distribution%20Lists,DC=RPL,DC=Local",
        "CN=GeneralDistribution,OU=Distribution%20Lists,DC=RPL,DC=Local",
        "CN=Selfservice,OU=Security%20Groups,DC=RPL,DC=Local"
    )
}

# ── 3. Load System.Web for URL decoding ───────────────────────────────────────
try { Add-Type -AssemblyName System.Web -ErrorAction Stop } catch {
    @{ Success = $false; Error = "Failed to load System.Web assembly." } | ConvertTo-Json
    exit 1
}

# ── 4. Get credentials ────────────────────────────────────────────────────────
. "$PSScriptRoot\CredentialManager.ps1"
$credTarget = if ($adConfig -and $adConfig.credentialTarget) { $adConfig.credentialTarget } else { "ADHelper_AdminCred" }
$storedCred = Get-StoredCredential -Target $credTarget

if (-not $storedCred) {
    @{ Success = $false; Error = "No stored credentials found. Please save credentials first." } | ConvertTo-Json
    exit 1
}

$securePass = ConvertTo-SecureString $storedCred.Password -AsPlainText -Force
$credential = New-Object System.Management.Automation.PSCredential($storedCred.Username, $securePass)

# ── 5. Proxy address helper ───────────────────────────────────────────────────
function Get-RequiredProxies {
    param([string]$sam)
    if (Get-Command -Name Get-ProxyAddresses -ErrorAction SilentlyContinue) {
        $p = Get-ProxyAddresses -SamAccountName $sam
        if ($p -and $p.Count -gt 0) { return $p }
    }
    $lower = $sam.ToLower()
    $title = (Get-Culture).TextInfo.ToTitleCase($lower)
    return @(
        "smtp:$lower@rehrigpenn.com",
        "smtp:${title}@Rehrigpacific.com",
        "smtp:${title}@Rehrig.onmicrosoft.com",
        "smtp:${title}@Rehrig.mail.onmicrosoft.com",
        "SMTP:${title}@Rehrig.com",
        "SIP:${title}@Rehrig.com"
    )
}


# ── 6. Process each user ──────────────────────────────────────────────────────
$totalUsers = $usernames.Count
$stats = @{ TotalProcessed = 0; GroupsAdded = 0; GroupsAlreadyMember = 0; GroupsFailed = 0; ProxiesAdded = 0; ProxiesAlreadyOk = 0; ProxiesFailed = 0; UsersNotFound = 0; Errors = 0 }
$userResults = @()

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  BULK USER PROCESSING                                     ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host "Processing $totalUsers user(s) in mode: $mode" -ForegroundColor Cyan

for ($i = 0; $i -lt $totalUsers; $i++) {
    $sam = $usernames[$i].Trim()
    $stats.TotalProcessed++

    # Handle email format
    if ($sam -like "*@*") { $sam = ($sam -split "@")[0] }
    if ([string]::IsNullOrWhiteSpace($sam)) { continue }

    $pct = [math]::Floor(($i / $totalUsers) * 100)
    Write-Progress -Activity "Bulk Processing" -Status "User $($i+1) of $totalUsers : $sam" -PercentComplete $pct
    Write-Host "`n━━━ [$($i+1)/$totalUsers] Processing: $sam ━━━" -ForegroundColor Cyan

    $userResult = @{ Username = $sam; GroupsAdded = 0; ProxiesAdded = 0; Errors = @() }

    # Validate user
    $user = $null
    try {
        $user = Get-ADUser -Identity $sam -Properties proxyAddresses, sAMAccountName, MemberOf -Credential $credential -ErrorAction Stop
        Write-Host "  ✅ User found: $($user.Name)" -ForegroundColor Green
    } catch {
        Write-Host "  ❌ User not found: $($_.Exception.Message)" -ForegroundColor Red
        $stats.UsersNotFound++
        $stats.Errors++
        $userResult.Errors += "User not found: $($_.Exception.Message)"
        $userResults += $userResult
        continue
    }

    # ── Groups ──
    if ($mode -ne "proxiesOnly") {
        Write-Host "  📋 Adding to standard groups..." -ForegroundColor Yellow
        foreach ($groupDN in $standardGroups) {
            $decodedGroup = [System.Web.HttpUtility]::UrlDecode($groupDN)
            try {
                if ($user.MemberOf -contains $decodedGroup) {
                    $stats.GroupsAlreadyMember++
                } else {
                    Add-ADGroupMember -Identity $decodedGroup -Members $sam -Credential $credential -ErrorAction Stop
                    $stats.GroupsAdded++
                    $userResult.GroupsAdded++
                }
            } catch {
                $stats.GroupsFailed++
                $userResult.Errors += "Group failed: $decodedGroup - $($_.Exception.Message)"
            }
        }
        Write-Host "  Groups: +$($userResult.GroupsAdded) added" -ForegroundColor Green
    }

    # ── Proxy Addresses ──
    if ($mode -ne "groupsOnly") {
        Write-Host "  📧 Fixing proxy addresses..." -ForegroundColor Yellow
        try {
            $required = Get-RequiredProxies -sam $user.sAMAccountName
            $existing = @($user.proxyAddresses)
            $existingLower = @($existing | ForEach-Object { $_.Trim().ToLower() })

            $missing = @($required | Where-Object { $existingLower -notcontains $_.Trim().ToLower() })

            if ($missing.Count -eq 0) {
                Write-Host "  ✅ Proxy addresses already compliant" -ForegroundColor Green
                $stats.ProxiesAlreadyOk++
            } else {
                Set-ADUser -Identity $sam -Add @{'proxyAddresses'=$missing} -Credential $credential -ErrorAction Stop
                $stats.ProxiesAdded += $missing.Count
                $userResult.ProxiesAdded = $missing.Count
                Write-Host "  ✅ Added $($missing.Count) proxy address(es)" -ForegroundColor Green
            }
        } catch {
            $stats.ProxiesFailed++
            $userResult.Errors += "Proxy failed: $($_.Exception.Message)"
            Write-Host "  ❌ Proxy error: $($_.Exception.Message)" -ForegroundColor Red
        }
    }

    $userResults += $userResult
}

Write-Progress -Activity "Bulk Processing" -Completed

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor White
Write-Host "║  BULK PROCESSING COMPLETE                                  ║" -ForegroundColor White
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor White
Write-Host "  Users processed: $($stats.TotalProcessed)" -ForegroundColor Cyan
Write-Host "  Groups added: $($stats.GroupsAdded)  (already member: $($stats.GroupsAlreadyMember))" -ForegroundColor Green
Write-Host "  Proxies added: $($stats.ProxiesAdded)  (already ok: $($stats.ProxiesAlreadyOk))" -ForegroundColor Green
if ($stats.Errors -gt 0) {
    Write-Host "  Errors: $($stats.Errors)" -ForegroundColor Red
}

Write-PSLog -Level "INFO" -Message "Bulk processing completed" -Data @{ stats = $stats }

# ── 7. Output JSON result ─────────────────────────────────────────────────────
$output = @{
    Success = ($stats.Errors -eq 0 -and $stats.UsersNotFound -eq 0)
    Stats = $stats
    UserResults = $userResults
}
$output | ConvertTo-Json -Depth 4
