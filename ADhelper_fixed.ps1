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

function Initialize-SecureCredentials {
    <#
    .SYNOPSIS
        Initializes secure credential storage using Windows Credential Manager.
    #>
    try {
        # Check if credentials already exist
        $existingCred = Get-StoredCredential -Target "ADHelper_AdminCred" -ErrorAction SilentlyContinue
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
                # Try to install CredentialManager module if not available
                $credManagerAvailable = Get-Module -ListAvailable -Name CredentialManager -ErrorAction SilentlyContinue
                if (-not $credManagerAvailable) {
                    Write-Host "Installing CredentialManager module..." -ForegroundColor Yellow
                    Install-Module -Name CredentialManager -Force -AllowClobber -ErrorAction Stop
                }
                
                # Store the credential
                New-StoredCredential -Target "ADHelper_AdminCred" -Credential $credential -Persist LocalMachine | Out-Null
                Write-Host "✅ Credentials stored securely in Windows Credential Manager." -ForegroundColor Green
            }
            catch {
                Write-Warning "Could not store credentials: $($_.Exception.Message)"
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

function Start-ParallelGroupProcessing {
    <#
    .SYNOPSIS
        Adds user to groups using parallel processing for better performance.
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
        $jobs = @()
        $successCount = 0
        $alreadyMemberCount = 0
        $failureCount = 0

        Write-Host "Processing $($standardGroups.Count) groups with parallel execution..." -ForegroundColor Gray

        foreach ($groupDN in $standardGroups) {
            # Decode URL-encoded characters in the DN
            $decodedGroupDN = [System.Web.HttpUtility]::UrlDecode($groupDN)
            
            # Create background job for each group
            $job = Start-Job -ScriptBlock {
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
            } -ArgumentList $SamAccountName, $decodedGroupDN, $Credential
            
            $jobs += $job
            
            # Limit concurrent jobs
            if ($jobs.Count -ge $script:MaxParallelJobs) {
                Wait-Job -Job $jobs | Out-Null
                $jobs = @()
            }
        }
        
        # Wait for remaining jobs
        if ($jobs.Count -gt 0) {
            Wait-Job -Job $jobs | Out-Null
        }
        
        # Process results
        foreach ($job in $jobs) {
            $result = Receive-Job -Job $job
            Remove-Job -Job $job -Force
            
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

    $existingProxiesClean = @([array]$UserObject.proxyAddresses) | ForEach-Object { $_.Trim().ToLower() }
    $requiredProxiesClean = (Get-RequiredProxyAddresses -samAccountName $UserObject.sAMAccountName) | ForEach-Object { $_.Trim().ToLower() }
    
    $missingProxiesLower = @((Compare-Object -ReferenceObject $existingProxiesClean -DifferenceObject $requiredProxiesClean | Where-Object { $_.SideIndicator -eq '=>' }).InputObject)
    
    if ($missingProxiesLower.Count -gt 0) {
        $originalCasedRequired = Get-RequiredProxyAddresses -samAccountName $UserObject.sAMAccountName
        return [string[]]($originalCasedRequired | Where-Object { $missingProxiesLower -contains $_.ToLower() })
    } 
    
    return @()
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
    Write-Host "RSAT must be installed manually from Windows Features or Settings." -ForegroundColor Yellow
    Write-Host "`nFor Windows 10/11:" -ForegroundColor Cyan
    Write-Host "  Settings > Apps > Optional Features > Add a feature > RSAT: Active Directory" -ForegroundColor Gray
    Write-Host "`nFor Windows Server:" -ForegroundColor Cyan
    Write-Host "  Install-WindowsFeature RSAT-AD-PowerShell" -ForegroundColor Gray
    Write-Error "Cannot continue without Active Directory module."
    Stop-Transcript
    Read-Host "Press Enter to exit..."
    return
}

# Load System.Web for URL decoding
Add-Type -AssemblyName System.Web

# Summary of module status
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Module Status Summary                                     ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host "  Active Directory: ✅ Ready" -ForegroundColor Green
Write-Host "  Voice Commands:   $(if ($script:VoiceEnabled) { '✅ Available' } else { '❌ Disabled' })" -ForegroundColor $(if ($script:VoiceEnabled) { 'Green' } else { 'Red' })
Write-Host "  Parallel Proc:    $(if ($script:UseParallelProcessing) { '✅ Enabled' } else { '❌ Disabled' })" -ForegroundColor $(if ($script:UseParallelProcessing) { 'Green' } else { 'Red' })
Write-Host "`n✅ All required modules ready!" -ForegroundColor Green

# Check for CredentialManager module
$credManagerAvailable = Get-Module -ListAvailable -Name CredentialManager -ErrorAction SilentlyContinue
if ($credManagerAvailable) {
    Write-Host "  Credential Store: ✅ Available" -ForegroundColor Green
} else {
    Write-Host "  Credential Store: ⚠️  Optional (Install-Module CredentialManager)" -ForegroundColor Yellow
}

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
    Write-Host "  [2] Reset User Password"
    Write-Host "  [3] Unlock User Account"
    Write-Host "  [4] Create New User Account"
    Write-Host "  [5] Voice Commands Mode"
    Write-Host "  [6] Toggle Parallel Processing ($([string]::Join(' ', $script:UseParallelProcessing)))"
    Write-Host "  [7] Settings & Configuration"
    Write-Host "  [8] Exit"

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
        '3' {
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
        '4' {
            Write-Host "Creating new user account..." -ForegroundColor Cyan
            $createSuccess = Create-NewUser -Credential $adminCredential
            if ($createSuccess) {
                Write-Host "🎉 New user account created successfully!" -ForegroundColor Green
            }
            Write-Host "`n"
            Read-Host "Press Enter to return to the main menu..."
        }
        '5' {
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
        '6' {
            $script:UseParallelProcessing = -not $script:UseParallelProcessing
            Write-Host "🚀 Parallel Processing: $(if ($script:UseParallelProcessing) { 'ENABLED' } else { 'DISABLED' })" -ForegroundColor $(if ($script:UseParallelProcessing) { 'Green' } else { 'Yellow' })
            Write-Host "`n"
            Read-Host "Press Enter to return to the main menu..."
        }
        '7' {
            Write-Host "`n=== Settings & Configuration ===" -ForegroundColor Cyan
            Write-Host "Current Settings:" -ForegroundColor Yellow
            Write-Host "  Parallel Processing: $(if ($script:UseParallelProcessing) { 'Enabled' } else { 'Disabled' })" -ForegroundColor $(if ($script:UseParallelProcessing) { 'Green' } else { 'Gray' })
            Write-Host "  Voice Commands: $(if ($script:VoiceEnabled) { 'Available' } else { 'Disabled' })" -ForegroundColor $(if ($script:VoiceEnabled) { 'Green' } else { 'Gray' })
            Write-Host "  Max Parallel Jobs: $($script:MaxParallelJobs)" -ForegroundColor Gray
            
            $settingChoice = Read-Host "`nChange settings? (Y/N)"
            if ($settingChoice -eq 'Y' -or $settingChoice -eq 'y') {
                $newMaxJobs = Read-Host "Enter max parallel jobs (current: $($script:MaxParallelJobs))"
                if ($newMaxJobs -match '^\d+$' -and [int]$newMaxJobs -gt 0 -and [int]$newMaxJobs -le 20) {
                    $script:MaxParallelJobs = [int]$newMaxJobs
                    Write-Host "✅ Max parallel jobs updated to: $($script:MaxParallelJobs)" -ForegroundColor Green
                } else {
                    Write-Host "❌ Invalid number. Must be between 1 and 20." -ForegroundColor Red
                }
            }
            Write-Host "`n"
            Read-Host "Press Enter to return to the main menu..."
        }
        '8' {
            Write-Host "Exiting AD Helper Advanced." -ForegroundColor Yellow
            $exitMainMenu = $true
        }
        default {
            Write-Warning "Invalid choice. Please try again."
        }
    }
}

Stop-Transcript
