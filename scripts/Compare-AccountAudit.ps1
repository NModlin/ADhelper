<#
.SYNOPSIS
    Audits and compares four Active Directory accounts side-by-side to surface
    correlations that may explain recurring lockout/authentication issues.

.DESCRIPTION
    Pulls a comprehensive snapshot of each account's AD properties including:
    - Account flags and status
    - Password policy and history
    - Lockout state and history
    - Last logon timestamps (from all DCs)
    - Group memberships
    - OU path
    - Linked devices (via msDS-AuthenticatedAtDC and recent logon workstations)
    - Manager and direct reports
    - Entra/Azure AD sync attributes

    Then outputs a side-by-side comparison highlighting values that differ across
    accounts and values that are SHARED (potential correlation candidates).

.EXAMPLE
    .\Compare-AccountAudit.ps1
    # Compares jbarry, rmartin, shoover, dwhitacre and writes reports to .\AuditOutput\

.NOTES
    Requires RSAT / ActiveDirectory module.
    Run as a user with read access to AD and permission to query all DCs.
#>

Import-Module ActiveDirectory -ErrorAction Stop

$AffectedUsers = @("jbarry", "rmartin", "shoover", "DWhitaker")
$ControlUsers  = @("douglascampbell", "nmodlin", "lchamp", "dhutton")
$Usernames     = $AffectedUsers + $ControlUsers
$OutputDir   = ".\AuditOutput"
$Timestamp   = Get-Date -Format "yyyyMMdd_HHmmss"

if (-not (Test-Path $OutputDir)) { New-Item -ItemType Directory -Path $OutputDir | Out-Null }

# -- Get all DCs so we can query LastLogon from each (LastLogonDate is replicated,
#    but LastLogon is per-DC and more precise) ----------------------------------
$AllDCs = Get-ADDomainController -Filter * | Select-Object -ExpandProperty HostName

Write-Host "`nQuerying Active Directory for all DCs and account data...`n" -ForegroundColor Cyan

# -- Properties to pull from AD -----------------------------------------------
$ADProperties = @(
    "SamAccountName", "DisplayName", "UserPrincipalName", "EmailAddress",
    "DistinguishedName", "CanonicalName",
    "Enabled", "LockedOut", "AccountLockoutTime", "BadLogonCount", "BadPwdCount",
    "PasswordLastSet", "PasswordNeverExpires", "PasswordExpired", "PasswordNotRequired",
    "LastLogonDate", "LastBadPasswordAttempt",
    "LogonWorkstations",
    "HomeDirectory", "HomeDrive", "ProfilePath", "ScriptPath",
    "Manager",
    "MemberOf",
    "Created", "Modified", "whenChanged",
    "msDS-UserPasswordExpiryTimeComputed",
    "msDS-PrincipalName",
    "ObjectGUID", "ObjectSID",
    "userAccountControl",
    "adminCount",
    "msExchMailboxGuid",
    "mS-DS-ConsistencyGuid",
    "msDS-cloudExtensionAttribute1",
    "Department", "Title", "Company", "Office", "Description"
)

# -- Decode userAccountControl flags ------------------------------------------
function Get-UACFlags {
    param([int]$UAC)
    $Flags = [ordered]@{
        ACCOUNTDISABLE                 = 0x0002
        HOMEDIR_REQUIRED               = 0x0008
        LOCKOUT                        = 0x0010
        PASSWD_NOTREQD                 = 0x0020
        PASSWD_CANT_CHANGE             = 0x0040
        ENCRYPTED_TEXT_PWD_ALLOWED     = 0x0080
        NORMAL_ACCOUNT                 = 0x0200
        INTERDOMAIN_TRUST_ACCOUNT      = 0x0800
        WORKSTATION_TRUST_ACCOUNT      = 0x1000
        SERVER_TRUST_ACCOUNT           = 0x2000
        DONT_EXPIRE_PASSWORD           = 0x10000
        MNS_LOGON_ACCOUNT              = 0x20000
        SMARTCARD_REQUIRED             = 0x40000
        TRUSTED_FOR_DELEGATION         = 0x80000
        NOT_DELEGATED                  = 0x100000
        USE_DES_KEY_ONLY               = 0x200000
        DONT_REQ_PREAUTH               = 0x400000
        PASSWORD_EXPIRED               = 0x800000
        TRUSTED_TO_AUTH_FOR_DELEGATION = 0x1000000
        PARTIAL_SECRETS_ACCOUNT        = 0x4000000
    }
    $Active = @()
    foreach ($flag in $Flags.GetEnumerator()) {
        if ($UAC -band $flag.Value) { $Active += $flag.Key }
    }
    return $Active -join ", "
}

