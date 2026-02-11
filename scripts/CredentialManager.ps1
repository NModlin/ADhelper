# Windows Credential Manager Integration for ADHelper App
# Securely stores and retrieves credentials using Windows Credential Manager

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('Save', 'Get', 'Delete', 'List', '')]
    [string]$Action = '',

    [Parameter(Mandatory=$false)]
    [string]$Target,

    [Parameter(Mandatory=$false)]
    [string]$Username,

    [Parameter(Mandatory=$false)]
    [string]$Password
)

# ── 0. Structured logging ──────────────────────────────────────────────────
Import-Module "$PSScriptRoot\PSLogger.psm1" -Force
Initialize-PSLogger -ScriptName "CredentialManager"

# Function to save credentials to Windows Credential Manager
function Save-Credential {
    param(
        [string]$Target,
        [string]$Username,
        [string]$Password
    )
    
    try {
        # Use cmdkey to store credentials
        $result = cmdkey /generic:$Target /user:$Username /pass:$Password 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-PSLog -Level "INFO" -Message "Credential saved" -Data @{ target = $Target; username = $Username }
            Write-Output @{
                success = $true
                message = "Credential saved successfully"
                target = $Target
            } | ConvertTo-Json -Compress
        } else {
            Write-PSLog -Level "ERROR" -Message "Failed to save credential" -Data @{ target = $Target; result = "$result" }
            Write-Output @{
                success = $false
                error = "Failed to save credential: $result"
            } | ConvertTo-Json -Compress
        }
    } catch {
        Write-PSLog -Level "ERROR" -Message "Save credential exception" -Data @{ target = $Target; error = $_.Exception.Message }
        Write-Output @{
            success = $false
            error = $_.Exception.Message
        } | ConvertTo-Json -Compress
    }
}

# Function to retrieve credentials from Windows Credential Manager
function Get-Credential {
    param(
        [string]$Target
    )
    
    try {
        # Use PowerShell to read from Credential Manager
        $cred = Get-StoredCredential -Target $Target
        
        if ($cred) {
            Write-Output @{
                success = $true
                username = $cred.UserName
                password = $cred.GetNetworkCredential().Password
                target = $Target
            } | ConvertTo-Json -Compress
        } else {
            Write-Output @{
                success = $false
                error = "Credential not found"
            } | ConvertTo-Json -Compress
        }
    } catch {
        Write-Output @{
            success = $false
            error = $_.Exception.Message
        } | ConvertTo-Json -Compress
    }
}

# Helper function to get stored credential using Windows API
function Get-StoredCredential {
    param([string]$Target)
    
    Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class CredentialManager
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

    [DllImport("advapi32.dll")]
    public static extern void CredFree(IntPtr cred);
}
"@

    $credPtr = [IntPtr]::Zero
    $success = [CredentialManager]::CredRead($Target, 1, 0, [ref]$credPtr)
    
    if ($success) {
        $cred = [System.Runtime.InteropServices.Marshal]::PtrToStructure($credPtr, [type][CredentialManager+CREDENTIAL])
        $password = [System.Runtime.InteropServices.Marshal]::PtrToStringUni($cred.CredentialBlob, $cred.CredentialBlobSize / 2)
        [CredentialManager]::CredFree($credPtr)
        
        $securePassword = ConvertTo-SecureString -String $password -AsPlainText -Force
        return New-Object System.Management.Automation.PSCredential($cred.UserName, $securePassword)
    }
    
    return $null
}

# Function to delete credentials
function Delete-Credential {
    param([string]$Target)
    
    try {
        $result = cmdkey /delete:$Target 2>&1

        if ($LASTEXITCODE -eq 0) {
            Write-PSLog -Level "INFO" -Message "Credential deleted" -Data @{ target = $Target }
            Write-Output @{
                success = $true
                message = "Credential deleted successfully"
            } | ConvertTo-Json -Compress
        } else {
            Write-PSLog -Level "ERROR" -Message "Failed to delete credential" -Data @{ target = $Target; result = "$result" }
            Write-Output @{
                success = $false
                error = "Failed to delete credential: $result"
            } | ConvertTo-Json -Compress
        }
    } catch {
        Write-PSLog -Level "ERROR" -Message "Delete credential exception" -Data @{ target = $Target; error = $_.Exception.Message }
        Write-Output @{
            success = $false
            error = $_.Exception.Message
        } | ConvertTo-Json -Compress
    }
}

# Main execution — only runs when -Action is provided (not when dot-sourced)
if (-not $Action) { return }
switch ($Action) {
    'Save' {
        if (-not $Target -or -not $Username -or -not $Password) {
            Write-Output @{
                success = $false
                error = "Target, Username, and Password are required for Save action"
            } | ConvertTo-Json -Compress
            exit 1
        }
        Save-Credential -Target $Target -Username $Username -Password $Password
    }
    'Get' {
        if (-not $Target) {
            Write-Output @{
                success = $false
                error = "Target is required for Get action"
            } | ConvertTo-Json -Compress
            exit 1
        }
        Get-Credential -Target $Target
    }
    'Delete' {
        if (-not $Target) {
            Write-Output @{
                success = $false
                error = "Target is required for Delete action"
            } | ConvertTo-Json -Compress
            exit 1
        }
        Delete-Credential -Target $Target
    }
}

