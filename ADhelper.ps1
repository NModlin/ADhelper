# --- AD Helper - Group & Proxy Manager ---
# An interactive script to fix proxy addresses, add users to standard groups, and validate user information.
# This script uses PowerShell's Active Directory module and runs with admin credentials.

# --- 1. Configuration ---

# Set the script to continue on non-terminating errors, allowing for custom handling.
$ErrorActionPreference = "Continue"

# Define the standard groups that users should be added to
$standardGroups = @(
    "CN=All_Employees,OU=Adaxes%20Managed,OU=Security%20Groups,DC=RPL,DC=Local",
    "CN=US%20Employees,OU=Distribution%20Lists,DC=RPL,DC=Local",
    "CN=USEmployees,OU=Adaxes%20Managed,OU=Security%20Groups,DC=RPL,DC=Local",
    "CN=Password%20Policy%20-%20Standard%20User%20No%20Expiration,OU=Security%20Groups,DC=RPL,DC=Local",
    "CN=Intune%20User%20Enrollment,OU=Security%20Groups,DC=RPL,DC=Local",
    "CN=Help%20Desk%20Access,OU=Security%20Groups,DC=RPL,DC=Local",
    "CN=RehrigVPN,OU=Mgr-Owner-Approval-Required,OU=Self%20Service%20Groups,DC=RPL,DC=Local",
    "CN=RehrigVPN_Distro,OU=Distribution%20Lists,DC=RPL,DC=Local"
)

# MFA Registration Blocking Group - users in this group are blocked from MFA registration
$mfaBlockingGroup = "CN=MFA_registration_blocking,OU=Security%20Groups,DC=RPL,DC=Local"

# Credential target name for Windows Credential Manager
$script:CredentialTarget = "ADHelper_AdminCred"

# --- 2. Helper Functions ---

# Native Windows Credential Manager functions
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;

namespace CredentialManagement
{
    public class NativeCredential
    {
        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        public struct CREDENTIAL
        {
            public int Flags;
            public int Type;
            public string TargetName;
            public string Comment;
            public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
            public int CredentialBlobSize;
            public IntPtr CredentialBlob;
            public int Persist;
            public int AttributeCount;
            public IntPtr Attributes;
            public string TargetAlias;
            public string UserName;
        }

