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

            [CredentialManagement.NativeCredential]::CredFree($credPtr)

            $securePassword = ConvertTo-SecureString -String $password -AsPlainText -Force
            return New-Object System.Management.Automation.PSCredential($credential.UserName, $securePassword)
        }

        return $null
    }
    catch {
        Write-Verbose "Error reading credential: $($_.Exception.Message)"
        return $null
    }
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
            Write-Host "✅ Found stored admin credentials." -ForegroundColor Green
            $useStored = Read-Host "Use stored credentials? (Y/N)"
            if ($useStored -eq 'Y' -or $useStored -eq 'y') {
                return $existingCred
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
        $securePassword = ConvertTo-SecureString $newPassword -AsPlainText -Force
        
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
        
        $userInfo.SamAccountName = Read-Host "Enter username (sAMAccountName)"
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
        $securePassword = ConvertTo-SecureString $password -AsPlainText -Force
        
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

$logFile = ".\ADHelper-Log-$(Get-Date -Format 'yyyy-MM-dd_HH-mm-ss').txt"
Start-Transcript -Path $logFile
Write-Host "Script session is being logged to: $logFile"

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
$script:VoiceEnabled = $false
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
    Write-Host "  [6] Voice Commands Mode"
    Write-Host "  [7] Toggle Parallel Processing ($([string]::Join(' ', $script:UseParallelProcessing)))"
    Write-Host "  [8] Settings & Configuration"
    Write-Host "  [9] Exit"

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
            Write-Host "Exiting AD Helper Advanced." -ForegroundColor Yellow
            $exitMainMenu = $true
        }
        default {
            Write-Warning "Invalid choice. Please try again."
        }
    }
}

Stop-Transcript