# -- Pull most-recent LastLogon across ALL domain controllers ------------------
function Get-TrueLastLogon {
    param([string]$Username)
    $Latest = $null
    foreach ($DC in $AllDCs) {
        try {
            $u = Get-ADUser -Identity $Username -Server $DC -Properties LastLogon -ErrorAction SilentlyContinue
            if ($u -and $u.LastLogon -and $u.LastLogon -gt 0) {
                $dt = [DateTime]::FromFileTime($u.LastLogon)
                if ($null -eq $Latest -or $dt -gt $Latest) { $Latest = $dt }
            }
        } catch { }
    }
    return $Latest
}

# -- Collect data for each user -----------------------------------------------
$AllUserData = @{}

foreach ($Username in $Usernames) {
    Write-Host "  Pulling data for: $Username" -ForegroundColor White

    try {
        $User = Get-ADUser -Identity $Username -Properties $ADProperties -ErrorAction Stop
    } catch {
        Write-Warning "  Could not retrieve account: $Username -- $_"
        continue
    }

    Write-Host "    Querying $($AllDCs.Count) DCs for true LastLogon..." -ForegroundColor DarkGray
    $TrueLastLogon = Get-TrueLastLogon -Username $Username

    $OUPath = ($User.DistinguishedName -replace "^CN=[^,]+,","")

    $ManagerName = if ($User.Manager) {
        try { (Get-ADUser -Identity $User.Manager -Properties DisplayName).DisplayName } catch { $User.Manager }
    } else { "None" }

    $Groups = ($User.MemberOf | ForEach-Object {
        ($_ -split ",")[0] -replace "^CN=",""
    } | Sort-Object) -join "; "

    $PwdExpiry = if (
        $User."msDS-UserPasswordExpiryTimeComputed" -and
        $User."msDS-UserPasswordExpiryTimeComputed" -gt 0 -and
        $User."msDS-UserPasswordExpiryTimeComputed" -lt 9223372036854775807
    ) {
        [DateTime]::FromFileTime($User."msDS-UserPasswordExpiryTimeComputed")
    } else { "Never / Not Computed" }

    $UACDecoded = Get-UACFlags -UAC $User.userAccountControl

    $IsProtectedAdmin = if ($User.adminCount -eq 1) { "YES -- SDProp protected (AdminSDHolder may reset group memberships)" } else { "No" }

    $AllUserData[$Username] = [PSCustomObject]@{
        Username              = $Username
        DisplayName           = $User.DisplayName
        UPN                   = $User.UserPrincipalName
        Email                 = $User.EmailAddress
        Title                 = $User.Title
        Department            = $User.Department
        OUPath                = $OUPath
        Manager               = $ManagerName
        AccountEnabled        = $User.Enabled
        LockedOut             = $User.LockedOut
        LockoutTime           = $User.AccountLockoutTime
        BadPwdCount           = $User.BadPwdCount
        LastBadPwd            = $User.LastBadPasswordAttempt
        PasswordLastSet       = $User.PasswordLastSet
        PasswordExpiry        = $PwdExpiry
        PasswordNeverExpires  = $User.PasswordNeverExpires
        PasswordExpired       = $User.PasswordExpired
        LastLogonReplicated   = $User.LastLogonDate
        LastLogonTrueDC       = $TrueLastLogon
        LogonWorkstations     = if ($User.LogonWorkstations) { $User.LogonWorkstations } else { "Unrestricted" }
        HomeDirectory         = $User.HomeDirectory
        ProfilePath           = $User.ProfilePath
        ScriptPath            = $User.ScriptPath
        UACRaw                = $User.userAccountControl
        UACDecoded            = $UACDecoded
        AdminCount            = $IsProtectedAdmin
        HasMailbox            = if ($User.msExchMailboxGuid) { "Yes" } else { "No/Unknown" }
        EntraSyncAnchor       = $User."mS-DS-ConsistencyGuid"
        AccountCreated        = $User.Created
        AccountModified       = $User.Modified
        ObjectGUID            = $User.ObjectGUID
        Groups                = $Groups
    }
}

# -- Side-by-side comparison --------------------------------------------------

$Fields   = $AllUserData.Values[0].PSObject.Properties.Name
$UserList = $AllUserData.Keys | Sort-Object

Write-Host "`n`n======================================================" -ForegroundColor Cyan
Write-Host "  ACCOUNT COMPARISON REPORT -- $(Get-Date -Format 'yyyy-MM-dd HH:mm')" -ForegroundColor Cyan
Write-Host "======================================================`n" -ForegroundColor Cyan

$ComparisonRows = @()