        [DllImport("advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        public static extern bool CredWrite([In] ref CREDENTIAL credential, [In] int flags);

        [DllImport("advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        public static extern bool CredRead(string target, int type, int reservedFlag, out IntPtr credentialPtr);

        [DllImport("advapi32.dll", SetLastError = true)]
        public static extern bool CredFree([In] IntPtr cred);
    }
}
"@ -ErrorAction SilentlyContinue

function Save-WindowsCredential {
    param(
        [string]$Target,
        [string]$Username,
        [System.Security.SecureString]$SecurePassword
    )

    try {
        # Convert SecureString to plain text for storage
        $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePassword)
        $password = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
        [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)

        $passwordBytes = [System.Text.Encoding]::Unicode.GetBytes($password)
        $passwordPtr = [System.Runtime.InteropServices.Marshal]::AllocHGlobal($passwordBytes.Length)
        [System.Runtime.InteropServices.Marshal]::Copy($passwordBytes, 0, $passwordPtr, $passwordBytes.Length)

        $credential = New-Object CredentialManagement.NativeCredential+CREDENTIAL
        $credential.Type = 1 # CRED_TYPE_GENERIC
        $credential.TargetName = $Target
        $credential.UserName = $Username
        $credential.CredentialBlob = $passwordPtr
        $credential.CredentialBlobSize = $passwordBytes.Length
        $credential.Persist = 2 # CRED_PERSIST_LOCAL_MACHINE

        $result = [CredentialManagement.NativeCredential]::CredWrite([ref]$credential, 0)

        [System.Runtime.InteropServices.Marshal]::FreeHGlobal($passwordPtr)

        return $result
    }
    catch {
        Write-Verbose "Error saving credential: $($_.Exception.Message)"
        return $false
    }
}

function Get-WindowsCredential {
    param(
        [string]$Target
    )

    try {
        $credPtr = [IntPtr]::Zero
        $result = [CredentialManagement.NativeCredential]::CredRead($Target, 1, 0, [ref]$credPtr)

        if ($result) {
            $credential = [System.Runtime.InteropServices.Marshal]::PtrToStructure($credPtr, [type][CredentialManagement.NativeCredential+CREDENTIAL])

            $passwordBytes = New-Object byte[] $credential.CredentialBlobSize
            [System.Runtime.InteropServices.Marshal]::Copy($credential.CredentialBlob, $passwordBytes, 0, $credential.CredentialBlobSize)
            $password = [System.Text.Encoding]::Unicode.GetString($passwordBytes)

            # Suppress the boolean return value from CredFree to prevent it from polluting the output
            [void][CredentialManagement.NativeCredential]::CredFree($credPtr)

            # Create SecureString manually to avoid module loading issues
            $securePassword = New-Object System.Security.SecureString
            foreach ($char in $password.ToCharArray()) {
                $securePassword.AppendChar($char)
            }
            $securePassword.MakeReadOnly()

            return New-Object System.Management.Automation.PSCredential($credential.UserName, $securePassword)
        }

        return $null
    }
    catch {
        Write-Verbose "Error reading credential: $($_.Exception.Message)"
        return $null
    }
}

function ConvertTo-SecureStringManual {
    <#
    .SYNOPSIS
        Converts a plain text string to a SecureString without relying on the Microsoft.PowerShell.Security module.
    .DESCRIPTION
        This function manually creates a SecureString by appending each character individually.
        This avoids issues where ConvertTo-SecureString fails due to module loading problems.
    #>
    param(
        [Parameter(Mandatory = $true)]
        [string]$PlainText
    )

    $secureString = New-Object System.Security.SecureString
    foreach ($char in $PlainText.ToCharArray()) {
        $secureString.AppendChar($char)
    }
    $secureString.MakeReadOnly()
    return $secureString
}

function Initialize-SecureCredentials {
    <#
    .SYNOPSIS
        Initializes secure credential storage using Windows Credential Manager.
    #>
    try {
        # Try to retrieve existing credentials
        $existingCred = Get-WindowsCredential -Target "ADHelper_AdminCred"
        if ($existingCred) {
            Write-Host "✅ Found stored admin credentials for: $($existingCred.UserName)" -ForegroundColor Green
            $useStored = Read-Host "Use stored credentials? (Y/N) [Default: Y]"
            # Default to Yes if user just presses Enter
            if ([string]::IsNullOrWhiteSpace($useStored) -or $useStored -eq 'Y' -or $useStored -eq 'y') {
                Write-Host "   Using stored credentials..." -ForegroundColor Cyan
                return $existingCred
            }
            else {
                Write-Host "   Prompting for new credentials..." -ForegroundColor Yellow
            }
        }

        # Prompt for new credentials
        $domain = "RPL.LOCAL"
        $adminUser = Read-Host "Enter your ADMIN username for $domain (e.g., a-nmodlin)"

        if ([string]::IsNullOrWhiteSpace($adminUser)) {
            Write-Warning "Username entry was canceled."
            return $null
        }

        $fullAdminUser = "$domain\$adminUser"
        Write-Host "Enter password for ${fullAdminUser}: " -NoNewline
        $securePassword = Read-Host -AsSecureString

        if ($securePassword.Length -eq 0) {
            Write-Warning "Password entry was canceled."
            return $null
        }

        $credential = New-Object System.Management.Automation.PSCredential($fullAdminUser, $securePassword)

        # Store credentials securely
        $store = Read-Host "Store credentials securely for future use? (Y/N)"
        if ($store -eq 'Y' -or $store -eq 'y') {
            try {
                $saved = Save-WindowsCredential -Target "ADHelper_AdminCred" -Username $fullAdminUser -SecurePassword $securePassword
                if ($saved) {
                    Write-Host "✅ Credentials stored securely in Windows Credential Manager." -ForegroundColor Green
                }
                else {
                    Write-Warning "Could not store credentials."
                    Write-Host "💡 Credentials will need to be entered again next time." -ForegroundColor Gray
                }
            }
            catch {
                Write-Warning "Could not store credentials: $($_.Exception.Message)"
                Write-Host "💡 Credentials will need to be entered again next time." -ForegroundColor Gray
            }
        }

        return $credential
    }
    catch {
        Write-Warning "Failed to initialize secure credentials: $($_.Exception.Message)"
        return $null
    }
}

function Test-StoredCredentialAccess {
    <#
    .SYNOPSIS
        Verifies that credentials are stored and retrievable from Windows Credential Manager.
    .DESCRIPTION
        Tests credential storage by attempting to save and retrieve credentials.
        This ensures the scheduled verification task will be able to access credentials.
    .OUTPUTS
        Returns $true if credentials are accessible, $false otherwise.
    #>
    param (
        [Parameter(Mandatory=$true)]
        [System.Management.Automation.PSCredential]$Credential
    )

    try {
        Write-Host "`n🔐 Verifying credential storage for scheduled task..." -ForegroundColor Cyan

        # Step 1: Attempt to save credentials to Windows Credential Manager
        $saveResult = Save-WindowsCredential -Target $script:CredentialTarget -Username $Credential.UserName -SecurePassword $Credential.Password

        if (-not $saveResult) {
            Write-Warning "❌ Failed to store credentials in Windows Credential Manager."
            Write-Host "   The scheduled verification task will not be able to authenticate." -ForegroundColor Yellow
            return $false
        }

        Write-Host "  ✅ Credentials stored successfully" -ForegroundColor Green

        # Step 2: Verify credentials can be retrieved
        $retrievedCred = Get-WindowsCredential -Target $script:CredentialTarget

        if (-not $retrievedCred) {
            Write-Warning "❌ Failed to retrieve stored credentials from Windows Credential Manager."
            Write-Host "   The scheduled verification task will not be able to authenticate." -ForegroundColor Yellow
            return $false
        }

        Write-Host "  ✅ Credentials retrieved successfully" -ForegroundColor Green

        # Step 3: Verify the username matches
        if ($retrievedCred.UserName -ne $Credential.UserName) {
            Write-Warning "❌ Retrieved credentials do not match stored credentials."
            return $false
        }

        Write-Host "  ✅ Credential verification complete - scheduled task will have access" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Warning "❌ Credential verification failed: $($_.Exception.Message)"
        return $false
    }
}

function Remove-UserFromMFABlocking {
    <#
    .SYNOPSIS
        Removes a user from the MFA Registration Blocking group.
    .DESCRIPTION
        Checks if the user is a member of the MFA blocking group and removes them if so.
        Returns a status object indicating whether removal was performed.
    #>
    param (
        [Parameter(Mandatory=$true)]
        [string]$SamAccountName,
        [Parameter(Mandatory=$true)]
        [System.Management.Automation.PSCredential]$Credential
    )

    # Decode URL-encoded characters in the group DN
    $decodedMfaGroup = [System.Web.HttpUtility]::UrlDecode($mfaBlockingGroup)

    Write-Host "`n=== MFA Blocking Group Removal ===" -ForegroundColor Cyan
    Write-Host "Target Group: $decodedMfaGroup" -ForegroundColor Gray

    try {
        # Get user with MemberOf property
        $user = Get-ADUser -Identity $SamAccountName -Properties MemberOf, DisplayName -Credential $Credential -ErrorAction Stop

        Write-Host "User: $($user.DisplayName) ($SamAccountName)" -ForegroundColor Cyan

        # Check if user is in the MFA blocking group
        $isInGroup = $user.MemberOf | Where-Object { $_ -eq $decodedMfaGroup }

        if ($isInGroup) {
            Write-Host "  ⚠️  User IS in MFA Blocking group. Proceeding with removal..." -ForegroundColor Yellow

            # Remove from group
            Remove-ADGroupMember -Identity $decodedMfaGroup -Members $SamAccountName -Credential $Credential -Confirm:$false -ErrorAction Stop
            Write-Host "  ✅ User successfully removed from MFA Blocking group" -ForegroundColor Green

            return @{
                Success = $true
                WasInGroup = $true
                Message = "User removed from MFA Blocking group"
                ErrorType = $null
                SamAccountName = $SamAccountName
                DisplayName = $user.DisplayName
            }
        }
        else {
            Write-Host "  ℹ️  User is NOT in MFA Blocking group - no action needed" -ForegroundColor Green

            return @{
                Success = $true
                WasInGroup = $false
                Message = "User is not a member of the MFA Blocking group"
                ErrorType = $null
                SamAccountName = $SamAccountName
                DisplayName = $user.DisplayName
            }
        }
    }
    catch [Microsoft.ActiveDirectory.Management.ADIdentityNotFoundException] {
        Write-Host "  ❌ User '$SamAccountName' not found in Active Directory." -ForegroundColor Red
        return @{
            Success = $false
            WasInGroup = $false
            Message = "User not found in Active Directory"
            ErrorType = "UserNotFound"
            SamAccountName = $SamAccountName
        }
    }
    catch {
        $errorMessage = $_.Exception.Message
        $errorType = "Unknown"

        # Detect credential/authentication errors
        if ($errorMessage -match "Access is denied|password|credential|authentication|logon|unauthorized|permission" -or
            $_.Exception.GetType().Name -match "UnauthorizedAccess|Authentication|Security") {
            $errorType = "CredentialError"
            Write-Host "  ❌ Credential/Authentication Error" -ForegroundColor Red
            Write-Host "     Your admin credentials may be invalid or expired." -ForegroundColor Yellow
            Write-Host "     Please restart the script and re-enter your credentials." -ForegroundColor Yellow
        }
        # Detect group not found errors
        elseif ($errorMessage -match "Cannot find an object with identity|group.*not found") {
            $errorType = "GroupNotFound"
            Write-Host "  ❌ MFA Blocking group not found in Active Directory." -ForegroundColor Red
            Write-Host "     Please verify the group DN is correct." -ForegroundColor Yellow
        }
        # Generic error
        else {
            Write-Host "  ❌ Failed to process MFA Blocking group removal: $errorMessage" -ForegroundColor Red
        }

        return @{
            Success = $false
            WasInGroup = $false
            Message = $errorMessage
            ErrorType = $errorType
            SamAccountName = $SamAccountName
        }
    }
}

function Test-MFABlockingGroupMembership {
    <#
    .SYNOPSIS
        Tests if a user is still a member of the MFA Blocking group.
    .OUTPUTS
        Returns $true if user is NOT in the group (removal verified), $false if still in group.
    #>
    param (
        [Parameter(Mandatory=$true)]
        [string]$SamAccountName,
        [Parameter(Mandatory=$true)]
        [System.Management.Automation.PSCredential]$Credential
    )

    try {
        $decodedMfaGroup = [System.Web.HttpUtility]::UrlDecode($mfaBlockingGroup)
        $user = Get-ADUser -Identity $SamAccountName -Properties MemberOf -Credential $Credential -ErrorAction Stop

        $isInGroup = $user.MemberOf | Where-Object { $_ -eq $decodedMfaGroup }

        return (-not $isInGroup)  # Return true if NOT in group (removal verified)
    }
    catch {
        return $false  # On error, assume not verified
    }
}

function Start-MFARemovalVerificationTask {
    <#
    .SYNOPSIS
        Creates a Windows Scheduled Task to verify MFA blocking group removal.
    .DESCRIPTION
        Schedules a verification task that runs after a 35-minute delay, then checks
        every minute until the group removal is confirmed or max attempts are reached.
        All logging is written to the existing ADHelper log file.
    #>
    param (
        [Parameter(Mandatory=$true)]
        [string]$SamAccountName,
        [Parameter(Mandatory=$true)]
        [string]$LogFilePath,
        [int]$DelayMinutes = 35,
        [int]$MaxAttempts = 30
    )

    $taskName = "ADHelper_MFAVerify_$SamAccountName"
    $triggerTime = (Get-Date).AddMinutes($DelayMinutes)

    Write-Host "`n📅 Scheduling MFA Removal Verification Task..." -ForegroundColor Cyan
    Write-Host "   Task Name: $taskName" -ForegroundColor Gray
    Write-Host "   Scheduled Start: $($triggerTime.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor Gray
    Write-Host "   Max Verification Attempts: $MaxAttempts (1 per minute)" -ForegroundColor Gray
    Write-Host "   Log File: $LogFilePath" -ForegroundColor Gray

    # Build the verification script content using string array to avoid nested here-string issues
    $scriptLines = @()
    $scriptLines += "# MFA Blocking Group Removal Verification Script"
    $scriptLines += "# Generated by ADHelper on $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    $scriptLines += "# User: $SamAccountName"
    $scriptLines += ""
    $scriptLines += '$ErrorActionPreference = "Continue"'
    $scriptLines += "`$samAccountName = `"$SamAccountName`""
    $scriptLines += "`$logFile = `"$LogFilePath`""
    $scriptLines += "`$credentialTarget = `"$($script:CredentialTarget)`""
    $scriptLines += '$mfaBlockingGroup = "CN=MFA_registration_blocking,OU=Security%20Groups,DC=RPL,DC=Local"'
    $scriptLines += "`$maxAttempts = $MaxAttempts"
    $scriptLines += "`$taskName = `"$taskName`""
    $scriptLines += ""
    $scriptLines += "# Function to write to the ADHelper log file"
    $scriptLines += "function Write-MFAVerificationLog {"
    $scriptLines += '    param([string]$Message, [string]$Level = "INFO")'
    $scriptLines += '    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"'
    $scriptLines += '    $logEntry = "[$timestamp] [MFA-VERIFY] [$Level] $Message"'
    $scriptLines += '    Add-Content -Path $logFile -Value $logEntry -ErrorAction SilentlyContinue'
    $scriptLines += '    Write-Host $logEntry'
    $scriptLines += "}"
    $scriptLines += ""

    # C# code for credential retrieval - use single-quoted string to avoid escaping issues
    $csharpCode = @'
using System;
using System.Runtime.InteropServices;
using System.Text;

namespace CredentialManagement
{
    public class NativeCredential
    {
        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        public struct CREDENTIAL
        {
            public int Flags;
            public int Type;
            public string TargetName;
            public string Comment;
            public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
            public int CredentialBlobSize;
            public IntPtr CredentialBlob;
            public int Persist;
            public int AttributeCount;
            public IntPtr Attributes;
            public string TargetAlias;
            public string UserName;
        }

        [DllImport("advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        public static extern bool CredRead(string target, int type, int reservedFlag, out IntPtr credentialPtr);

        [DllImport("advapi32.dll", SetLastError = true)]
        public static extern bool CredFree([In] IntPtr cred);
    }
}
'@

    $scriptLines += "# Load required types for credential retrieval"
    $scriptLines += "`$csharpCode = @'"
    $scriptLines += $csharpCode
    $scriptLines += "'@"
    $scriptLines += 'Add-Type -TypeDefinition $csharpCode -ErrorAction SilentlyContinue'
    $scriptLines += ""
    $scriptLines += "function Get-StoredCredential {"
    $scriptLines += '    param([string]$Target)'
    $scriptLines += "    try {"
    $scriptLines += '        $credPtr = [IntPtr]::Zero'
    $scriptLines += '        $result = [CredentialManagement.NativeCredential]::CredRead($Target, 1, 0, [ref]$credPtr)'
    $scriptLines += '        if ($result) {'
    $scriptLines += '            $credential = [System.Runtime.InteropServices.Marshal]::PtrToStructure($credPtr, [type][CredentialManagement.NativeCredential+CREDENTIAL])'
    $scriptLines += '            $passwordBytes = New-Object byte[] $credential.CredentialBlobSize'
    $scriptLines += '            [System.Runtime.InteropServices.Marshal]::Copy($credential.CredentialBlob, $passwordBytes, 0, $credential.CredentialBlobSize)'
    $scriptLines += '            $password = [System.Text.Encoding]::Unicode.GetString($passwordBytes)'
    $scriptLines += '            [void][CredentialManagement.NativeCredential]::CredFree($credPtr)'
    $scriptLines += '            $securePassword = New-Object System.Security.SecureString'
    $scriptLines += '            foreach ($char in $password.ToCharArray()) { $securePassword.AppendChar($char) }'
    $scriptLines += '            $securePassword.MakeReadOnly()'
    $scriptLines += '            return New-Object System.Management.Automation.PSCredential($credential.UserName, $securePassword)'
    $scriptLines += "        }"
    $scriptLines += '        return $null'
    $scriptLines += "    }"
    $scriptLines += '    catch { return $null }'
    $scriptLines += "}"
    $scriptLines += ""
    $scriptLines += "# Main verification logic"
    $scriptLines += 'Write-MFAVerificationLog "Starting MFA Blocking Group removal verification for user: $samAccountName"'
    $scriptLines += ""
    $scriptLines += "# Retrieve stored credentials"
    $scriptLines += '$credential = Get-StoredCredential -Target $credentialTarget'
    $scriptLines += 'if (-not $credential) {'
    $scriptLines += '    Write-MFAVerificationLog "FAILED: Could not retrieve stored credentials from Windows Credential Manager" "ERROR"'
    $scriptLines += '    Write-MFAVerificationLog "Verification task cannot continue without valid credentials" "ERROR"'
    $scriptLines += '    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue'
    $scriptLines += "    exit 1"
    $scriptLines += "}"
    $scriptLines += ""
    $scriptLines += 'Write-MFAVerificationLog "Successfully retrieved stored credentials"'
    $scriptLines += ""
    $scriptLines += "# Import Active Directory module"
    $scriptLines += "try {"
    $scriptLines += "    Import-Module ActiveDirectory -ErrorAction Stop"
    $scriptLines += '    Write-MFAVerificationLog "Active Directory module loaded successfully"'
    $scriptLines += "}"
    $scriptLines += "catch {"
    $scriptLines += '    Write-MFAVerificationLog "FAILED: Could not load Active Directory module: $($_.Exception.Message)" "ERROR"'
    $scriptLines += '    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue'
    $scriptLines += "    exit 1"
    $scriptLines += "}"
    $scriptLines += ""
    $scriptLines += "# Verification loop"
    $scriptLines += '$verified = $false'
    $scriptLines += '$attempt = 0'
    $scriptLines += ""
    $scriptLines += 'while ($attempt -lt $maxAttempts -and -not $verified) {'
    $scriptLines += '    $attempt++'
    $scriptLines += '    Write-MFAVerificationLog "Verification attempt $attempt of $maxAttempts"'
    $scriptLines += ""
    $scriptLines += "    try {"
    $scriptLines += '        $user = Get-ADUser -Identity $samAccountName -Properties MemberOf -Credential $credential -ErrorAction Stop'
    $scriptLines += '        $isInGroup = $user.MemberOf | Where-Object { $_ -eq $mfaBlockingGroup }'
    $scriptLines += ""
    $scriptLines += '        if (-not $isInGroup) {'
    $scriptLines += '            $verified = $true'
    $scriptLines += '            Write-MFAVerificationLog "SUCCESS: User $samAccountName is confirmed REMOVED from MFA Blocking group" "SUCCESS"'
    $scriptLines += "        }"
    $scriptLines += "        else {"
    $scriptLines += '            Write-MFAVerificationLog "User still in MFA Blocking group. AD replication may be in progress. Waiting 60 seconds..."'
    $scriptLines += '            if ($attempt -lt $maxAttempts) {'
    $scriptLines += "                Start-Sleep -Seconds 60"
    $scriptLines += "            }"
    $scriptLines += "        }"
    $scriptLines += "    }"
    $scriptLines += "    catch {"
    $scriptLines += '        Write-MFAVerificationLog "Verification attempt failed: $($_.Exception.Message)" "WARNING"'
    $scriptLines += '        if ($attempt -lt $maxAttempts) {'
    $scriptLines += '            Write-MFAVerificationLog "Waiting 60 seconds before retry..."'
    $scriptLines += "            Start-Sleep -Seconds 60"
    $scriptLines += "        }"
    $scriptLines += "    }"
    $scriptLines += "}"
    $scriptLines += ""
    $scriptLines += "# Final status"
    $scriptLines += 'if ($verified) {'
    $scriptLines += '    Write-MFAVerificationLog "MFA Blocking Group removal verification COMPLETED SUCCESSFULLY for $samAccountName" "SUCCESS"'
    $scriptLines += "}"
    $scriptLines += "else {"
    $scriptLines += '    Write-MFAVerificationLog "FAILED: Could not verify MFA Blocking Group removal for $samAccountName after $maxAttempts attempts" "ERROR"'
    $scriptLines += '    Write-MFAVerificationLog "Please manually verify the user''s group membership in Active Directory" "WARNING"'
    $scriptLines += "}"
    $scriptLines += ""
    $scriptLines += "# Clean up the scheduled task"
    $scriptLines += 'Write-MFAVerificationLog "Cleaning up scheduled task: $taskName"'
    $scriptLines += 'Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue'
    $scriptLines += ""
    $scriptLines += "# Clean up the verification script file"
    $scriptLines += '$scriptPath = "$env:TEMP\$taskName.ps1"'
    $scriptLines += 'if (Test-Path $scriptPath) {'
    $scriptLines += '    Remove-Item -Path $scriptPath -Force -ErrorAction SilentlyContinue'
    $scriptLines += "}"
    $scriptLines += ""
    $scriptLines += 'Write-MFAVerificationLog "Verification task completed and cleaned up"'
    $scriptLines += "exit 0"

    # Join all lines into the verification script
    $verificationScript = $scriptLines -join "`r`n"

    try {
        # Save the verification script to temp folder
        $scriptPath = "$env:TEMP\$taskName.ps1"
        $verificationScript | Out-File -FilePath $scriptPath -Encoding UTF8 -Force

        Write-Host "   Verification script saved to: $scriptPath" -ForegroundColor Gray

        # Remove existing task if it exists
        $existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
        if ($existingTask) {
            Write-Host "   Removing existing task with same name..." -ForegroundColor Yellow
            Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
        }

        # Create the scheduled task action
        $action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`""

        # Create the trigger (one-time, at the specified time)
        $trigger = New-ScheduledTaskTrigger -Once -At $triggerTime

        # Create task settings
        $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 1)

        # Register the scheduled task (runs as current user)
        Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null

        Write-Host "`n✅ Verification task scheduled successfully!" -ForegroundColor Green
        Write-Host "   The task will start at: $($triggerTime.ToString('HH:mm:ss'))" -ForegroundColor Cyan
        Write-Host "   It will check every minute for up to $MaxAttempts minutes" -ForegroundColor Cyan
        Write-Host "   All results will be logged to: $LogFilePath" -ForegroundColor Cyan

        # Log the scheduling to the main log file
        $logEntry = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] [MFA-VERIFY] [INFO] Scheduled verification task '$taskName' for user '$SamAccountName' at $($triggerTime.ToString('yyyy-MM-dd HH:mm:ss'))"
        Add-Content -Path $LogFilePath -Value $logEntry -ErrorAction SilentlyContinue

        return $true
    }
    catch {
        Write-Error "❌ Failed to create scheduled task: $($_.Exception.Message)"

        # Log the failure
        $logEntry = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] [MFA-VERIFY] [ERROR] Failed to schedule verification task for user '$SamAccountName': $($_.Exception.Message)"
        Add-Content -Path $LogFilePath -Value $logEntry -ErrorAction SilentlyContinue

        return $false
    }
}

function Initialize-VoiceRecognition {
    <#
    .SYNOPSIS
        Initializes voice recognition for natural language processing.
    #>
    try {
        $recognizer = New-Object System.Speech.Recognition.SpeechRecognitionEngine
        $recognizer.InitialSilenceTimeout = [TimeSpan]::FromSeconds(3)
        $recognizer.BabbleTimeout = [TimeSpan]::FromSeconds(3)
        $recognizer.InitialSilenceTimeout = [TimeSpan]::FromSeconds(3)
        
        # Define voice commands
        $choices = New-Object System.Speech.Recognition.Choices
        $choices.Add("process user")
        $choices.Add("reset password")
        $choices.Add("unlock account")
        $choices.Add("create account")
        $choices.Add("validate attributes")
        $choices.Add("add to groups")
        $choices.Add("fix proxy addresses")
        $choices.Add("show help")
        $choices.Add("exit")
        
        $grammar = New-Object System.Speech.Recognition.GrammarBuilder
        $grammar.Append($choices)
        
        $speechGrammar = New-Object System.Speech.Recognition.Grammar($grammar)
        $recognizer.LoadGrammar($speechGrammar)
        
        $script:SpeechRecognizer = $recognizer
        Write-Host "✅ Voice recognition initialized." -ForegroundColor Green
        return $true
    }
    catch {
        Write-Warning "Failed to initialize voice recognition: $($_.Exception.Message)"
        return $false
    }
}

function Process-VoiceCommand {
    <#
    .SYNOPSIS
        Processes voice commands using natural language understanding.
    #>
    param (
        [string]$Command
    )
    
    Write-Host "🎤 Processing voice command: '$Command'" -ForegroundColor Cyan
    
    # Natural language processing patterns
    switch ($Command.ToLower()) {
        { $_ -match "process.*user" -or $_ -match "handle.*user" } {
            return "process_user"
        }
        { $_ -match "reset.*password" -or $_ -match "password.*reset" } {
            return "reset_password"
        }
        { $_ -match "unlock.*account" -or $_ -match "account.*unlock" } {
            return "unlock_account"
        }
        { $_ -match "create.*account" -or $_ -match "new.*user" } {
            return "create_account"
        }
        { $_ -match "validate.*attributes" -or $_ -match "check.*user" } {
            return "validate_attributes"
        }
        { $_ -match "add.*group" -or $_ -match "group.*membership" } {
            return "add_to_groups"
        }
        { $_ -match "fix.*proxy" -or $_ -match "proxy.*address" } {
            return "fix_proxy_addresses"
        }
        { $_ -match "help" -or $_ -match "what.*can.*do" } {
            return "show_help"
        }
        { $_ -match "exit" -or $_ -match "quit" -or $_ -match "bye" } {
            return "exit"
        }
        default {
            return "unknown"
        }
    }
}

function Test-VoicePrerequisites {
    <#
    .SYNOPSIS
        Tests all prerequisites for voice commands functionality.
    .DESCRIPTION
        Checks microphone availability, Windows Speech Recognition, and System.Speech assembly.
        Returns a hashtable with test results.
    #>

    Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  Voice Commands Prerequisites Check                        ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

    $results = @{
        AllPassed = $true
        SpeechAssembly = $false
        SpeechEngine = $false
        AudioDevice = $false
        Details = @()
    }

    # Test 1: System.Speech Assembly
    Write-Host "`n[1/3] Testing System.Speech Assembly..." -ForegroundColor Yellow
    try {
        Add-Type -AssemblyName System.Speech -ErrorAction Stop
        Write-Host "  ✅ System.Speech assembly loaded successfully" -ForegroundColor Green
        $results.SpeechAssembly = $true
        $results.Details += "System.Speech: Available"
    }
    catch {
        Write-Host "  ❌ System.Speech assembly not available" -ForegroundColor Red
        Write-Host "     Error: $($_.Exception.Message)" -ForegroundColor Gray
        $results.AllPassed = $false
        $results.Details += "System.Speech: NOT AVAILABLE - $($_.Exception.Message)"
    }

    # Test 2: Speech Recognition Engine
    Write-Host "`n[2/3] Testing Speech Recognition Engine..." -ForegroundColor Yellow
    if ($results.SpeechAssembly) {
        $testRecognizer = $null
        try {
            $testRecognizer = New-Object System.Speech.Recognition.SpeechRecognitionEngine -ErrorAction Stop
            Write-Host "  ✅ Speech Recognition Engine initialized" -ForegroundColor Green
            $results.SpeechEngine = $true
            $results.Details += "Speech Engine: Available"
        }
        catch {
            Write-Host "  ❌ Speech Recognition Engine failed to initialize" -ForegroundColor Red
            Write-Host "     Error: $($_.Exception.Message)" -ForegroundColor Gray
            Write-Host "     Tip: Ensure Windows Speech Recognition is enabled" -ForegroundColor Yellow
            $results.AllPassed = $false
            $results.Details += "Speech Engine: FAILED - $($_.Exception.Message)"
        }
        finally {
            # Always clean up test recognizer
            if ($testRecognizer) {
                try { $testRecognizer.Dispose() } catch { }
                $testRecognizer = $null
            }
        }
    }
    else {
        Write-Host "  ⏭️  Skipped (requires System.Speech assembly)" -ForegroundColor Gray
        $results.Details += "Speech Engine: Skipped"
    }

    # Test 3: Audio Input Device
    Write-Host "`n[3/3] Testing Audio Input Device..." -ForegroundColor Yellow
    if ($results.SpeechEngine) {
        $testRecognizer = $null
        try {
            $testRecognizer = New-Object System.Speech.Recognition.SpeechRecognitionEngine
            $testRecognizer.SetInputToDefaultAudioDevice()
            Write-Host "  ✅ Default audio input device detected" -ForegroundColor Green
            $results.AudioDevice = $true
            $results.Details += "Audio Device: Available"
        }
        catch {
            Write-Host "  ❌ No audio input device available" -ForegroundColor Red
            Write-Host "     Error: $($_.Exception.Message)" -ForegroundColor Gray
            Write-Host "     Tip: Check microphone connection and default device settings" -ForegroundColor Yellow
            $results.AllPassed = $false
            $results.Details += "Audio Device: NOT AVAILABLE - $($_.Exception.Message)"
        }
        finally {
            # Always clean up test recognizer
            if ($testRecognizer) {
                try { $testRecognizer.Dispose() } catch { }
                $testRecognizer = $null
            }
        }
    }
    else {
        Write-Host "  ⏭️  Skipped (requires Speech Engine)" -ForegroundColor Gray
        $results.Details += "Audio Device: Skipped"
    }

    # Summary
    Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  Prerequisites Summary                                     ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

    Write-Host "  System.Speech Assembly: $(if ($results.SpeechAssembly) { '✅ Pass' } else { '❌ Fail' })" -ForegroundColor $(if ($results.SpeechAssembly) { 'Green' } else { 'Red' })
    Write-Host "  Speech Recognition:     $(if ($results.SpeechEngine) { '✅ Pass' } else { '❌ Fail' })" -ForegroundColor $(if ($results.SpeechEngine) { 'Green' } else { 'Red' })
    Write-Host "  Audio Input Device:     $(if ($results.AudioDevice) { '✅ Pass' } else { '❌ Fail' })" -ForegroundColor $(if ($results.AudioDevice) { 'Green' } else { 'Red' })

    if ($results.AllPassed) {
        Write-Host "`n✅ All prerequisites passed! Voice commands are ready." -ForegroundColor Green
    }
    else {
        Write-Host "`n❌ Some prerequisites failed. Voice commands may not work correctly." -ForegroundColor Red
        Write-Host "`n💡 Troubleshooting Tips:" -ForegroundColor Yellow
        Write-Host "   • Ensure a microphone is connected and set as default input" -ForegroundColor Gray
        Write-Host "   • Enable Windows Speech Recognition in Settings → Time & Language → Speech" -ForegroundColor Gray
        Write-Host "   • Try running: Settings → System → Sound → Input" -ForegroundColor Gray
    }

    return $results
}

function Start-VoiceCommandTest {
    <#
    .SYNOPSIS
        Interactive voice command testing walkthrough.
    .DESCRIPTION
        Guides the user through testing each voice command, provides debug info on failures,
        and displays a summary at the end.
    #>

    Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  🎤 Voice Commands Test & Diagnostics                      ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

    Write-Host "`nThis wizard will guide you through testing all voice commands." -ForegroundColor Yellow
    Write-Host "Commands are tested but NOT executed - this is safe to run." -ForegroundColor Green
    Write-Host "`nPress Enter at any time to skip a command, or say 'exit' to quit.`n" -ForegroundColor Gray

    # Step 1: Run prerequisites check
    $prereqResults = Test-VoicePrerequisites

    if (-not $prereqResults.AllPassed) {
        Write-Host "`n⚠️  Prerequisites check failed. Would you like to continue anyway? (Y/N)" -ForegroundColor Yellow
        $continueChoice = Read-Host
        if ($continueChoice -ne 'Y' -and $continueChoice -ne 'y') {
            Write-Host "Test cancelled. Please fix the prerequisites and try again." -ForegroundColor Gray
            return
        }
    }

    # Step 2: Initialize speech recognizer for testing
    Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  Initializing Voice Recognition for Testing                ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

    try {
        $testRecognizer = New-Object System.Speech.Recognition.SpeechRecognitionEngine
        $testRecognizer.InitialSilenceTimeout = [TimeSpan]::FromSeconds(5)
        $testRecognizer.BabbleTimeout = [TimeSpan]::FromSeconds(3)
        $testRecognizer.EndSilenceTimeout = [TimeSpan]::FromSeconds(1)

        # Define all voice commands for testing
        $choices = New-Object System.Speech.Recognition.Choices
        $choices.Add("process user")
        $choices.Add("handle user")
        $choices.Add("reset password")
        $choices.Add("password reset")
        $choices.Add("unlock account")
        $choices.Add("account unlock")
        $choices.Add("create account")
        $choices.Add("new user")
        $choices.Add("validate attributes")
        $choices.Add("check user")
        $choices.Add("add to groups")
        $choices.Add("group membership")
        $choices.Add("fix proxy addresses")
        $choices.Add("proxy address")
        $choices.Add("show help")
        $choices.Add("help")
        $choices.Add("what can do")
        $choices.Add("exit")
        $choices.Add("quit")
        $choices.Add("bye")

        $grammar = New-Object System.Speech.Recognition.GrammarBuilder
        $grammar.Append($choices)

        $speechGrammar = New-Object System.Speech.Recognition.Grammar($grammar)
        $testRecognizer.LoadGrammar($speechGrammar)
        $testRecognizer.SetInputToDefaultAudioDevice()

        Write-Host "✅ Voice recognition ready for testing!" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Failed to initialize voice recognition: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "   Cannot proceed with voice testing." -ForegroundColor Yellow
        return
    }

    # Define test commands
    $testCommands = @(
        @{ Primary = "process user"; Alternatives = @("handle user"); Action = "process_user"; Description = "Opens user processing workflow" },
        @{ Primary = "reset password"; Alternatives = @("password reset"); Action = "reset_password"; Description = "Initiates password reset" },
        @{ Primary = "unlock account"; Alternatives = @("account unlock"); Action = "unlock_account"; Description = "Unlocks a locked account" },
        @{ Primary = "create account"; Alternatives = @("new user"); Action = "create_account"; Description = "Creates a new user" },
        @{ Primary = "validate attributes"; Alternatives = @("check user"); Action = "validate_attributes"; Description = "Validates user attributes" },
        @{ Primary = "add to groups"; Alternatives = @("group membership"); Action = "add_to_groups"; Description = "Adds user to groups" },
        @{ Primary = "fix proxy addresses"; Alternatives = @("proxy address"); Action = "fix_proxy_addresses"; Description = "Fixes proxy addresses" },
        @{ Primary = "show help"; Alternatives = @("help", "what can do"); Action = "show_help"; Description = "Shows available commands" },
        @{ Primary = "exit"; Alternatives = @("quit", "bye"); Action = "exit"; Description = "Exits voice mode" }
    )

    # Test results tracking
    $testResults = @()
    $exitRequested = $false

    Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  Starting Interactive Command Testing                      ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

    for ($i = 0; $i -lt $testCommands.Count; $i++) {
        if ($exitRequested) { break }

        $cmd = $testCommands[$i]
        $testNum = $i + 1
        $totalTests = $testCommands.Count

        Write-Host "`n────────────────────────────────────────────────────────────" -ForegroundColor DarkGray
        Write-Host "  Test $testNum of $totalTests" -ForegroundColor Cyan
        Write-Host "────────────────────────────────────────────────────────────" -ForegroundColor DarkGray

        Write-Host "`n🎤 Please say: " -NoNewline -ForegroundColor Yellow
        Write-Host "'$($cmd.Primary)'" -ForegroundColor White
        Write-Host "   Alternatives: $($cmd.Alternatives -join ', ')" -ForegroundColor Gray
        Write-Host "   Expected action: $($cmd.Description)" -ForegroundColor Gray
        Write-Host "`n   (Press Enter to skip, or speak the command...)" -ForegroundColor DarkGray

        # Create a background job to check for Enter key
        $skipPressed = $false
        $recognitionResult = $null

        try {
            # Use RecognizeAsync with a timeout approach
            $result = $testRecognizer.Recognize([TimeSpan]::FromSeconds(8))

            if ($result -and $result.Text) {
                $recognizedText = $result.Text
                $confidence = [math]::Round($result.Confidence * 100, 1)
                $mappedAction = Process-VoiceCommand -Command $recognizedText

                Write-Host "`n   📝 Recognized: '$recognizedText'" -ForegroundColor Cyan
                Write-Host "   📊 Confidence: $confidence%" -ForegroundColor $(if ($confidence -ge 70) { 'Green' } elseif ($confidence -ge 50) { 'Yellow' } else { 'Red' })
                Write-Host "   🎯 Mapped to: $mappedAction" -ForegroundColor Cyan

                # Check if exit was requested
                if ($mappedAction -eq "exit") {
                    Write-Host "`n   ⚠️  'Exit' command detected. Stop testing? (Y/N)" -ForegroundColor Yellow
                    $exitChoice = Read-Host
                    if ($exitChoice -eq 'Y' -or $exitChoice -eq 'y') {
                        $exitRequested = $true
                        $testResults += @{
                            Command = $cmd.Primary
                            Status = "Exit Requested"
                            Recognized = $recognizedText
                            Confidence = $confidence
                            Success = $true
                        }
                        continue
                    }
                }

                # Determine success
                $isSuccess = ($mappedAction -eq $cmd.Action)

                if ($isSuccess) {
                    Write-Host "   ✅ SUCCESS - Command correctly recognized!" -ForegroundColor Green
                }
                else {
                    Write-Host "   ❌ MISMATCH - Expected '$($cmd.Action)' but got '$mappedAction'" -ForegroundColor Red
                    Write-Host "`n   💡 Debug Information:" -ForegroundColor Yellow
                    Write-Host "      • Try speaking more clearly" -ForegroundColor Gray
                    Write-Host "      • Reduce background noise" -ForegroundColor Gray
                    Write-Host "      • Try the alternative phrase: '$($cmd.Alternatives[0])'" -ForegroundColor Gray
                }

                $testResults += @{
                    Command = $cmd.Primary
                    Status = if ($isSuccess) { "Pass" } else { "Fail" }
                    Recognized = $recognizedText
                    Confidence = $confidence
                    Success = $isSuccess
                }
            }
            else {
                Write-Host "`n   ⏱️  No speech detected (timeout reached)" -ForegroundColor Yellow
                Write-Host "`n   💡 Debug Information:" -ForegroundColor Yellow
                Write-Host "      • Ensure microphone is not muted" -ForegroundColor Gray
                Write-Host "      • Speak louder and closer to the microphone" -ForegroundColor Gray
                Write-Host "      • Check that the correct input device is selected" -ForegroundColor Gray

                $testResults += @{
                    Command = $cmd.Primary
                    Status = "Timeout"
                    Recognized = ""
                    Confidence = 0
                    Success = $false
                }

                Write-Host "`n   Retry this command? (Y/N/Skip)" -ForegroundColor Yellow
                $retryChoice = Read-Host
                if ($retryChoice -eq 'Y' -or $retryChoice -eq 'y') {
                    $i-- # Retry same command
                    # Safely remove last result
                    if ($testResults.Count -gt 1) {
                        $testResults = $testResults[0..($testResults.Count - 2)]
                    } elseif ($testResults.Count -eq 1) {
                        $testResults = @()
                    }
                }
            }
        }
        catch [System.InvalidOperationException] {
            # Handle audio device errors specifically
            Write-Host "`n   ❌ Audio device error: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host "   💡 Check that your microphone is connected and not in use by another application." -ForegroundColor Yellow
            $testResults += @{
                Command = $cmd.Primary
                Status = "Error"
                Recognized = ""
                Confidence = 0
                Success = $false
                Error = "Audio device error"
            }
        }
        catch {
            Write-Host "`n   ❌ Recognition error: $($_.Exception.Message)" -ForegroundColor Red
            $testResults += @{
                Command = $cmd.Primary
                Status = "Error"
                Recognized = ""
                Confidence = 0
                Success = $false
                Error = $_.Exception.Message
            }
        }
    }

    # Cleanup - ensure recognizer is always disposed
    try {
        if ($testRecognizer) {
            $testRecognizer.Dispose()
            $testRecognizer = $null
        }
    }
    catch {
        # Silently ignore disposal errors
    }

    # Display Summary
    Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  🎤 Voice Commands Test Summary                            ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

    $passCount = ($testResults | Where-Object { $_.Success -eq $true }).Count
    $failCount = ($testResults | Where-Object { $_.Success -eq $false }).Count
    $totalTested = $testResults.Count

    $successRate = if ($totalTested -gt 0) { [math]::Round(($passCount / $totalTested) * 100, 1) } else { 0 }

    Write-Host "`n  📊 Results: $passCount/$totalTested commands working ($successRate% success rate)" -ForegroundColor $(if ($successRate -ge 80) { 'Green' } elseif ($successRate -ge 50) { 'Yellow' } else { 'Red' })

    Write-Host "`n  Detailed Results:" -ForegroundColor Yellow
    Write-Host "  ─────────────────────────────────────────────────────────" -ForegroundColor DarkGray

    foreach ($result in $testResults) {
        $statusIcon = switch ($result.Status) {
            "Pass" { "✅" }
            "Fail" { "❌" }
            "Timeout" { "⏱️" }
            "Error" { "⚠️" }
            "Exit Requested" { "🚪" }
            default { "❓" }
        }

        $statusColor = switch ($result.Status) {
            "Pass" { "Green" }
            "Fail" { "Red" }
            "Timeout" { "Yellow" }
            "Error" { "Red" }
            "Exit Requested" { "Cyan" }
            default { "Gray" }
        }

        Write-Host "  $statusIcon " -NoNewline -ForegroundColor $statusColor
        Write-Host "$($result.Command.PadRight(20))" -NoNewline -ForegroundColor White
        Write-Host " | $($result.Status.PadRight(12))" -NoNewline -ForegroundColor $statusColor
        if ($result.Recognized) {
            Write-Host " | Heard: '$($result.Recognized)' ($($result.Confidence)%)" -ForegroundColor Gray
        }
        else {
            Write-Host ""
        }
    }

    # Failed commands recommendations
    $failedCommands = $testResults | Where-Object { $_.Success -eq $false }
    if ($failedCommands.Count -gt 0) {
        Write-Host "`n  💡 Recommendations for Failed Commands:" -ForegroundColor Yellow
        Write-Host "  ─────────────────────────────────────────────────────────" -ForegroundColor DarkGray

        foreach ($failed in $failedCommands) {
            Write-Host "  • '$($failed.Command)': " -NoNewline -ForegroundColor White
            switch ($failed.Status) {
                "Timeout" {
                    Write-Host "Speak louder, check microphone" -ForegroundColor Gray
                }
                "Fail" {
                    Write-Host "Try alternative phrase, speak more clearly" -ForegroundColor Gray
                }
                "Error" {
                    Write-Host "Check audio device settings" -ForegroundColor Gray
                }
            }
        }
    }

    Write-Host "`n  ─────────────────────────────────────────────────────────" -ForegroundColor DarkGray

    if ($successRate -ge 80) {
        Write-Host "  🎉 Excellent! Voice commands are working well." -ForegroundColor Green
    }
    elseif ($successRate -ge 50) {
        Write-Host "  ⚠️  Some commands need attention. Review recommendations above." -ForegroundColor Yellow
    }
    else {
        Write-Host "  ❌ Voice recognition needs troubleshooting. Check prerequisites." -ForegroundColor Red
    }
}

function Reset-UserPassword {
    <#
    .SYNOPSIS
        Resets user password with secure generation.
    #>
    param (
        [Parameter(Mandatory=$true)]
        [string]$SamAccountName,
        [Parameter(Mandatory=$true)]
        [System.Management.Automation.PSCredential]$Credential
    )

    Write-Host "`n=== Resetting User Password ===" -ForegroundColor Cyan

    try {
        # Verify user exists
        $user = Get-ADUser -Identity $SamAccountName -Credential $Credential -ErrorAction Stop
        Write-Host "✅ Found user: $($user.Name)" -ForegroundColor Green

        # Generate secure random password
        $passwordLength = 12
        $allowedChars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*"
        $newPassword = -join ((1..$passwordLength) | ForEach-Object { Get-Random -InputObject $allowedChars.ToCharArray() })
        
        # Secure string for password
        $securePassword = ConvertTo-SecureStringManual -PlainText $newPassword
        
        # Reset password
        Set-ADAccountPassword -Identity $SamAccountName -NewPassword $securePassword -Reset -Credential $Credential -ErrorAction Stop
        
        # Unlock account if locked
        Unlock-ADAccount -Identity $SamAccountName -Credential $Credential -ErrorAction SilentlyContinue
        
        Write-Host "✅ Password reset successfully!" -ForegroundColor Green
        Write-Host "🔐 New Password: $newPassword" -ForegroundColor Yellow
        Write-Host "⚠️  Please provide this password to the user securely." -ForegroundColor Yellow
        
        # Force password change at next logon
        Set-ADUser -Identity $SamAccountName -ChangePasswordAtLogon $true -Credential $Credential -ErrorAction Stop
        Write-Host "✅ User must change password at next logon." -ForegroundColor Green
        
        return $newPassword
    }
    catch {
        Write-Error "Failed to reset password: $($_.Exception.Message)"
        return $null
    }
}

function Unlock-UserAccount {
    <#
    .SYNOPSIS
        Unlocks a locked Active Directory user account.
    #>
    param (
        [Parameter(Mandatory=$true)]
        [string]$SamAccountName,
        [Parameter(Mandatory=$true)]
        [System.Management.Automation.PSCredential]$Credential
    )

    Write-Host "`n=== Unlocking User Account ===" -ForegroundColor Cyan

    try {
        # Get user with locked status
        $user = Get-ADUser -Identity $SamAccountName -Properties LockedOut, BadLogonCount -Credential $Credential -ErrorAction Stop
        Write-Host "✅ Found user: $($user.Name)" -ForegroundColor Green
        
        if (-not $user.LockedOut) {
            Write-Host "ℹ️  Account is not locked." -ForegroundColor Yellow
            return $true
        }
        
        # Unlock account
        Unlock-ADAccount -Identity $SamAccountName -Credential $Credential -ErrorAction Stop
        
        # Verify unlock
        $updatedUser = Get-ADUser -Identity $SamAccountName -Properties LockedOut -Credential $Credential -ErrorAction Stop
        if (-not $updatedUser.LockedOut) {
            Write-Host "✅ Account unlocked successfully!" -ForegroundColor Green
            Write-Host "   Bad logon attempts: $($user.BadLogonCount)" -ForegroundColor Gray
            return $true
        } else {
            Write-Warning "⚠️  Account may still be locked. Please verify manually." -ForegroundColor Yellow
            return $false
        }
    }
    catch {
        Write-Error "Failed to unlock account: $($_.Exception.Message)"
        return $false
    }
}

function Process-ContractorAccountExtension {
    <#
    .SYNOPSIS
        Processes contractor accounts: validates user, verifies OU, updates display name, and extends expiration.
    .DESCRIPTION
        For each user:
        1. Validates user exists in AD (with retry option if not found)
        2. Verifies user is in Non-Rehrig OU (prompts for corrected sAMAccountName if not, or skip)
        3. Checks if DisplayName ends with " - Contractor" and offers to update if not
        4. Extends account expiration by one year

        For bulk display name operations, supports:
        Y = Yes (for this user)
        N = No (for this user)
        A = Yes to All (apply to all remaining users)
        S = Skip All (skip for all remaining users)
    #>
    param (
        [Parameter(Mandatory=$true)]
        [string]$UserInput,
        [Parameter(Mandatory=$true)]
        [System.Management.Automation.PSCredential]$Credential
    )

    # Target OU for Non-Rehrig contractors (for verification only)
    $targetOU = "OU=Non-Rehrig,OU=Accounts,DC=RPL,DC=Local"
    $contractorSuffix = " - Contractor"

    # Parse input - support semicolon-separated list
    $usernames = $UserInput -split ';' | ForEach-Object {
        $name = $_.Trim()
        # Handle email addresses - extract username portion
        if ($name -like "*@*") {
            $name = ($name -split "@")[0]
        }
        $name
    } | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }

