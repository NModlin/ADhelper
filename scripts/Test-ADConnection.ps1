# Test-ADConnection.ps1
# Lightweight Active Directory connectivity check script
#
# Uses .NET DirectoryServices for speed instead of the heavy ActiveDirectory
# PowerShell module (Import-Module + Get-ADDomain can take 15-20 seconds).
# The .NET approach completes in < 200ms on a domain-joined machine.

$result = @{
    Connected        = $false
    Domain           = $null
    DomainController = $null
    ResponseTime     = $null
    Error            = $null
    Timestamp        = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
}

try {
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

    # Test 1: Get current domain via .NET (near-instant on domain-joined machines)
    $domain = [System.DirectoryServices.ActiveDirectory.Domain]::GetCurrentDomain()
    $result.Domain = $domain.Name

    # Test 2: Find a domain controller (verifies LDAP/DC locator)
    $dc = $domain.FindDomainController()
    $result.DomainController = $dc.Name

    # Test 3: Quick LDAP bind to verify the DC is actually responding
    $ldapPath = "LDAP://$($dc.Name)"
    $directoryEntry = New-Object System.DirectoryServices.DirectoryEntry($ldapPath)
    # Accessing a property forces the bind — if DC is unreachable this throws
    $null = $directoryEntry.distinguishedName

    $stopwatch.Stop()

    $result.Connected    = $true
    $result.ResponseTime = [math]::Round($stopwatch.Elapsed.TotalMilliseconds, 2)
}
catch {
    if ($stopwatch -and $stopwatch.IsRunning) { $stopwatch.Stop() }

    $errorMessage = $_.Exception.Message

    if ($errorMessage -match "not find.*domain|domain is not available") {
        $result.Error = "Not joined to a domain or domain unreachable - Please connect to FortiClient VPN"
    }
    elseif ($errorMessage -match "RPC server|network path|timeout|unreachable|server is not operational") {
        $result.Error = "Network connectivity issue - Please connect to FortiClient VPN"
    }
    elseif ($errorMessage -match "credentials|authentication|access denied|logon failure") {
        $result.Error = "Authentication failed - Please check credentials in Settings"
    }
    else {
        $result.Error = $errorMessage
    }
}

# Output result as JSON
$result | ConvertTo-Json -Compress