foreach ($Field in $Fields) {
    $Values = @{}
    foreach ($User in $UserList) {
        if ($AllUserData.ContainsKey($User)) {
            $Values[$User] = $AllUserData[$User].$Field
        }
    }

    $UniqueValues = $Values.Values | Sort-Object -Unique
    $AllSame      = ($UniqueValues.Count -eq 1)

    $Row = [ordered]@{ Field = $Field }
    foreach ($User in $UserList) { $Row[$User] = $Values[$User] }
    $Row["CORRELATION"] = if ($AllSame) { "*** SHARED ***" } else { "" }

    $ComparisonRows += [PSCustomObject]$Row
}

foreach ($Row in $ComparisonRows) {
    $Color = if ($Row.CORRELATION -eq "*** SHARED ***") { "Yellow" } else { "Gray" }
    $Line  = "{0,-28}" -f $Row.Field
    foreach ($User in $UserList) { $Line += "  {0,-28}" -f "$($Row.$User)".Substring(0, [Math]::Min("$($Row.$User)".Length, 28)) }
    $Line += "  $($Row.CORRELATION)"
    Write-Host $Line -ForegroundColor $Color
}

# -- Group membership diff ----------------------------------------------------
Write-Host "`n`n== GROUP MEMBERSHIP ANALYSIS ========================`n" -ForegroundColor Cyan

$AllGroupSets = @{}
foreach ($User in $UserList) {
    if ($AllUserData.ContainsKey($User)) {
        $AllGroupSets[$User] = $AllUserData[$User].Groups -split "; " | Where-Object { $_ }
    }
}

$SharedByAll = $AllGroupSets[$UserList[0]]
foreach ($User in $UserList[1..($UserList.Count-1)]) {
    $SharedByAll = $SharedByAll | Where-Object { $AllGroupSets[$User] -contains $_ }
}

Write-Host "Groups shared by ALL four accounts:" -ForegroundColor Yellow
if ($SharedByAll) { $SharedByAll | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow } }
else { Write-Host "  None" -ForegroundColor DarkGray }

Write-Host ""
foreach ($User in $UserList) {
    if (-not $AllUserData.ContainsKey($User)) { continue }
    $OtherUsers = $UserList | Where-Object { $_ -ne $User }
    $Unique = $AllGroupSets[$User] | Where-Object {
        $g = $_
        -not ($OtherUsers | Where-Object { $AllGroupSets[$_] -contains $g })
    }
    Write-Host "Groups unique to ${User}:" -ForegroundColor White
    if ($Unique) { $Unique | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray } }
    else { Write-Host "  None" -ForegroundColor DarkGray }
}

# -- Export to CSV ------------------------------------------------------------
$CsvPath = "$OutputDir\AccountAudit_$Timestamp.csv"
$ComparisonRows | Export-Csv -Path $CsvPath -NoTypeInformation
Write-Host "`nFull comparison exported to: $CsvPath" -ForegroundColor Green

# -- Individual user detail files ---------------------------------------------
foreach ($User in $UserList) {
    if (-not $AllUserData.ContainsKey($User)) { continue }
    $FilePath = "$OutputDir\${User}_Detail_$Timestamp.txt"
    $AllUserData[$User].PSObject.Properties | ForEach-Object {
        "{0,-28} {1}" -f $_.Name, $_.Value
    } | Out-File -FilePath $FilePath
    Write-Host "Detail file: $FilePath" -ForegroundColor DarkGray
}

Write-Host "`nDone. Review CORRELATION column and shared groups for patterns.`n" -ForegroundColor Cyan

# -- Quick-look summary -------------------------------------------------------
Write-Host "== QUICK FLAGS -- REVIEW THESE FIRST ===============`n" -ForegroundColor Magenta
foreach ($User in $UserList) {
    if (-not $AllUserData.ContainsKey($User)) { continue }
    $U = $AllUserData[$User]
    Write-Host "$User ($($U.DisplayName))" -ForegroundColor White
    Write-Host "  Locked Out:         $($U.LockedOut)"
    Write-Host "  Bad Pwd Count:      $($U.BadPwdCount)"
    Write-Host "  Last Bad Pwd:       $($U.LastBadPwd)"
    Write-Host "  Pwd Last Set:       $($U.PasswordLastSet)"
    Write-Host "  Pwd Expires:        $($U.PasswordExpiry)"
    Write-Host "  True Last Logon:    $($U.LastLogonTrueDC)"
    Write-Host "  UAC Flags:          $($U.UACDecoded)"
    Write-Host "  Admin Protected:    $($U.AdminCount)"
    Write-Host "  Logon Workstations: $($U.LogonWorkstations)"
    Write-Host ""
}