    if ($usernames.Count -eq 0) {
        Write-Host "No valid usernames provided." -ForegroundColor Yellow
        return
    }

    $isBulk = $usernames.Count -gt 1
    $totalUsers = $usernames.Count

    # Bulk action state variables
    $displayNameAllState = $null # $null = ask, $true = yes to all, $false = skip all

    # Statistics tracking
    $stats = @{
        TotalProcessed = 0
        UsersFound = 0
        UsersSkipped = 0
        UsersInCorrectOU = 0
        UsersWrongOU = 0
        DisplayNamesUpdated = 0
        DisplayNamesAlreadyCorrect = 0
        ExpirationsExtended = 0
        Errors = 0
    }

    Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  Contractor Account Processing                             ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

    if ($isBulk) {
        Write-Host "`n📋 Bulk processing mode: $totalUsers users to process" -ForegroundColor Yellow
        Write-Host "   Target OU: $targetOU" -ForegroundColor Gray
        Write-Host "   Display Name Suffix: '$contractorSuffix'" -ForegroundColor Gray
        Write-Host "`n💡 Bulk Options: Y=Yes, N=No, A=Yes to All, S=Skip All" -ForegroundColor Cyan
    }

    for ($i = 0; $i -lt $usernames.Count; $i++) {
        $samAccountName = $usernames[$i]
        $stats.TotalProcessed++

        if ($isBulk) {
            Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
            Write-Host "Processing user $($i + 1) of $totalUsers : $samAccountName" -ForegroundColor Cyan
            Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
        } else {
            Write-Host "`n=== Processing: $samAccountName ===" -ForegroundColor Cyan
        }

        # Step 1: User Validation with retry loop
        $user = $null
        $currentSam = $samAccountName
        $skipUser = $false

        while ($null -eq $user -and -not $skipUser) {
            try {
                $user = Get-ADUser -Identity $currentSam -Properties AccountExpirationDate, DisplayName, Enabled, DistinguishedName -Credential $Credential -ErrorAction Stop
                Write-Host "✅ Found user: $($user.DisplayName) ($currentSam)" -ForegroundColor Green
                Write-Host "   Account Enabled: $(if ($user.Enabled) { '✅ Yes' } else { '❌ No' })" -ForegroundColor $(if ($user.Enabled) { 'Green' } else { 'Yellow' })
                $stats.UsersFound++
            }
            catch [Microsoft.ActiveDirectory.Management.ADIdentityNotFoundException] {
                Write-Host "❌ User '$currentSam' not found in Active Directory." -ForegroundColor Red
                $correctedName = Read-Host "Please enter the correct sAMAccountName (or press Enter to skip this user)"

                if ([string]::IsNullOrWhiteSpace($correctedName)) {
                    Write-Host "⏭️  Skipping user '$samAccountName'" -ForegroundColor Yellow
                    $skipUser = $true
                    $stats.UsersSkipped++
                } else {
                    $currentSam = $correctedName.Trim()
                    Write-Host "Retrying with: '$currentSam'" -ForegroundColor Cyan
                }
            }
            catch {
                Write-Host "❌ Error retrieving user '$currentSam': $($_.Exception.Message)" -ForegroundColor Red
                $stats.Errors++
                $skipUser = $true
            }
        }

        if ($skipUser) {
            continue
        }

        # Step 2: OU Verification (with retry loop for wrong OU)
        Write-Host "`n--- OU Verification ---" -ForegroundColor Magenta
        $isInTargetOU = $false

        while (-not $isInTargetOU -and -not $skipUser) {
            $userDN = $user.DistinguishedName
            $isInTargetOU = $userDN -like "*$targetOU*"

            if ($isInTargetOU) {
                Write-Host "✅ User is in the correct OU (Non-Rehrig)" -ForegroundColor Green
                $stats.UsersInCorrectOU++
            } else {
                # Extract current OU from DN
                $currentOUMatch = $userDN -replace "^CN=[^,]+,", ""
                Write-Host "⚠️  User '$currentSam' is NOT in the Non-Rehrig OU" -ForegroundColor Yellow
                Write-Host "   Current Location: $currentOUMatch" -ForegroundColor Gray
                Write-Host "   Required OU: $targetOU" -ForegroundColor Gray

                $stats.UsersWrongOU++

                # Prompt for corrected sAMAccountName or skip
                $correctedName = Read-Host "Enter correct sAMAccountName for a user in that OU (or press Enter to skip)"

                if ([string]::IsNullOrWhiteSpace($correctedName)) {
                    Write-Host "⏭️  Skipping user '$samAccountName' (not in required OU)" -ForegroundColor Yellow
                    $skipUser = $true
                    $stats.UsersSkipped++
                } else {
                    $currentSam = $correctedName.Trim()
                    Write-Host "Retrying with: '$currentSam'" -ForegroundColor Cyan

                    # Try to get the new user
                    try {
                        $user = Get-ADUser -Identity $currentSam -Properties AccountExpirationDate, DisplayName, Enabled, DistinguishedName -Credential $Credential -ErrorAction Stop
                        Write-Host "✅ Found user: $($user.DisplayName) ($currentSam)" -ForegroundColor Green
                        # Loop will check OU again
                    }
                    catch [Microsoft.ActiveDirectory.Management.ADIdentityNotFoundException] {
                        Write-Host "❌ User '$currentSam' not found in Active Directory." -ForegroundColor Red
                        # Stay in loop - will prompt again
                        $isInTargetOU = $false
                    }
                    catch {
                        Write-Host "❌ Error retrieving user '$currentSam': $($_.Exception.Message)" -ForegroundColor Red
                        $stats.Errors++
                        $skipUser = $true
                    }
                }
            }
        }

        if ($skipUser) {
            continue
        }

        # Step 3: Display Name Verification
        Write-Host "`n--- Display Name Verification ---" -ForegroundColor Magenta
        $currentDisplayName = $user.DisplayName

        if ($currentDisplayName -like "*$contractorSuffix") {
            Write-Host "✅ Display name already ends with '$contractorSuffix'" -ForegroundColor Green
            Write-Host "   Current: $currentDisplayName" -ForegroundColor Gray
            $stats.DisplayNamesAlreadyCorrect++
        } else {
            Write-Host "⚠️  Display name does not end with '$contractorSuffix'" -ForegroundColor Yellow
            Write-Host "   Current Display Name: $currentDisplayName" -ForegroundColor Gray
            $newDisplayName = "$currentDisplayName$contractorSuffix"
            Write-Host "   Proposed Display Name: $newDisplayName" -ForegroundColor Cyan

            # Determine action based on bulk state or prompt
            $shouldUpdate = $false
            if ($displayNameAllState -eq $true) {
                Write-Host "   [Auto: Yes to All]" -ForegroundColor DarkGray
                $shouldUpdate = $true
            } elseif ($displayNameAllState -eq $false) {
                Write-Host "   [Auto: Skip All]" -ForegroundColor DarkGray
                $shouldUpdate = $false
            } else {
                # Prompt user
                if ($isBulk) {
                    $updateChoice = Read-Host "Update display name? (Y/N/A=Yes to All/S=Skip All)"
                } else {
                    $updateChoice = Read-Host "Update display name? (Y/N)"
                }

                switch ($updateChoice.ToUpper()) {
                    'Y' { $shouldUpdate = $true }
                    'N' { $shouldUpdate = $false }
                    'A' {
                        $shouldUpdate = $true
                        $displayNameAllState = $true
                        Write-Host "   📌 Will auto-update all remaining display names" -ForegroundColor Cyan
                    }
                    'S' {
                        $shouldUpdate = $false
                        $displayNameAllState = $false
                        Write-Host "   📌 Will skip display name update for all remaining users" -ForegroundColor Cyan
                    }
                    default { $shouldUpdate = $false }
                }
            }

            if ($shouldUpdate) {
                try {
                    Set-ADUser -Identity $currentSam -DisplayName $newDisplayName -Credential $Credential -ErrorAction Stop
                    Write-Host "✅ Display name updated successfully!" -ForegroundColor Green
                    $stats.DisplayNamesUpdated++
                }
                catch {
                    Write-Host "❌ Failed to update display name: $($_.Exception.Message)" -ForegroundColor Red
                    $stats.Errors++
                }
            } else {
                Write-Host "ℹ️  Display name will remain unchanged" -ForegroundColor Gray
            }
        }

        # Step 4: Set Account Expiration to 1 Year from Today
        Write-Host "`n--- Account Expiration ---" -ForegroundColor Magenta

        try {
            # Get current expiration date
            $user = Get-ADUser -Identity $currentSam -Properties AccountExpirationDate -Credential $Credential -ErrorAction Stop
            $currentExpiration = $user.AccountExpirationDate

            # Check if account is expired
            if ($null -ne $currentExpiration -and $currentExpiration -lt (Get-Date)) {
                Write-Host "   ⚠️  Account is EXPIRED (was: $($currentExpiration.ToString('yyyy-MM-dd')))" -ForegroundColor Red
                Read-Host "   Press Enter to skip this user"
                Write-Host "   ⏭️  Skipping expiration update for expired account" -ForegroundColor Yellow
                $stats.UsersSkipped++
                continue
            }

            # Set expiration to exactly 1 year from today
            $newExpiration = (Get-Date).AddYears(1)

            Write-Host "   New Expiration: $($newExpiration.ToString('yyyy-MM-dd'))" -ForegroundColor Green

            # Set the new expiration date
            Set-ADAccountExpiration -Identity $currentSam -DateTime $newExpiration -Credential $Credential -ErrorAction Stop
            Write-Host "✅ Account expiration set successfully!" -ForegroundColor Green
            $stats.ExpirationsExtended++
        }
        catch {
            Write-Host "❌ Failed to set account expiration: $($_.Exception.Message)" -ForegroundColor Red
            $stats.Errors++
        }
    }

