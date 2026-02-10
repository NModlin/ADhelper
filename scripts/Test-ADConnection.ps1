# Test-ADConnection.ps1
# Lightweight Active Directory connectivity check script

function Test-ADConnection {
    <#
    .SYNOPSIS
        Tests connectivity to Active Directory domain.
    
    .DESCRIPTION
        Performs a lightweight check to verify Active Directory connectivity.
        Returns a JSON object with connection status and details.
    
    .PARAMETER Credential
        PSCredential object for AD authentication (optional for domain-joined machines)
    
    .PARAMETER TimeoutSeconds
        Timeout for the connection test in seconds (default: 10)
    
    .EXAMPLE
        Test-ADConnection
        Test-ADConnection -Credential $cred -TimeoutSeconds 5
    #>
    param (
        [Parameter(Mandatory=$false)]
        [System.Management.Automation.PSCredential]$Credential,
        
        [Parameter(Mandatory=$false)]
        [int]$TimeoutSeconds = 10
    )

    $result = @{
        Connected = $false
        Domain = $null
        DomainController = $null
        ResponseTime = $null
        Error = $null
        Timestamp = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    }

    try {
        # Start timing
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

        # Test 1: Check if ActiveDirectory module is available
        if (-not (Get-Module -ListAvailable -Name ActiveDirectory)) {
            throw "ActiveDirectory PowerShell module is not installed"
        }

        # Import the module
        Import-Module ActiveDirectory -ErrorAction Stop

        # Test 2: Try to get domain information (lightweight query)
        $adParams = @{
            ErrorAction = 'Stop'
        }
        
        if ($Credential) {
            $adParams.Credential = $Credential
        }

        # Get current domain (very lightweight operation)
        $domain = Get-ADDomain @adParams

        # Test 3: Try to get a domain controller (verifies LDAP connectivity)
        $dc = Get-ADDomainController -Discover @adParams

        # Stop timing
        $stopwatch.Stop()

        # Success - populate result
        $result.Connected = $true
        $result.Domain = $domain.DNSRoot
        $result.DomainController = $dc.HostName
        $result.ResponseTime = [math]::Round($stopwatch.Elapsed.TotalMilliseconds, 2)

    }
    catch [System.TimeoutException] {
        $result.Error = "Connection timeout - Please check VPN connection"
    }
    catch [System.Management.Automation.CommandNotFoundException] {
        $result.Error = "ActiveDirectory module not found - Please install RSAT tools"
    }
    catch [Microsoft.ActiveDirectory.Management.ADServerDownException] {
        $result.Error = "Domain controller not reachable - Please connect to FortiClient VPN"
    }
    catch [System.Security.Authentication.AuthenticationException] {
        $result.Error = "Authentication failed - Please check credentials"
    }
    catch {
        # Generic error handling
        $errorMessage = $_.Exception.Message
        
        # Check for common VPN-related errors
        if ($errorMessage -match "RPC server|network path|timeout|unreachable") {
            $result.Error = "Network connectivity issue - Please connect to FortiClient VPN"
        }
        elseif ($errorMessage -match "credentials|authentication|access denied") {
            $result.Error = "Authentication failed - Please check credentials in Settings"
        }
        else {
            $result.Error = $errorMessage
        }
    }

    # Return result as JSON
    return ($result | ConvertTo-Json -Compress)
}

# If script is run directly (not dot-sourced), execute the test
if ($MyInvocation.InvocationName -ne '.') {
    # Get credentials from Windows Credential Manager if available
    $credential = $null
    
    try {
        # Try to load credential manager script
        $credScriptPath = Join-Path $PSScriptRoot "CredentialManager.ps1"
        if (Test-Path $credScriptPath) {
            . $credScriptPath
            $credential = Get-StoredCredential -Target "ADHelper_AdminCred"
        }
    }
    catch {
        # Credentials not available, will try without
    }

    # Run the test
    if ($credential) {
        Test-ADConnection -Credential $credential
    }
    else {
        Test-ADConnection
    }
}

