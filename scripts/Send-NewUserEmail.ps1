function Send-NewUserCredentialEmail {
    <#
    .SYNOPSIS
        Sends an email to the manager with new user credentials.
    
    .DESCRIPTION
        Sends a professionally formatted HTML email to the manager containing
        the new employee's credentials and important security information.
    
    .PARAMETER EmployeeName
        Full name of the new employee
    
    .PARAMETER EmailAddress
        Email address of the new employee
    
    .PARAMETER TempPassword
        Temporary password for the new employee
    
    .PARAMETER ManagerEmail
        Email address of the manager who will receive the credentials
    
    .PARAMETER CreationDate
        Date and time when the account was created
    
    .EXAMPLE
        Send-NewUserCredentialEmail -EmployeeName "John Smith" -EmailAddress "jsmith@rehrig.com" -TempPassword "TempPass123!" -ManagerEmail "manager@rehrig.com" -CreationDate "2026-02-09 14:30:00"
    #>
    
    param (
        [Parameter(Mandatory=$true)]
        [string]$EmployeeName,
        
        [Parameter(Mandatory=$true)]
        [string]$EmailAddress,
        
        [Parameter(Mandatory=$true)]
        [string]$TempPassword,
        
        [Parameter(Mandatory=$true)]
        [string]$ManagerEmail,
        
        [Parameter(Mandatory=$false)]
        [string]$CreationDate = (Get-Date -Format "MMMM dd, yyyy 'at' hh:mm tt")
    )
    
    try {
        # Get the email template path
        $scriptRoot = Split-Path -Parent $PSScriptRoot
        $templatePath = Join-Path $scriptRoot "email-templates\NewUserCredentials.html"
        
        if (-not (Test-Path $templatePath)) {
            Write-Error "Email template not found at: $templatePath"
            return $false
        }
        
        # Read the HTML template
        $htmlBody = Get-Content $templatePath -Raw
        
        # Replace placeholders with actual values
        $htmlBody = $htmlBody -replace '{{EMPLOYEE_NAME}}', $EmployeeName
        $htmlBody = $htmlBody -replace '{{EMAIL_ADDRESS}}', $EmailAddress
        $htmlBody = $htmlBody -replace '{{TEMP_PASSWORD}}', $TempPassword
        $htmlBody = $htmlBody -replace '{{CREATION_DATE}}', $CreationDate
        $htmlBody = $htmlBody -replace '{{CURRENT_YEAR}}', (Get-Date).Year
        
        # Email configuration
        $emailParams = @{
            From = "noreply-adhelper@rehrig.com"
            To = $ManagerEmail
            Subject = "New User Account Created: $EmployeeName"
            Body = $htmlBody
            BodyAsHtml = $true
            SmtpServer = "smtp.office365.com"  # Update with your SMTP server
            Port = 587
            UseSsl = $true
            Credential = $null  # Will be set below
        }
        
        # Get SMTP credentials from Windows Credential Manager
        # You may need to store SMTP credentials separately
        # For now, we'll try to use the same admin credentials
        $smtpCred = Get-StoredCredential -Target "ADHelper_SMTP_Cred"
        
        if (-not $smtpCred) {
            Write-Warning "No SMTP credentials found in Credential Manager (Target: ADHelper_SMTP_Cred)"
            Write-Warning "Attempting to use admin credentials for SMTP..."
            $smtpCred = Get-StoredCredential -Target "ADHelper_AdminCred"
        }
        
        if (-not $smtpCred) {
            Write-Error "No credentials available for sending email. Please configure SMTP credentials."
            return $false
        }
        
        $emailParams.Credential = $smtpCred
        
        # Send the email
        Write-Host "📧 Sending credentials email to manager: $ManagerEmail" -ForegroundColor Cyan
        Send-MailMessage @emailParams -ErrorAction Stop
        
        Write-Host "✅ Email sent successfully to $ManagerEmail" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Error "Failed to send email: $($_.Exception.Message)"
        Write-Host "❌ Email delivery failed. Please provide credentials to manager manually." -ForegroundColor Red
        return $false
    }
}

function Get-ManagerEmailFromDN {
    <#
    .SYNOPSIS
        Retrieves the manager's email address from their Distinguished Name.
    
    .PARAMETER ManagerDN
        Distinguished Name of the manager (e.g., CN=John Doe,OU=Users,DC=RPL,DC=Local)
    
    .PARAMETER Credential
        Credentials to use for AD query
    
    .EXAMPLE
        Get-ManagerEmailFromDN -ManagerDN "CN=John Doe,OU=Users,DC=RPL,DC=Local" -Credential $cred
    #>
    
    param (
        [Parameter(Mandatory=$true)]
        [string]$ManagerDN,
        
        [Parameter(Mandatory=$true)]
        [System.Management.Automation.PSCredential]$Credential
    )
    
    try {
        $manager = Get-ADUser -Identity $ManagerDN -Properties EmailAddress, UserPrincipalName -Credential $Credential -ErrorAction Stop
        
        # Try EmailAddress attribute first, then UserPrincipalName
        if (-not [string]::IsNullOrWhiteSpace($manager.EmailAddress)) {
            return $manager.EmailAddress
        }
        elseif (-not [string]::IsNullOrWhiteSpace($manager.UserPrincipalName)) {
            return $manager.UserPrincipalName
        }
        else {
            Write-Warning "Manager found but has no email address configured"
            return $null
        }
    }
    catch {
        Write-Error "Failed to retrieve manager email: $($_.Exception.Message)"
        return $null
    }
}