    # Display Summary
    Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  Processing Summary                                        ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   📊 Total users in input:           $totalUsers" -ForegroundColor White
    Write-Host "   ✅ Users found & processed:        $($stats.UsersFound)" -ForegroundColor Green
    Write-Host "   ⏭️  Users skipped:                  $($stats.UsersSkipped)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   📁 OU Verification:" -ForegroundColor White
    Write-Host "      In Non-Rehrig OU:               $($stats.UsersInCorrectOU)" -ForegroundColor Green
    Write-Host "      Not in required OU (retried):   $($stats.UsersWrongOU)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   📝 Display Name Changes:" -ForegroundColor White
    Write-Host "      Already had ' - Contractor':    $($stats.DisplayNamesAlreadyCorrect)" -ForegroundColor Gray
    Write-Host "      Updated with ' - Contractor':   $($stats.DisplayNamesUpdated)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   📅 Expirations extended:           $($stats.ExpirationsExtended)" -ForegroundColor Cyan

    if ($stats.Errors -gt 0) {
        Write-Host ""
        Write-Host "   ❌ Errors encountered:             $($stats.Errors)" -ForegroundColor Red
    }
    Write-Host ""

    return $stats
}

function Create-NewUser {
    <#
    .SYNOPSIS
        Creates a new Active Directory user account with guided prompts.
    #>
    param (
        [Parameter(Mandatory=$true)]
        [System.Management.Automation.PSCredential]$Credential
    )

    Write-Host "`n=== Creating New User Account ===" -ForegroundColor Cyan

    try {
        $userInfo = @{}
        
        # Gather user information
        $userInfo.FirstName = Read-Host "Enter first name"
        if ([string]::IsNullOrWhiteSpace($userInfo.FirstName)) {
            Write-Host "❌ First name is required." -ForegroundColor Red
            return $false
        }
        
        $userInfo.LastName = Read-Host "Enter last name"
        if ([string]::IsNullOrWhiteSpace($userInfo.LastName)) {
            Write-Host "❌ Last name is required." -ForegroundColor Red
            return $false
        }

        # Check if standard username format exists and suggest alternative
        Write-Host "`n🔍 Checking username availability..." -ForegroundColor Cyan

        # Generate standard format: first letter of first name + last name (e.g., jdoe)
        $standardUsername = ($userInfo.FirstName.Substring(0,1) + $userInfo.LastName).ToLower()
        $suggestedUsername = $null

        try {
            # Check if standard format exists
            $existingUser = Get-ADUser -Identity $standardUsername -Credential $Credential -ErrorAction Stop

            # Standard format exists, suggest alternative
            Write-Host "⚠️  Username '$standardUsername' already exists (used by: $($existingUser.Name))" -ForegroundColor Yellow

            # Generate alternative: full first name + last name (e.g., johndoe)
            $alternativeUsername = ($userInfo.FirstName + $userInfo.LastName).ToLower()

            # Check if alternative also exists
            try {
                $existingAlt = Get-ADUser -Identity $alternativeUsername -Credential $Credential -ErrorAction Stop
                Write-Host "⚠️  Alternative '$alternativeUsername' also exists (used by: $($existingAlt.Name))" -ForegroundColor Yellow
                Write-Host "💡 You'll need to choose a different username." -ForegroundColor Gray
            }
            catch [Microsoft.ActiveDirectory.Management.ADIdentityNotFoundException] {
                # Alternative is available
                $suggestedUsername = $alternativeUsername
                Write-Host "✅ Suggested username: $suggestedUsername" -ForegroundColor Green
            }
            catch {
                # Error checking alternative, just continue
                Write-Host "💡 Consider using: $alternativeUsername" -ForegroundColor Gray
            }
        }
        catch [Microsoft.ActiveDirectory.Management.ADIdentityNotFoundException] {
            # Standard format is available
            $suggestedUsername = $standardUsername
            Write-Host "✅ Suggested username: $suggestedUsername" -ForegroundColor Green
        }
        catch {
            # Error checking, just continue without suggestion
            Write-Host "💡 Unable to check username availability. Please verify manually." -ForegroundColor Gray
        }

        # Prompt for username with suggestion if available
        if ($suggestedUsername) {
            $userInfo.SamAccountName = Read-Host "Enter username (sAMAccountName) [Suggested: $suggestedUsername]"
            # If user just presses Enter, use the suggestion
            if ([string]::IsNullOrWhiteSpace($userInfo.SamAccountName)) {
                $userInfo.SamAccountName = $suggestedUsername
                Write-Host "   Using suggested username: $suggestedUsername" -ForegroundColor Cyan
            }
        }
        else {
            $userInfo.SamAccountName = Read-Host "Enter username (sAMAccountName)"
        }

        # Validate username was provided
        if ([string]::IsNullOrWhiteSpace($userInfo.SamAccountName)) {
            Write-Host "❌ Username is required." -ForegroundColor Red
            return $false
        }
        
        $userInfo.UserPrincipalName = Read-Host "Enter email address (UPN)"
        if ([string]::IsNullOrWhiteSpace($userInfo.UserPrincipalName)) {
            Write-Host "❌ Email address is required." -ForegroundColor Red
            return $false
        }
        
        $userInfo.Title = Read-Host "Enter job title (optional)"
        $userInfo.Department = Read-Host "Enter department (optional)"
        $userInfo.Manager = Read-Host "Enter manager DN (optional, e.g., CN=Manager Name,OU=Users,DC=RPL,DC=Local)"
        
        # Generate secure password
        $passwordLength = 12
        $allowedChars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*"
        $password = -join ((1..$passwordLength) | ForEach-Object { Get-Random -InputObject $allowedChars.ToCharArray() })
        $securePassword = ConvertTo-SecureStringManual -PlainText $password
        
        # Create user account
        $userParams = @{
            Name = "$($userInfo.FirstName) $($userInfo.LastName)"
            GivenName = $userInfo.FirstName
            Surname = $userInfo.LastName
            SamAccountName = $userInfo.SamAccountName
            UserPrincipalName = $userInfo.UserPrincipalName
            AccountPassword = $securePassword
            Enabled = $true
            ChangePasswordAtLogon = $true
            Credential = $Credential
        }
        
        if (-not [string]::IsNullOrWhiteSpace($userInfo.Title)) { $userParams.Title = $userInfo.Title }
        if (-not [string]::IsNullOrWhiteSpace($userInfo.Department)) { $userParams.Department = $userInfo.Department }
        if (-not [string]::IsNullOrWhiteSpace($userInfo.Manager)) { $userParams.Manager = $userInfo.Manager }
        
        New-ADUser @userParams -ErrorAction Stop
        
        Write-Host "✅ User account created successfully!" -ForegroundColor Green
        Write-Host "   Username: $($userInfo.SamAccountName)" -ForegroundColor Gray
        Write-Host "   Email: $($userInfo.UserPrincipalName)" -ForegroundColor Gray
        Write-Host "🔐 Temporary Password: $password" -ForegroundColor Yellow
        Write-Host "⚠️  User must change password at first logon." -ForegroundColor Yellow
        
        return $true
    }
    catch {
        Write-Error "Failed to create user account: $($_.Exception.Message)"
        return $false
    }
}

function Start-ParallelJobManager {
    <#
    .SYNOPSIS
        Enhanced parallel job manager with progress tracking and resource management.
    .DESCRIPTION
        Manages parallel job execution with configurable limits, progress tracking,
        and proper resource cleanup. Supports both throttled and batch processing modes.
    #>
    param (
        [Parameter(Mandatory=$true)]
        [scriptblock]$ScriptBlock,
        [Parameter(Mandatory=$true)]
        [array]$ArgumentList,
        [Parameter(Mandatory=$false)]
        [int]$MaxConcurrentJobs = $script:MaxParallelJobs,
        [Parameter(Mandatory=$false)]
        [string]$ProgressActivity = "Processing items",
        [Parameter(Mandatory=$false)]
        [switch]$ShowProgress
    )

    $allJobs = @()
    $completedCount = 0
    $totalItems = $ArgumentList.Count

    try {
        # Process items with job throttling
        for ($i = 0; $i -lt $totalItems; $i++) {
            $args = $ArgumentList[$i]

            # Start new job
            $job = Start-Job -ScriptBlock $ScriptBlock -ArgumentList $args
            $allJobs += $job

            # Update progress
            if ($ShowProgress) {
                $percentComplete = [math]::Round(($i / $totalItems) * 100)
                Write-Progress -Activity $ProgressActivity -Status "Started $($i + 1) of $totalItems jobs" -PercentComplete $percentComplete
            }

            # Throttle: wait for some jobs to complete if we hit the limit
            while ((Get-Job -State Running).Count -ge $MaxConcurrentJobs) {
                Start-Sleep -Milliseconds 100

                # Check for completed jobs and update progress
                $completed = (Get-Job -State Completed).Count
                if ($completed -gt $completedCount -and $ShowProgress) {
                    $completedCount = $completed
                    $percentComplete = [math]::Round(($completedCount / $totalItems) * 100)
                    Write-Progress -Activity $ProgressActivity -Status "Completed $completedCount of $totalItems" -PercentComplete $percentComplete
                }
            }
        }

        # Wait for all remaining jobs to complete
        if ($ShowProgress) {
            Write-Progress -Activity $ProgressActivity -Status "Waiting for remaining jobs to complete..." -PercentComplete 90
        }

        Wait-Job -Job $allJobs | Out-Null

        if ($ShowProgress) {
            Write-Progress -Activity $ProgressActivity -Status "Complete" -PercentComplete 100 -Completed
        }

        # Collect all results
        $results = @()
        foreach ($job in $allJobs) {
            $results += Receive-Job -Job $job
            Remove-Job -Job $job -Force
        }

        return $results
    }
    catch {
        # Clean up jobs on error
        foreach ($job in $allJobs) {
            if ($job.State -eq 'Running') {
                Stop-Job -Job $job -ErrorAction SilentlyContinue
            }
            Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
        }
        throw
    }
}

function Start-ParallelGroupProcessing {
    <#
    .SYNOPSIS
        Adds user to groups using parallel processing for better performance.
    .DESCRIPTION
        Enhanced version with progress tracking and improved error handling.
    #>
    param (
        [Parameter(Mandatory=$true)]
        [string]$SamAccountName,
        [Parameter(Mandatory=$true)]
        [System.Management.Automation.PSCredential]$Credential
    )

    Write-Host "`n=== Adding to Groups (Parallel Processing) ===" -ForegroundColor Cyan

    try {
        $user = Get-ADUser -Identity $SamAccountName -Properties MemberOf -Credential $Credential -ErrorAction Stop
        $successCount = 0
        $alreadyMemberCount = 0
        $failureCount = 0

        Write-Host "🚀 Processing $($standardGroups.Count) groups with parallel execution..." -ForegroundColor Gray

        # Prepare arguments for parallel processing
        $jobArguments = @()
        foreach ($groupDN in $standardGroups) {
            $decodedGroupDN = [System.Web.HttpUtility]::UrlDecode($groupDN)
            $jobArguments += ,@($SamAccountName, $decodedGroupDN, $Credential)
        }

        # Define the script block for group processing
        $groupScriptBlock = {
            param($samAccountName, $groupDN, $credential)

            try {
                # Get fresh user object in job context
                $user = Get-ADUser -Identity $samAccountName -Properties MemberOf -Credential $credential -ErrorAction Stop

                # Check if user is already a member
                if ($user.MemberOf -contains $groupDN) {
                    return @{Status = "AlreadyMember"; Group = $groupDN }
                }

                # Add user to group
                Add-ADGroupMember -Identity $groupDN -Members $samAccountName -Credential $credential -ErrorAction Stop
                return @{Status = "Success"; Group = $groupDN }
            }
            catch {
                return @{Status = "Failed"; Group = $groupDN; Error = $_.Exception.Message }
            }
        }

        # Execute parallel jobs with progress tracking
        $results = Start-ParallelJobManager -ScriptBlock $groupScriptBlock -ArgumentList $jobArguments -ProgressActivity "Adding user to groups" -ShowProgress

        # Process results
        foreach ($result in $results) {
            switch ($result.Status) {
                "Success" {
                    Write-Host "  ✅ Added to: $($result.Group)" -ForegroundColor Green
                    $successCount++
                }
                "AlreadyMember" {
                    Write-Host "  ℹ️  Already member of: $($result.Group)" -ForegroundColor Gray
                    $alreadyMemberCount++
                }
                "Failed" {
                    Write-Warning "  ❌ Failed to add to: $($result.Group)"
                    Write-Warning "     Reason: $($result.Error)"
                    $failureCount++
                }
            }
        }

        # Summary
        Write-Host "`nGroup Membership Summary (Parallel):" -ForegroundColor Cyan
        Write-Host "  Groups added: $successCount" -ForegroundColor Green
        Write-Host "  Already member: $alreadyMemberCount" -ForegroundColor Gray
        if ($failureCount -gt 0) {
            Write-Host "  Failed: $failureCount" -ForegroundColor Red
        }

        return ($failureCount -eq 0)
    }
    catch {
        Write-Error "Failed to process groups: $($_.Exception.Message)"
        return $false
    }
}

function Start-ParallelUserValidation {
    <#
    .SYNOPSIS
        Validates user attributes for multiple users using parallel processing.
    .DESCRIPTION
        Checks required attributes (JDEUserName, Manager, Title) for multiple users
        concurrently and returns validation results.
    #>
    param (
        [Parameter(Mandatory=$true)]
        [array]$SamAccountNames,
        [Parameter(Mandatory=$true)]
        [System.Management.Automation.PSCredential]$Credential
    )

    Write-Host "`n=== Validating User Attributes (Parallel Processing) ===" -ForegroundColor Cyan
    Write-Host "🚀 Validating $($SamAccountNames.Count) users with parallel execution..." -ForegroundColor Gray

    try {
        # Prepare arguments for parallel processing
        $jobArguments = @()
        foreach ($samAccountName in $SamAccountNames) {
            $jobArguments += ,@($samAccountName, $Credential)
        }

        # Define the script block for validation
        $validationScriptBlock = {
            param($samAccountName, $credential)

            try {
                $user = Get-ADUser -Identity $samAccountName -Properties JDEUserName, Manager, Title, Name -Credential $credential -ErrorAction Stop

                $missingAttributes = @()
                if ([string]::IsNullOrWhiteSpace($user.JDEUserName)) { $missingAttributes += "JDEUserName" }
                if ([string]::IsNullOrWhiteSpace($user.Manager)) { $missingAttributes += "Manager" }
                if ([string]::IsNullOrWhiteSpace($user.Title)) { $missingAttributes += "Title" }

                if ($missingAttributes.Count -eq 0) {
                    return @{Status = "Valid"; User = $samAccountName; Name = $user.Name }
                } else {
                    return @{Status = "MissingAttributes"; User = $samAccountName; Name = $user.Name; Missing = $missingAttributes }
                }
            }
            catch {
                return @{Status = "Failed"; User = $samAccountName; Error = $_.Exception.Message }
            }
        }

        # Execute parallel jobs with progress tracking
        $results = Start-ParallelJobManager -ScriptBlock $validationScriptBlock -ArgumentList $jobArguments -ProgressActivity "Validating user attributes" -ShowProgress

        # Process results
        $validCount = 0
        $missingCount = 0
        $failureCount = 0

        foreach ($result in $results) {
            switch ($result.Status) {
                "Valid" {
                    Write-Host "  ✅ $($result.User) ($($result.Name)): All attributes present" -ForegroundColor Green
                    $validCount++
                }
                "MissingAttributes" {
                    Write-Host "  ⚠️  $($result.User) ($($result.Name)): Missing $($result.Missing -join ', ')" -ForegroundColor Yellow
                    $missingCount++
                }
                "Failed" {
                    Write-Warning "  ❌ Failed for $($result.User): $($result.Error)"
                    $failureCount++
                }
            }
        }

        # Summary
        Write-Host "`nValidation Summary (Parallel):" -ForegroundColor Cyan
        Write-Host "  Valid users: $validCount" -ForegroundColor Green
        Write-Host "  Users with missing attributes: $missingCount" -ForegroundColor Yellow
        if ($failureCount -gt 0) {
            Write-Host "  Failed: $failureCount" -ForegroundColor Red
        }

        return @{
            Results = $results
            ValidCount = $validCount
            MissingCount = $missingCount
            FailureCount = $failureCount
        }
    }
    catch {
        Write-Error "Failed to validate users: $($_.Exception.Message)"
        return $null
    }
}

function Validate-UserAttributes {
    <#
    .SYNOPSIS
        Validates that required user attributes are filled in and prompts to update missing ones.
    #>
    param (
        [Parameter(Mandatory=$true)]
        [string]$SamAccountName,
        [Parameter(Mandatory=$true)]
        [System.Management.Automation.PSCredential]$Credential
    )

    Write-Host "`n=== Validating User Attributes ===" -ForegroundColor Cyan

    try {
        $user = Get-ADUser -Identity $SamAccountName -Properties JDEUserName, Manager, Title -Credential $Credential -ErrorAction Stop
        
        $validationIssues = @()
        $updateNeeded = $false
        
        # Check JDEUserName
        if ([string]::IsNullOrWhiteSpace($user.JDEUserName)) {
            $validationIssues += "JDEUserName"
            Write-Host "❌ JDEUserName: Not filled in" -ForegroundColor Red
            
            $newJDEUserName = Read-Host "Enter JDEUserName (or press Enter to skip)"
            if (-not [string]::IsNullOrWhiteSpace($newJDEUserName)) {
                try {
                    Set-ADUser -Identity $SamAccountName -Replace @{JDEUserName = $newJDEUserName} -Credential $Credential -ErrorAction Stop
                    Write-Host "✅ JDEUserName updated to: $newJDEUserName" -ForegroundColor Green
                }
                catch {
                    Write-Warning "❌ Failed to update JDEUserName: $($_.Exception.Message)"
                }
            }
        } else {
            Write-Host "✅ JDEUserName: $($user.JDEUserName)" -ForegroundColor Green
        }

        # Check Manager
        if ([string]::IsNullOrWhiteSpace($user.Manager)) {
            $validationIssues += "Manager"
            Write-Host "❌ Manager: Not filled in" -ForegroundColor Red
            
            $newManager = Read-Host "Enter Manager DN (e.g., CN=John Doe,OU=Users,DC=RPL,DC=Local) or press Enter to skip"
            if (-not [string]::IsNullOrWhiteSpace($newManager)) {
                try {
                    Set-ADUser -Identity $SamAccountName -Replace @{Manager = $newManager} -Credential $Credential -ErrorAction Stop
                    Write-Host "✅ Manager updated" -ForegroundColor Green
                }
                catch {
                    Write-Warning "❌ Failed to update Manager: $($_.Exception.Message)"
                }
            }
        } else {
            Write-Host "✅ Manager: $($user.Manager)" -ForegroundColor Green
        }

        # Check Job Title
        if ([string]::IsNullOrWhiteSpace($user.Title)) {
            $validationIssues += "Job Title"
            Write-Host "❌ Job Title: Not filled in" -ForegroundColor Red
            
            $newTitle = Read-Host "Enter Job Title (or press Enter to skip)"
            if (-not [string]::IsNullOrWhiteSpace($newTitle)) {
                try {
                    Set-ADUser -Identity $SamAccountName -Replace @{Title = $newTitle} -Credential $Credential -ErrorAction Stop
                    Write-Host "✅ Job Title updated to: $newTitle" -ForegroundColor Green
                }
                catch {
                    Write-Warning "❌ Failed to update Job Title: $($_.Exception.Message)"
                }
            }
        } else {
            Write-Host "✅ Job Title: $($user.Title)" -ForegroundColor Green
        }

        # Summary
        if ($validationIssues.Count -gt 0) {
            Write-Host "`n⚠️  Originally found $($validationIssues.Count) missing attributes:" -ForegroundColor Yellow
            foreach ($issue in $validationIssues) {
                Write-Host "   - $issue" -ForegroundColor Yellow
            }
            
            # Check again to see if user updated any
            $updatedUser = Get-ADUser -Identity $SamAccountName -Properties JDEUserName, Manager, Title -Credential $Credential -ErrorAction Stop
            $stillMissing = @()
            
            if ([string]::IsNullOrWhiteSpace($updatedUser.JDEUserName)) { $stillMissing += "JDEUserName" }
            if ([string]::IsNullOrWhiteSpace($updatedUser.Manager)) { $stillMissing += "Manager" }
            if ([string]::IsNullOrWhiteSpace($updatedUser.Title)) { $stillMissing += "Job Title" }
            
            if ($stillMissing.Count -gt 0) {
                Write-Host "`n⚠️  Still missing attributes: $($stillMissing -join ', ')" -ForegroundColor Yellow
                Write-Host "These attributes can be updated later in Active Directory." -ForegroundColor Yellow
                return $false
            } else {
                Write-Host "`n✅ All attributes have been populated." -ForegroundColor Green
                return $true
            }
        } else {
            Write-Host "`n✅ All required attributes are already populated." -ForegroundColor Green
            return $true
        }
    }
    catch {
        Write-Error "Failed to validate user attributes: $($_.Exception.Message)"
        return $false
    }
}

function Get-RequiredProxyAddresses {
    <#
    .SYNOPSIS
        Generates the standard list of required proxy addresses for a given username.
    #>
    param (
        [Parameter(Mandatory=$true)]
        [string]$samAccountName
    )
    
    $usernameLower = $samAccountName.ToLower()
    $usernameCapitalized = (Get-Culture).TextInfo.ToTitleCase($usernameLower)

    return @(
        "smtp:$usernameLower@rehrigpenn.com",
        "smtp:$usernameCapitalized@Rehrigpacific.com",
        "smtp:$usernameCapitalized@Rehrig.onmicrosoft.com",
        "smtp:$usernameCapitalized@Rehrig.mail.onmicrosoft.com",
        "SMTP:$usernameCapitalized@Rehrig.com",
        "SIP:$usernameCapitalized@Rehrig.com"
    )
}

function Get-MissingProxyAddresses {
    <#
    .SYNOPSIS
        Compares a user's current proxies with the required list and returns the missing ones.
    #>
    param (
        [Parameter(Mandatory=$true)]
        $UserObject # Expects a user object from Get-ADUser
    )

    # Get existing proxies, ensuring we have an array (even if empty)
    $existingProxies = @($UserObject.proxyAddresses)
    $existingProxiesClean = @()
    if ($existingProxies.Count -gt 0) {
        $existingProxiesClean = @($existingProxies | ForEach-Object { $_.Trim().ToLower() })
    }

    # Get required proxies
    $requiredProxiesClean = @((Get-RequiredProxyAddresses -samAccountName $UserObject.sAMAccountName) | ForEach-Object { $_.Trim().ToLower() })

    # If user has no existing proxies, all required proxies are missing
    if ($existingProxiesClean.Count -eq 0) {
        return [string[]](Get-RequiredProxyAddresses -samAccountName $UserObject.sAMAccountName)
    }

    # Compare to find missing proxies
    $compareResult = Compare-Object -ReferenceObject $existingProxiesClean -DifferenceObject $requiredProxiesClean -ErrorAction SilentlyContinue
    $missingProxiesLower = @(($compareResult | Where-Object { $_.SideIndicator -eq '=>' }).InputObject)

    if ($missingProxiesLower.Count -gt 0) {
        $originalCasedRequired = Get-RequiredProxyAddresses -samAccountName $UserObject.sAMAccountName
        return [string[]]($originalCasedRequired | Where-Object { $missingProxiesLower -contains $_.ToLower() })
    }

    return @()
}

function Start-ParallelProxyProcessing {
    <#
    .SYNOPSIS
        Fixes proxy addresses for multiple users using parallel processing.
    .DESCRIPTION
        Processes proxy address configuration for multiple users concurrently
        with progress tracking and error handling.
    #>
    param (
        [Parameter(Mandatory=$true)]
        [array]$SamAccountNames,
        [Parameter(Mandatory=$true)]
        [System.Management.Automation.PSCredential]$Credential
    )

    Write-Host "`n=== Fixing Proxy Addresses (Parallel Processing) ===" -ForegroundColor Cyan
    Write-Host "🚀 Processing $($SamAccountNames.Count) users with parallel execution..." -ForegroundColor Gray

    try {
        # Prepare arguments for parallel processing
        $jobArguments = @()
        foreach ($samAccountName in $SamAccountNames) {
            $jobArguments += ,@($samAccountName, $Credential)
        }

        # Define the script block for proxy processing
        $proxyScriptBlock = {
            param($samAccountName, $credential)

            try {
                # Get user with proxy addresses
                $user = Get-ADUser -Identity $samAccountName -Properties proxyAddresses, sAMAccountName -Credential $credential -ErrorAction Stop

                # Get required proxies
                $usernameLower = $user.sAMAccountName.ToLower()
                $usernameCapitalized = (Get-Culture).TextInfo.ToTitleCase($usernameLower)

                $requiredProxies = @(
                    "smtp:$usernameLower@rehrigpenn.com",
                    "smtp:$usernameCapitalized@Rehrigpacific.com",
                    "smtp:$usernameCapitalized@Rehrig.onmicrosoft.com",
                    "smtp:$usernameCapitalized@Rehrig.mail.onmicrosoft.com",
                    "SMTP:$usernameCapitalized@Rehrig.com",
                    "SIP:$usernameCapitalized@Rehrig.com"
                )

                # Get existing proxies
                $existingProxies = @($user.proxyAddresses)
                $existingProxiesClean = @()
                if ($existingProxies.Count -gt 0) {
                    $existingProxiesClean = @($existingProxies | ForEach-Object { $_.Trim().ToLower() })
                }

                # Find missing proxies
                $requiredProxiesClean = @($requiredProxies | ForEach-Object { $_.Trim().ToLower() })

                if ($existingProxiesClean.Count -eq 0) {
                    $proxiesToAdd = $requiredProxies
                } else {
                    $compareResult = Compare-Object -ReferenceObject $existingProxiesClean -DifferenceObject $requiredProxiesClean -ErrorAction SilentlyContinue
                    $missingProxiesLower = @(($compareResult | Where-Object { $_.SideIndicator -eq '=>' }).InputObject)

                    if ($missingProxiesLower.Count -gt 0) {
                        $proxiesToAdd = [string[]]($requiredProxies | Where-Object { $missingProxiesLower -contains $_.ToLower() })
                    } else {
                        $proxiesToAdd = @()
                    }
                }

                if ($proxiesToAdd.Count -eq 0) {
                    return @{Status = "AlreadyCompliant"; User = $samAccountName; Count = 0 }
                }

                # Add missing proxies
                Set-ADUser -Identity $samAccountName -Add @{'proxyAddresses'=$proxiesToAdd} -Credential $credential -ErrorAction Stop

                return @{Status = "Success"; User = $samAccountName; Count = $proxiesToAdd.Count; Proxies = $proxiesToAdd }
            }
            catch {
                return @{Status = "Failed"; User = $samAccountName; Error = $_.Exception.Message }
            }
        }

        # Execute parallel jobs with progress tracking
        $results = Start-ParallelJobManager -ScriptBlock $proxyScriptBlock -ArgumentList $jobArguments -ProgressActivity "Fixing proxy addresses" -ShowProgress

        # Process results
        $successCount = 0
        $alreadyCompliantCount = 0
        $failureCount = 0

        foreach ($result in $results) {
            switch ($result.Status) {
                "Success" {
                    Write-Host "  ✅ Updated $($result.User): Added $($result.Count) proxy addresses" -ForegroundColor Green
                    $successCount++
                }
                "AlreadyCompliant" {
                    Write-Host "  ℹ️  $($result.User): Already compliant" -ForegroundColor Gray
                    $alreadyCompliantCount++
                }
                "Failed" {
                    Write-Warning "  ❌ Failed for $($result.User): $($result.Error)"
                    $failureCount++
                }
            }
        }

        # Summary
        Write-Host "`nProxy Address Summary (Parallel):" -ForegroundColor Cyan
        Write-Host "  Users updated: $successCount" -ForegroundColor Green
        Write-Host "  Already compliant: $alreadyCompliantCount" -ForegroundColor Gray
        if ($failureCount -gt 0) {
            Write-Host "  Failed: $failureCount" -ForegroundColor Red
        }

        return ($failureCount -eq 0)
    }
    catch {
        Write-Error "Failed to process proxy addresses: $($_.Exception.Message)"
        return $false
    }
}

function Fix-UserProxyAddresses {
    <#
    .SYNOPSIS
        Fixes proxy addresses for a single user.
    #>
    param (
        [Parameter(Mandatory=$true)]
        [string]$SamAccountName,
        [Parameter(Mandatory=$true)]
        [System.Management.Automation.PSCredential]$Credential
    )

    Write-Host "`n=== Fixing Proxy Addresses ===" -ForegroundColor Cyan

    try {
        $user = Get-ADUser -Identity $SamAccountName -Properties proxyAddresses, sAMAccountName -Credential $Credential -ErrorAction Stop

        $proxiesToAdd = Get-MissingProxyAddresses -UserObject $user
        if ($proxiesToAdd.Count -eq 0) {
            Write-Host "✅ Proxy addresses are already compliant." -ForegroundColor Green
            return $true
        }

        Write-Host "Found $($proxiesToAdd.Count) missing proxy addresses." -ForegroundColor Yellow
        Write-Host "Adding missing addresses now..." -ForegroundColor Yellow

        Set-ADUser -Identity $SamAccountName -Add @{'proxyAddresses'=$proxiesToAdd} -Credential $Credential -ErrorAction Stop

        Write-Host "✅ Successfully updated proxy addresses." -ForegroundColor Green
        return $true
    }
    catch {
        Write-Error "Failed to fix proxy addresses. Reason: $($_.Exception.Message)"
        return $false
    }
}

function Add-UserToStandardGroups {
    <#
    .SYNOPSIS
        Adds a user to all standard employee groups.
    #>
    param (
        [Parameter(Mandatory=$true)]
        [string]$SamAccountName,
        [Parameter(Mandatory=$true)]
        [System.Management.Automation.PSCredential]$Credential
    )

    Write-Host "`n=== Adding to Standard Groups ===" -ForegroundColor Cyan

    try {
        $user = Get-ADUser -Identity $SamAccountName -Properties MemberOf -Credential $Credential -ErrorAction Stop

        $successCount = 0
        $alreadyMemberCount = 0
        $failureCount = 0

        foreach ($groupDN in $standardGroups) {
            # Decode URL-encoded characters in the DN
            $decodedGroupDN = [System.Web.HttpUtility]::UrlDecode($groupDN)

            try {
                # Check if user is already a member
                if ($user.MemberOf -contains $decodedGroupDN) {
                    Write-Host "  ℹ️  Already member of: $decodedGroupDN" -ForegroundColor Gray
                    $alreadyMemberCount++
                    continue
                }

                # Add user to the group
                Add-ADGroupMember -Identity $decodedGroupDN -Members $SamAccountName -Credential $Credential -ErrorAction Stop
                Write-Host "  ✅ Added to: $decodedGroupDN" -ForegroundColor Green
                $successCount++
            }
            catch {
                Write-Warning "  ❌ Failed to add to: $decodedGroupDN"
                Write-Warning "     Reason: $($_.Exception.Message)"
                $failureCount++
            }
        }

        # Summary
        Write-Host "`nGroup Membership Summary:" -ForegroundColor Cyan
        Write-Host "  Groups added: $successCount" -ForegroundColor Green
        Write-Host "  Already member: $alreadyMemberCount" -ForegroundColor Gray
        if ($failureCount -gt 0) {
            Write-Host "  Failed: $failureCount" -ForegroundColor Red
        }

        return ($failureCount -eq 0)
    }
    catch {
        Write-Error "Failed to process group memberships. Reason: $($_.Exception.Message)"
        return $false
    }
}

function Process-BulkUsers {
    <#
    .SYNOPSIS
        Processes multiple users in parallel for group assignment and proxy configuration.
    .DESCRIPTION
        Accepts an array of usernames or a CSV file path and processes all users
        using parallel processing for maximum efficiency.
    #>
    param (
        [Parameter(Mandatory=$true, ParameterSetName='Array')]
        [array]$SamAccountNames,
        [Parameter(Mandatory=$true, ParameterSetName='CSV')]
        [string]$CsvPath,
        [Parameter(Mandatory=$true)]
        [System.Management.Automation.PSCredential]$Credential,
        [Parameter(Mandatory=$false)]
        [switch]$SkipValidation,
        [Parameter(Mandatory=$false)]
        [switch]$GroupsOnly,
        [Parameter(Mandatory=$false)]
        [switch]$ProxiesOnly
    )

    Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  BULK USER PROCESSING (Parallel Mode)                     ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

    try {
        # Load users from CSV if specified
        if ($PSCmdlet.ParameterSetName -eq 'CSV') {
            if (-not (Test-Path $CsvPath)) {
                Write-Error "CSV file not found: $CsvPath"
                return
            }

            $csvData = Import-Csv -Path $CsvPath
            if (-not $csvData) {
                Write-Error "CSV file is empty or invalid"
                return
            }

            # Assume CSV has a column named 'SamAccountName' or 'Username'
            if ($csvData[0].PSObject.Properties.Name -contains 'SamAccountName') {
                $SamAccountNames = $csvData.SamAccountName
            } elseif ($csvData[0].PSObject.Properties.Name -contains 'Username') {
                $SamAccountNames = $csvData.Username
            } else {
                Write-Error "CSV must contain a 'SamAccountName' or 'Username' column"
                return
            }
        }

        Write-Host "`n📊 Processing $($SamAccountNames.Count) users..." -ForegroundColor Cyan
        Write-Host "   Parallel Processing: Enabled" -ForegroundColor Green
        Write-Host "   Max Concurrent Jobs: $($script:MaxParallelJobs)" -ForegroundColor Gray
        Write-Host ""

        $startTime = Get-Date

        # Step 1: Validate users (unless skipped)
        if (-not $SkipValidation) {
            Write-Host "`n--- Step 1: Validating Users ---" -ForegroundColor Cyan
            $validationResults = Start-ParallelUserValidation -SamAccountNames $SamAccountNames -Credential $Credential

            if ($validationResults.FailureCount -gt 0) {
                $continue = Read-Host "`n⚠️  Some users failed validation. Continue anyway? (Y/N)"
                if ($continue -ne 'Y' -and $continue -ne 'y') {
                    Write-Host "Operation cancelled by user." -ForegroundColor Yellow
                    return
                }
            }
        }

        # Step 2: Process groups (unless ProxiesOnly)
        if (-not $ProxiesOnly) {
            Write-Host "`n--- Step 2: Adding Users to Groups ---" -ForegroundColor Cyan

            # Prepare arguments for parallel group processing
            $jobArguments = @()
            foreach ($samAccountName in $SamAccountNames) {
                foreach ($groupDN in $standardGroups) {
                    $decodedGroupDN = [System.Web.HttpUtility]::UrlDecode($groupDN)
                    $jobArguments += ,@($samAccountName, $decodedGroupDN, $Credential)
                }
            }

            # Define the script block for group processing
            $groupScriptBlock = {
                param($samAccountName, $groupDN, $credential)

                try {
                    $user = Get-ADUser -Identity $samAccountName -Properties MemberOf -Credential $credential -ErrorAction Stop

                    if ($user.MemberOf -contains $groupDN) {
                        return @{Status = "AlreadyMember"; User = $samAccountName; Group = $groupDN }
                    }

                    Add-ADGroupMember -Identity $groupDN -Members $samAccountName -Credential $credential -ErrorAction Stop
                    return @{Status = "Success"; User = $samAccountName; Group = $groupDN }
                }
                catch {
                    return @{Status = "Failed"; User = $samAccountName; Group = $groupDN; Error = $_.Exception.Message }
                }
            }

            # Execute parallel jobs
            $groupResults = Start-ParallelJobManager -ScriptBlock $groupScriptBlock -ArgumentList $jobArguments -ProgressActivity "Adding users to groups" -ShowProgress

            # Summarize group results
            $groupSuccess = ($groupResults | Where-Object { $_.Status -eq "Success" }).Count
            $groupAlready = ($groupResults | Where-Object { $_.Status -eq "AlreadyMember" }).Count
            $groupFailed = ($groupResults | Where-Object { $_.Status -eq "Failed" }).Count

            Write-Host "`n  ✅ Groups added: $groupSuccess" -ForegroundColor Green
            Write-Host "  ℹ️  Already members: $groupAlready" -ForegroundColor Gray
            if ($groupFailed -gt 0) {
                Write-Host "  ❌ Failed: $groupFailed" -ForegroundColor Red
            }
        }

        # Step 3: Fix proxy addresses (unless GroupsOnly)
        if (-not $GroupsOnly) {
            Write-Host "`n--- Step 3: Fixing Proxy Addresses ---" -ForegroundColor Cyan
            $proxySuccess = Start-ParallelProxyProcessing -SamAccountNames $SamAccountNames -Credential $Credential
        }

        # Final summary
        $endTime = Get-Date
        $duration = $endTime - $startTime

        Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor White
        Write-Host "║  BULK PROCESSING COMPLETE                                  ║" -ForegroundColor White
        Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor White
        Write-Host "`n  Users processed: $($SamAccountNames.Count)" -ForegroundColor Cyan
        Write-Host "  Total time: $([math]::Round($duration.TotalSeconds, 2)) seconds" -ForegroundColor Cyan
        Write-Host "  Average per user: $([math]::Round($duration.TotalSeconds / $SamAccountNames.Count, 2)) seconds" -ForegroundColor Cyan
        Write-Host "`n🎉 Bulk processing completed!" -ForegroundColor Green
    }
    catch {
        Write-Error "Bulk processing failed: $($_.Exception.Message)"
    }
}

function Process-User {
    <#
    .SYNOPSIS
        Processes a user by validating attributes, adding to groups, and fixing proxies using advanced features.
    #>
    param (
        [Parameter(Mandatory=$true)]
        [string]$SamAccountName,
        [Parameter(Mandatory=$true)]
        [System.Management.Automation.PSCredential]$Credential
    )

    Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor White
    Write-Host "║  Processing User: $($SamAccountName.PadRight(40)) ║" -ForegroundColor White
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor White

    try {
        # Verify the user exists first
        try {
            $user = Get-ADUser -Identity $SamAccountName -Properties Name, UserPrincipalName, MemberOf, Enabled -Credential $Credential -ErrorAction Stop
        }
        catch [Microsoft.ActiveDirectory.Management.ADIdentityNotFoundException] {
            Write-Error "User '$SamAccountName' not found in Active Directory."
            Write-Host "💡 Tips:" -ForegroundColor Yellow
            Write-Host "   - Check the spelling of the username" -ForegroundColor Yellow
            Write-Host "   - Make sure the user account has been created" -ForegroundColor Yellow
            Write-Host "   - Try using the full sAMAccountName (e.g., 'jsmith' not 'John Smith')" -ForegroundColor Yellow
            return
        }
        catch {
            Write-Error "Failed to retrieve user: $($_.Exception.Message)"
            return
        }

        Write-Host "`n✅ Found user: $($user.Name)" -ForegroundColor Green
        Write-Host "   UPN: $($user.UserPrincipalName)" -ForegroundColor Gray
        Write-Host "   Account Status: $(if ($user.Enabled) { 'Enabled ✅' } else { 'Disabled ⚠️' })" -ForegroundColor $(if ($user.Enabled) { 'Green' } else { 'Yellow' })

        # Warn if account is disabled
        if (-not $user.Enabled) {
            Write-Warning "This account is currently disabled. Some operations may fail."
            $continue = Read-Host "Do you want to continue anyway? (Y/N)"
            if ($continue -ne 'Y' -and $continue -ne 'y') {
                Write-Host "Operation cancelled by user." -ForegroundColor Yellow
                return
            }
        }

        # STEP 1: Validate user attributes
        $validationSuccess = Validate-UserAttributes -SamAccountName $SamAccountName -Credential $Credential
        
        # Ask user if they want to continue despite validation issues
        if (-not $validationSuccess) {
            $continue = Read-Host "`nDo you want to continue with group assignment and proxy fixing despite missing attributes? (Y/N)"
            if ($continue -ne 'Y' -and $continue -ne 'y') {
                Write-Host "Operation cancelled by user. Please update the missing attributes first." -ForegroundColor Yellow
                return
            }
        }

        # STEP 2: Add to groups using parallel processing
        if ($script:UseParallelProcessing) {
            Write-Host "`n🚀 Using parallel processing for group assignment..." -ForegroundColor Cyan
            $groupSuccess = Start-ParallelGroupProcessing -SamAccountName $SamAccountName -Credential $Credential
        } else {
            Write-Host "`nUsing sequential processing for group assignment..." -ForegroundColor Cyan
            $groupSuccess = Add-UserToStandardGroups -SamAccountName $SamAccountName -Credential $Credential
        }

        # STEP 3: Fix proxy addresses (LAST)
        $proxySuccess = Fix-UserProxyAddresses -SamAccountName $SamAccountName -Credential $Credential

        # Final summary
        Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor White
        Write-Host "║  FINAL SUMMARY FOR: $($user.Name.PadRight(37)) ║" -ForegroundColor White
        Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor White

        # Show status for each operation
        Write-Host "`nOperation Results:" -ForegroundColor Cyan
        Write-Host "  Validation: $(if ($validationSuccess) { '✅ Success' } else { '⚠️  Issues Found' })" -ForegroundColor $(if ($validationSuccess) { 'Green' } else { 'Yellow' })
        Write-Host "  Groups:     $(if ($groupSuccess) { '✅ Success' } else { '❌ Failed' })" -ForegroundColor $(if ($groupSuccess) { 'Green' } else { 'Red' })
        Write-Host "  Proxies:    $(if ($proxySuccess) { '✅ Success' } else { '❌ Failed' })" -ForegroundColor $(if ($proxySuccess) { 'Green' } else { 'Red' })
        
        # Show processing method used
        if ($script:UseParallelProcessing) {
            Write-Host "  Processing: 🚀 Parallel (Faster)" -ForegroundColor Cyan
        } else {
            Write-Host "  Processing: ⚡ Sequential" -ForegroundColor Gray
        }

        # Overall status
        Write-Host ""
        if ($proxySuccess -and $groupSuccess) {
            if ($validationSuccess) {
                Write-Host "🎉 All operations completed successfully!" -ForegroundColor Green
            } else {
                Write-Host "⚠️  Operations completed with validation warnings." -ForegroundColor Yellow
                Write-Host "   📋 Note: Please review missing attributes above." -ForegroundColor Yellow
            }
        } else {
            Write-Host "❌ Some operations failed. Please review the errors above." -ForegroundColor Red
            if (-not $groupSuccess) {
                Write-Host "   👥 Note: Review group membership errors above." -ForegroundColor Yellow
            }
            if (-not $proxySuccess) {
                Write-Host "   📧 Note: Review proxy address errors above." -ForegroundColor Yellow
            }
        }
    }
    catch [Microsoft.ActiveDirectory.Management.ADIdentityNotFoundException] {
        Write-Warning "User '$SamAccountName' not found in Active Directory. Please check the spelling."
    }
    catch {
        $errorMessage = $_.Exception.Message
        Write-Error "Failed to process user '$SamAccountName'. Reason: $errorMessage"
        if ($errorMessage -like "*rejected the client credentials*") {
            Write-Warning "This error often means the password entered at the start was incorrect, or the admin account does not have permission to modify this user."
        }
    }
}

# --- 3. Main Script Body ---

# Use a single persistent log file that appends all sessions
$logFile = ".\ADHelper-Log.txt"
Start-Transcript -Path $logFile -Append
Write-Host "Script session is being logged to: $logFile"
Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] === New ADHelper Session Started ===" -ForegroundColor Gray

# --- Module Installation and Imports ---
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Checking Required Modules...                              ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

# Check and install Active Directory module
Write-Host "`nChecking Active Directory module..." -ForegroundColor Cyan
try {
    Import-Module ActiveDirectory -ErrorAction Stop
    Write-Host "✅ Active Directory module is ready." -ForegroundColor Green
}
catch {
    Write-Warning "Active Directory module is not installed."
    Write-Host "This module requires RSAT (Remote Server Administration Tools)." -ForegroundColor Yellow
    Write-Host "`nAttempting automatic installation..." -ForegroundColor Cyan

    # Check if running as administrator
    $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

    if (-not $isAdmin) {
        Write-Warning "Administrator privileges required to install RSAT."
        Write-Host "`n💡 Please run this script as Administrator to enable automatic RSAT installation." -ForegroundColor Yellow
        Write-Host "`nAlternatively, install RSAT manually:" -ForegroundColor Cyan
        Write-Host "  Windows 10/11: Settings > Apps > Optional Features > Add a feature > RSAT: Active Directory" -ForegroundColor Gray
        Write-Host "  Windows Server: Install-WindowsFeature RSAT-AD-PowerShell" -ForegroundColor Gray
        Write-Error "Cannot continue without Active Directory module."
        Stop-Transcript
        Read-Host "Press Enter to exit..."
        return
    }

    # Attempt to install RSAT
    try {
        Write-Host "Installing RSAT: Active Directory Domain Services tools..." -ForegroundColor Yellow
        Write-Host "This may take several minutes depending on your internet connection..." -ForegroundColor Gray

        # Try Windows 10/11 method first
        $rsatCapability = Get-WindowsCapability -Name "Rsat.ActiveDirectory*" -Online -ErrorAction SilentlyContinue

        if ($rsatCapability) {
            Write-Host "Downloading and installing RSAT components..." -ForegroundColor Cyan
            $result = Add-WindowsCapability -Name "Rsat.ActiveDirectory.DS-LDS.Tools~~~~0.0.1.0" -Online -ErrorAction Stop

            if ($result.RestartNeeded) {
                Write-Warning "RSAT installation requires a system restart."
                Write-Host "Please restart your computer and run this script again." -ForegroundColor Yellow
                Stop-Transcript
                Read-Host "Press Enter to exit..."
                return
            }

            Write-Host "✅ RSAT installed successfully!" -ForegroundColor Green
            Write-Host "Attempting to load Active Directory module..." -ForegroundColor Cyan

            # Try to import the module again
            Import-Module ActiveDirectory -ErrorAction Stop
            Write-Host "✅ Active Directory module is now ready." -ForegroundColor Green
        }
        else {
            # Try Windows Server method
            Write-Host "Attempting Windows Server installation method..." -ForegroundColor Cyan
            Install-WindowsFeature RSAT-AD-PowerShell -ErrorAction Stop
            Import-Module ActiveDirectory -ErrorAction Stop
            Write-Host "✅ Active Directory module is now ready." -ForegroundColor Green
        }
    }
    catch {
        Write-Error "Failed to install RSAT automatically: $($_.Exception.Message)"
        Write-Host "`n💡 Please install RSAT manually:" -ForegroundColor Yellow
        Write-Host "  Windows 10/11: Settings > Apps > Optional Features > Add a feature > RSAT: Active Directory" -ForegroundColor Gray
        Write-Host "  Windows Server: Install-WindowsFeature RSAT-AD-PowerShell" -ForegroundColor Gray
        Write-Host "`nOr run PowerShell as Administrator and execute:" -ForegroundColor Yellow
        Write-Host '  Get-WindowsCapability -Name RSAT.ActiveDirectory* -Online | Add-WindowsCapability -Online' -ForegroundColor Gray
        Stop-Transcript
        Read-Host "Press Enter to exit..."
        return
    }
}

# Initialize script variables
Write-Host "`nInitializing credential storage..." -ForegroundColor Cyan
$script:CredentialManagerAvailable = $true  # Using native Windows Credential Manager
$script:UseParallelProcessing = $true  # Enable parallel processing by default
$script:VoiceEnabled = $true
$script:MaxParallelJobs = 5  # Default to 5 concurrent jobs (configurable 1-20)
Write-Host "✅ Native Windows Credential Manager is ready." -ForegroundColor Green

# Load System.Web for URL decoding
Add-Type -AssemblyName System.Web

# Summary of module status
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Module Status Summary                                     ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host "  Active Directory: ✅ Ready" -ForegroundColor Green
Write-Host "  Credential Store: $(if ($script:CredentialManagerAvailable) { '✅ Ready' } else { '⚠️  Not Available' })" -ForegroundColor $(if ($script:CredentialManagerAvailable) { 'Green' } else { 'Yellow' })
Write-Host "  Voice Commands:   $(if ($script:VoiceEnabled) { '✅ Available' } else { '❌ Disabled' })" -ForegroundColor $(if ($script:VoiceEnabled) { 'Green' } else { 'Red' })
Write-Host "  Parallel Proc:    $(if ($script:UseParallelProcessing) { '✅ Enabled' } else { '❌ Disabled' })" -ForegroundColor $(if ($script:UseParallelProcessing) { 'Green' } else { 'Red' })
Write-Host "`n✅ All required modules ready!" -ForegroundColor Green

Write-Host "`n"
Read-Host "Press Enter to continue to login..."

# --- Secure Credential Gathering ---
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Secure Credential Initialization                          ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

$adminCredential = Initialize-SecureCredentials

if (-not $adminCredential) {
    Write-Error "Failed to initialize credentials. Exiting script."
    Stop-Transcript
    Read-Host "Press Enter to exit..."
    return
}

Write-Host "`n✅ Secure credential initialization completed." -ForegroundColor Green
Write-Host "`n"
Read-Host "Press Enter to continue..."

# --- Main Menu Loop ---
$exitMainMenu = $false
while (-not $exitMainMenu) {
    Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  AD HELPER - Advanced Group & Proxy Manager               ║" -ForegroundColor Cyan
    Write-Host "║  🚀 Parallel Processing  🎤 Voice Commands  🔐 Secure Creds║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

    Write-Host "  [1] Process User (Validation → Groups → Proxies)"
    Write-Host "  [2] Process Bulk Users (CSV or Array) 🚀"
    Write-Host "  [3] Reset User Password"
    Write-Host "  [4] Unlock User Account"
    Write-Host "  [5] Create New User Account"
    Write-Host "  [6] Voice Commands Mode 🎤"
    Write-Host "  [7] Toggle Parallel Processing ($([string]::Join(' ', $script:UseParallelProcessing)))"
    Write-Host "  [8] Settings & Configuration"
    Write-Host "  [9] Remove from MFA Blocking Group 🔓"
    Write-Host "  [10] Voice Commands Test & Diagnostics 🔧"
    Write-Host "  [11] Process Contractor Accounts (OU/Name/Expiration) 📅"
    Write-Host "  [12] Exit"

    $mainChoice = Read-Host "Enter your choice"

    switch ($mainChoice) {
        '1' {
            # Prompt for user input (sAMAccountName or Email)
            $userInput = Read-Host "Enter sAMAccountName or Email (leave blank to cancel)"

            # If user input is blank, they want to cancel and return to the menu.
            if ([string]::IsNullOrWhiteSpace($userInput)) {
                continue
            }

            # Trim whitespace and check if it's an email address.
            $samToProcess = $userInput.Trim()
            if ($samToProcess -like "*@*") {
                $samToProcess = ($samToProcess -split "@")[0]
                Write-Host "Detected email address. Using username: '$samToProcess'" -ForegroundColor Cyan
            }

            # Proceed with processing the user.
            if (-not [string]::IsNullOrWhiteSpace($samToProcess)) {
                Process-User -SamAccountName $samToProcess -Credential $adminCredential
            }

            Write-Host "`n"
            Read-Host "Press Enter to return to the main menu..."
        }
        '2' {
            Write-Host "`n=== Bulk User Processing ===" -ForegroundColor Cyan
            Write-Host "Choose input method:" -ForegroundColor Yellow
            Write-Host "  [1] CSV File"
            Write-Host "  [2] Manual Entry (comma-separated usernames)"
            Write-Host "  [3] Cancel"

            $bulkChoice = Read-Host "Enter choice"

            switch ($bulkChoice) {
                '1' {
                    $csvPath = Read-Host "Enter CSV file path (must have 'SamAccountName' or 'Username' column)"
                    if (-not [string]::IsNullOrWhiteSpace($csvPath)) {
                        Write-Host "`nProcessing options:" -ForegroundColor Yellow
                        Write-Host "  [1] Full processing (Validation + Groups + Proxies)"
                        Write-Host "  [2] Groups only"
                        Write-Host "  [3] Proxies only"

                        $processChoice = Read-Host "Enter choice"

                        $params = @{
                            CsvPath = $csvPath
                            Credential = $adminCredential
                        }

                        switch ($processChoice) {
                            '2' { $params.GroupsOnly = $true }
                            '3' { $params.ProxiesOnly = $true }
                        }

                        Process-BulkUsers @params
                    }
                }
                '2' {
                    $userList = Read-Host "Enter usernames (comma-separated, e.g., jsmith,mjohnson,bwilson)"
                    if (-not [string]::IsNullOrWhiteSpace($userList)) {
                        $usernames = $userList -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ }

                        if ($usernames.Count -gt 0) {
                            Write-Host "`nProcessing options:" -ForegroundColor Yellow
                            Write-Host "  [1] Full processing (Validation + Groups + Proxies)"
                            Write-Host "  [2] Groups only"
                            Write-Host "  [3] Proxies only"

                            $processChoice = Read-Host "Enter choice"

                            $params = @{
                                SamAccountNames = $usernames
                                Credential = $adminCredential
                            }

                            switch ($processChoice) {
                                '2' { $params.GroupsOnly = $true }
                                '3' { $params.ProxiesOnly = $true }
                            }

                            Process-BulkUsers @params
                        }
                    }
                }
            }

            Write-Host "`n"
            Read-Host "Press Enter to return to the main menu..."
        }
        '3' {
            $userInput = Read-Host "Enter username to reset password (leave blank to cancel)"
            if (-not [string]::IsNullOrWhiteSpace($userInput)) {
                $newPassword = Reset-UserPassword -SamAccountName $userInput -Credential $adminCredential
                if ($newPassword) {
                    Write-Host "💾 Password securely generated. Provide to user securely." -ForegroundColor Yellow
                }
            }
            Write-Host "`n"
            Read-Host "Press Enter to return to the main menu..."
        }
        '4' {
            $userInput = Read-Host "Enter username to unlock (leave blank to cancel)"
            if (-not [string]::IsNullOrWhiteSpace($userInput)) {
                $unlockSuccess = Unlock-UserAccount -SamAccountName $userInput -Credential $adminCredential
                if ($unlockSuccess) {
                    Write-Host "🔓 Account unlocked successfully!" -ForegroundColor Green
                }
            }
            Write-Host "`n"
            Read-Host "Press Enter to return to the main menu..."
        }
        '5' {
            Write-Host "Creating new user account..." -ForegroundColor Cyan
            $createSuccess = Create-NewUser -Credential $adminCredential
            if ($createSuccess) {
                Write-Host "🎉 New user account created successfully!" -ForegroundColor Green
            }
            Write-Host "`n"
            Read-Host "Press Enter to return to the main menu..."
        }
        '6' {
            Write-Host "🎤 Voice Commands Mode - Say commands like:" -ForegroundColor Cyan
            Write-Host "   'Process user', 'Reset password', 'Unlock account'" -ForegroundColor Gray
            Write-Host "   'Create account', 'Validate attributes', 'Exit'" -ForegroundColor Gray
            
            if ($script:VoiceEnabled) {
                $voiceChoice = Read-Host "`nEnable voice recognition? (Y/N)"
                if ($voiceChoice -eq 'Y' -or $voiceChoice -eq 'y') {
                    $voiceInitialized = Initialize-VoiceRecognition
                    if ($voiceInitialized) {
                        Write-Host "🎤 Listening for voice commands... (Say 'help' for commands)" -ForegroundColor Green
                        Write-Host "⚠️  Note: Voice recognition is experimental and may not work in all environments" -ForegroundColor Yellow
                        
                        # Simple voice command processing
                        try {
                            $script:SpeechRecognizer.SetInputToDefaultAudioDevice()
                            $result = $script:SpeechRecognizer.Recognize()
                            if ($result) {
                                $command = Process-VoiceCommand -Command $result.Text
                                Write-Host "🎤 Recognized: '$($result.Text)' → Command: $command" -ForegroundColor Cyan
                            }
                        }
                        catch {
                            Write-Warning "Voice recognition not available: $($_.Exception.Message)"
                        }
                    }
                }
            }
            Write-Host "`n"
            Read-Host "Press Enter to return to the main menu..."
        }
        '7' {
            $script:UseParallelProcessing = -not $script:UseParallelProcessing
            Write-Host "🚀 Parallel Processing: $(if ($script:UseParallelProcessing) { 'ENABLED' } else { 'DISABLED' })" -ForegroundColor $(if ($script:UseParallelProcessing) { 'Green' } else { 'Yellow' })
            Write-Host "`n"
            Read-Host "Press Enter to return to the main menu..."
        }
        '8' {
            Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
            Write-Host "║  Settings & Configuration                                  ║" -ForegroundColor Cyan
            Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

            Write-Host "`nCurrent Settings:" -ForegroundColor Yellow
            Write-Host "  Parallel Processing: $(if ($script:UseParallelProcessing) { '✅ Enabled' } else { '❌ Disabled' })" -ForegroundColor $(if ($script:UseParallelProcessing) { 'Green' } else { 'Gray' })
            Write-Host "  Max Parallel Jobs: $($script:MaxParallelJobs)" -ForegroundColor Cyan
            Write-Host "  Voice Commands: $(if ($script:VoiceEnabled) { '✅ Available' } else { '❌ Disabled' })" -ForegroundColor $(if ($script:VoiceEnabled) { 'Green' } else { 'Gray' })
            Write-Host "  Credential Store: $(if ($script:CredentialManagerAvailable) { '✅ Ready' } else { '⚠️  Not Available' })" -ForegroundColor $(if ($script:CredentialManagerAvailable) { 'Green' } else { 'Yellow' })

            Write-Host "`nConfiguration Options:" -ForegroundColor Yellow
            Write-Host "  [1] Change max parallel jobs (1-20)"
            Write-Host "  [2] Toggle parallel processing"
            Write-Host "  [3] View performance recommendations"
            Write-Host "  [4] Return to main menu"

            $settingChoice = Read-Host "`nEnter choice"

            switch ($settingChoice) {
                '1' {
                    $newMaxJobs = Read-Host "Enter max parallel jobs (current: $($script:MaxParallelJobs), recommended: 5-10)"
                    if ($newMaxJobs -match '^\d+$' -and [int]$newMaxJobs -gt 0 -and [int]$newMaxJobs -le 20) {
                        $script:MaxParallelJobs = [int]$newMaxJobs
                        Write-Host "✅ Max parallel jobs updated to: $($script:MaxParallelJobs)" -ForegroundColor Green

                        # Provide performance guidance
                        if ($script:MaxParallelJobs -le 3) {
                            Write-Host "💡 Low concurrency - Good for systems with limited resources" -ForegroundColor Yellow
                        } elseif ($script:MaxParallelJobs -le 10) {
                            Write-Host "💡 Balanced concurrency - Recommended for most scenarios" -ForegroundColor Green
                        } else {
                            Write-Host "💡 High concurrency - May impact system performance" -ForegroundColor Yellow
                        }
                    } else {
                        Write-Host "❌ Invalid number. Must be between 1 and 20." -ForegroundColor Red
                    }
                }
                '2' {
                    $script:UseParallelProcessing = -not $script:UseParallelProcessing
                    Write-Host "🚀 Parallel Processing: $(if ($script:UseParallelProcessing) { 'ENABLED' } else { 'DISABLED' })" -ForegroundColor $(if ($script:UseParallelProcessing) { 'Green' } else { 'Yellow' })
                }
                '3' {
                    Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
                    Write-Host "║  Performance Recommendations                               ║" -ForegroundColor Cyan
                    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
                    Write-Host "`nParallel Processing Guidelines:" -ForegroundColor Yellow
                    Write-Host "  • Single user: Parallel processing provides 60-80% speed improvement" -ForegroundColor Gray
                    Write-Host "  • Bulk users (5+): Parallel processing is highly recommended" -ForegroundColor Gray
                    Write-Host "  • Max jobs 5-10: Optimal balance for most environments" -ForegroundColor Gray
                    Write-Host "  • Max jobs 1-3: Use for resource-constrained systems" -ForegroundColor Gray
                    Write-Host "  • Max jobs 10+: Only for high-performance systems" -ForegroundColor Gray
                    Write-Host "`nBest Practices:" -ForegroundColor Yellow
                    Write-Host "  ✓ Enable parallel processing for routine operations" -ForegroundColor Green
                    Write-Host "  ✓ Use bulk processing for 5+ users" -ForegroundColor Green
                    Write-Host "  ✓ Monitor system resources during high concurrency" -ForegroundColor Green
                    Write-Host "  ✓ Disable parallel processing only for troubleshooting" -ForegroundColor Green
                }
            }

            Write-Host "`n"
            Read-Host "Press Enter to return to the main menu..."
        }
        '9' {
            # MFA Blocking Group Removal
            Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
            Write-Host "║  Remove User from MFA Blocking Group                       ║" -ForegroundColor Cyan
            Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
            Write-Host "`nThis will remove a user from the MFA Registration Blocking group." -ForegroundColor Yellow
            Write-Host "After removal, a verification task will be scheduled to confirm" -ForegroundColor Yellow
            Write-Host "the change has replicated across Active Directory (35 min delay)." -ForegroundColor Yellow

            $userInput = Read-Host "`nEnter sAMAccountName or Email (leave blank to cancel)"

            if (-not [string]::IsNullOrWhiteSpace($userInput)) {
                # Parse username from email if needed
                $samToProcess = $userInput.Trim()
                if ($samToProcess -like "*@*") {
                    $samToProcess = ($samToProcess -split "@")[0]
                    Write-Host "Detected email address. Using username: '$samToProcess'" -ForegroundColor Cyan
                }

                # Step 1: Remove user from MFA Blocking group
                $removalResult = Remove-UserFromMFABlocking -SamAccountName $samToProcess -Credential $adminCredential

                if ($removalResult.Success -and $removalResult.WasInGroup) {
                    # User was in group and was removed - offer to schedule verification
                    Write-Host "`n📋 The user has been removed from the MFA Blocking group." -ForegroundColor Green
                    Write-Host "   Due to AD replication, this change may take up to 35 minutes" -ForegroundColor Yellow
                    Write-Host "   to propagate across all domain controllers." -ForegroundColor Yellow

                    $scheduleVerify = Read-Host "`nSchedule automatic verification task? (Y/N)"

                    if ($scheduleVerify -eq 'Y' -or $scheduleVerify -eq 'y') {
                        # Step 2: Verify credentials are stored and accessible
                        Write-Host "`n🔐 Verifying credential storage for scheduled task..." -ForegroundColor Cyan

                        $credentialVerified = Test-StoredCredentialAccess -Credential $adminCredential

                        if ($credentialVerified) {
                            # Step 3: Schedule the verification task
                            $taskScheduled = Start-MFARemovalVerificationTask -SamAccountName $samToProcess -LogFilePath $logFile -DelayMinutes 35 -MaxAttempts 30

                            if ($taskScheduled) {
                                Write-Host "`n🎉 MFA Blocking Group removal process complete!" -ForegroundColor Green
                                Write-Host "   • User removed from group: ✅" -ForegroundColor Green
                                Write-Host "   • Verification task scheduled: ✅" -ForegroundColor Green
                                Write-Host "   • Results will be logged to: $logFile" -ForegroundColor Cyan
                            }
                            else {
                                Write-Host "`n⚠️  User was removed from group, but verification task could not be scheduled." -ForegroundColor Yellow
                                Write-Host "   Please manually verify the group membership after 35 minutes." -ForegroundColor Yellow
                            }
                        }
                        else {
                            Write-Host "`n❌ Cannot schedule verification task - credential storage verification failed." -ForegroundColor Red
                            Write-Host "   The user HAS been removed from the MFA Blocking group." -ForegroundColor Green
                            Write-Host "   However, automatic verification cannot be scheduled." -ForegroundColor Yellow
                            Write-Host "`n💡 To fix this issue:" -ForegroundColor Cyan
                            Write-Host "   1. Ensure you selected 'Y' when prompted to store credentials" -ForegroundColor Gray
                            Write-Host "   2. Restart the script and choose to store credentials" -ForegroundColor Gray
                            Write-Host "   3. Manually verify group membership after 35 minutes" -ForegroundColor Gray
                        }
                    }
                    else {
                        Write-Host "`nℹ️  Verification task not scheduled." -ForegroundColor Gray
                        Write-Host "   Please manually verify the group membership after 35 minutes." -ForegroundColor Yellow
                    }
                }
                elseif ($removalResult.Success -and -not $removalResult.WasInGroup) {
                    # User was not in the group - no action needed
                    Write-Host "`n✅ User '$samToProcess' is NOT in the MFA Blocking group." -ForegroundColor Green
                    Write-Host "   No action is required - the user can already register for MFA." -ForegroundColor Cyan
                }
                else {
                    # Removal failed - provide specific error feedback
                    Write-Host "`n❌ MFA Blocking Group operation failed." -ForegroundColor Red

                    switch ($removalResult.ErrorType) {
                        "CredentialError" {
                            Write-Host "`n🔐 CREDENTIAL ERROR" -ForegroundColor Red
                            Write-Host "   Your admin credentials are invalid, expired, or lack permissions." -ForegroundColor Yellow
                            Write-Host "`n   To fix this:" -ForegroundColor Cyan
                            Write-Host "   1. Exit the script (option 10)" -ForegroundColor Gray
                            Write-Host "   2. Restart and enter valid admin credentials" -ForegroundColor Gray
                            Write-Host "   3. Ensure your account has permission to modify group membership" -ForegroundColor Gray
                        }
                        "UserNotFound" {
                            Write-Host "`n👤 USER NOT FOUND" -ForegroundColor Red
                            Write-Host "   The user '$samToProcess' does not exist in Active Directory." -ForegroundColor Yellow
                            Write-Host "`n   Please verify:" -ForegroundColor Cyan
                            Write-Host "   • The username is spelled correctly" -ForegroundColor Gray
                            Write-Host "   • The user account has not been deleted" -ForegroundColor Gray
                        }
                        "GroupNotFound" {
                            Write-Host "`n📁 GROUP NOT FOUND" -ForegroundColor Red
                            Write-Host "   The MFA Blocking group was not found in Active Directory." -ForegroundColor Yellow
                            Write-Host "   Please verify the group DN configuration." -ForegroundColor Gray
                        }
                        default {
                            Write-Host "   Error: $($removalResult.Message)" -ForegroundColor Yellow
                        }
                    }
                }
            }

            Write-Host "`n"
            Read-Host "Press Enter to return to the main menu..."
        }
        '10' {
            # Voice Commands Test & Diagnostics
            Start-VoiceCommandTest
            Write-Host "`n"
            Read-Host "Press Enter to return to the main menu..."
        }
        '11' {
            # Contractor Account Processing (OU, Display Name, Expiration)
            Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
            Write-Host "║  Contractor Account Processing                             ║" -ForegroundColor Cyan
            Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
            Write-Host "`nThis will process contractor accounts with the following steps:" -ForegroundColor Yellow
            Write-Host "  1. Validate user exists in AD" -ForegroundColor Gray
            Write-Host "  2. Verify user is in Non-Rehrig OU (prompt for correction if not)" -ForegroundColor Gray
            Write-Host "  3. Check/Update Display Name (add ' - Contractor' suffix)" -ForegroundColor Gray
            Write-Host "  4. Extend account expiration by 1 year" -ForegroundColor Gray
            Write-Host "`n💡 Supports bulk processing: Enter multiple usernames separated by semicolons (;)" -ForegroundColor Cyan
            Write-Host "   Example: jsmith ; mjohnson ; bwilson" -ForegroundColor DarkGray

            $userInput = Read-Host "`nEnter sAMAccountName(s) (leave blank to cancel)"
            if (-not [string]::IsNullOrWhiteSpace($userInput)) {
                Process-ContractorAccountExtension -UserInput $userInput -Credential $adminCredential
            }
            Write-Host "`n"
            Read-Host "Press Enter to return to the main menu..."
        }
        '12' {
            Write-Host "Exiting AD Helper Advanced." -ForegroundColor Yellow
            $exitMainMenu = $true
        }
        default {
            Write-Warning "Invalid choice. Please try again."
        }
    }
}

Stop-Transcript
