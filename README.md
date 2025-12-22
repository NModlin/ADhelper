# ADhelper - Active Directory & Microsoft 365 User Management Tool

![PowerShell](https://img.shields.io/badge/PowerShell-5.1%2B-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Windows-lightgrey)

**ADhelper** is a comprehensive PowerShell script that streamlines the onboarding process for new users by automating Active Directory group assignments, Microsoft 365 license provisioning, and Exchange Online proxy address configuration.

## 🎯 What Does It Do?

```
┌─────────────────────────────────────────────────────────────┐
│                    ADhelper Workflow                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                  ┌─────────────────┐
                  │  Enter Username │
                  └────────┬────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  1. Add to 6 Groups    │ ✅
              │     • All_Employees    │
              │     • US Employees     │
              │     • USEmployees      │
              │     • Password Policy  │
              │     • Intune Enrollment│
              │     • Help Desk Access │
              └────────┬───────────────┘
                       │
                       ▼
              ┌────────────────────────┐
              │  2. Assign Licenses    │ 📋
              │     • EMS E3           │
              │     • Office 365 E3/F3 │
              └────────┬───────────────┘
                       │
                       ▼
              ┌────────────────────────┐
              │  3. Wait for Mailbox   │ ⏳
              │     (up to 60 seconds) │
              └────────┬───────────────┘
                       │
                       ▼
              ┌────────────────────────┐
              │  4. Configure Proxies  │ ✉️
              │     • 6 email addresses│
              │     • SIP address      │
              └────────┬───────────────┘
                       │
                       ▼
                  ┌─────────┐
                  │  Done!  │ 🎉
                  └─────────┘
```

**Time per user**: ~2-3 minutes | **Manual steps saved**: ~15-20 minutes

## 🚀 Features

- **🔐 Secure Authentication**: Login with admin credentials (a- account) for both AD and Microsoft 365
- **👥 Automatic Group Assignment**: Adds users to 6 standard employee groups
- **📋 License Management**: Assigns Microsoft 365 licenses (EMS E3 + Office 365 E3/F3)
- **📧 Mailbox Provisioning**: Monitors Exchange Online mailbox creation
- **✉️ Proxy Address Configuration**: Automatically configures all required email proxy addresses
- **🔄 Automatic Module Installation**: Installs required PowerShell modules on first run
- **📊 Detailed Reporting**: Comprehensive logging and status summaries
- **⚠️ Smart Error Handling**: Graceful error recovery with helpful troubleshooting tips

## 📋 Prerequisites

### Required
- **Windows 10/11** or **Windows Server 2016+**
- **PowerShell 5.1** or higher
- **RSAT: Active Directory Tools** (installed via Windows Features)
- **Admin credentials** for Active Directory and Microsoft 365

### Auto-Installed (if missing)
- **MSOnline PowerShell Module** (for Microsoft 365 license management)
- **NuGet Package Provider**

## 🛠️ Installation

### Option 1: Quick Start (Recommended)

1. **Clone or download this repository**:
   ```powershell
   git clone https://github.com/NModlin/ADscripts.git
   cd ADscripts
   ```

2. **Run as Administrator** (for automatic module installation):
   ```powershell
   Right-click PowerShell → "Run as Administrator"
   .\ADhelper.ps1
   ```

3. **Follow the prompts** - the script will automatically install any missing modules!

### Option 2: Manual Module Installation

If you prefer to install modules manually before running:

```powershell
# Install MSOnline module
Install-Module MSOnline -Scope CurrentUser

# Install RSAT (Windows 10/11)
# Settings → Apps → Optional Features → Add a feature → "RSAT: Active Directory Domain Services and Lightweight Directory Services Tools"

# Or via PowerShell (Windows Server)
Install-WindowsFeature RSAT-AD-PowerShell
```

## 📖 Usage

### Basic Workflow

1. **Launch the script**:
   ```powershell
   .\ADhelper.ps1
   ```

2. **Module Check**: Script automatically checks and installs required modules
   ```
   ╔════════════════════════════════════════════════════════════╗
   ║  Checking and Installing Required Modules...              ║
   ╚════════════════════════════════════════════════════════════╝
   [1/2] Checking Active Directory module...
   ✅ Active Directory module is already installed and loaded.
   [2/2] Checking MSOnline module...
   ✅ MSOnline module is already installed.
   ```

3. **Login**: Enter your admin credentials (e.g., `a-nmodlin`)

4. **Main Menu**:
   ```
   ╔════════════════════════════════════════════════════════════╗
   ║      AD HELPER - Group, License & Proxy Manager           ║
   ╚════════════════════════════════════════════════════════════╝
     [1] Process User (Groups → Licenses → Proxies)
     [2] View License Availability
     [3] Exit
   ```

5. **Process a User**: Select option 1 and enter the user's sAMAccountName or email

### What Happens When Processing a User

The script performs operations in this order:

1. ✅ **Adds to 6 Standard Groups**:
   - All_Employees
   - US Employees (Distribution List)
   - USEmployees (Security Group)
   - Password Policy - Standard User No Expiration
   - Intune User Enrollment
   - Help Desk Access

2. ✅ **Assigns Microsoft 365 Licenses**:
   - Shows available license counts
   - Prompts for E3 or F3 selection
   - Assigns Enterprise Mobility + Security E3
   - Assigns selected Office 365 license (E3 or F3)

3. ✅ **Monitors Mailbox Creation**:
   - Waits up to 60 seconds for Exchange Online provisioning
   - Provides status updates

4. ✅ **Configures Proxy Addresses**:
   - smtp:user@rehrigpenn.com
   - smtp:user@Rehrigpacific.com
   - smtp:user@Rehrig.onmicrosoft.com
   - smtp:user@Rehrig.mail.onmicrosoft.com
   - SMTP:user@Rehrig.com (primary)
   - SIP:user@Rehrig.com

### Example Session

```
Enter sAMAccountName or Email: jsmith

✅ Found user: John Smith
   UPN: jsmith@rehrig.com
   Account Status: Enabled ✅

=== Adding User to Standard Groups ===
  ✅ Added to: CN=All_Employees,OU=Adaxes Managed,OU=Security Groups,DC=RPL,DC=Local
  ✅ Added to: CN=US Employees,OU=Distribution Lists,DC=RPL,DC=Local
  ℹ️  Already member of: CN=USEmployees,OU=Adaxes Managed,OU=Security Groups,DC=RPL,DC=Local
  ✅ Added to: CN=Password Policy - Standard User No Expiration,OU=Security Groups,DC=RPL,DC=Local
  ✅ Added to: CN=Intune User Enrollment,OU=Security Groups,DC=RPL,DC=Local
  ✅ Added to: CN=Help Desk Access,OU=Security Groups,DC=RPL,DC=Local

Group Membership Summary:
  Groups added: 5
  Already member: 1
  Failed: 0

=== Available Licenses ===
  Enterprise Mobility + Security E3: 25 available
  Office 365 E3: 50 available
  Office 365 F3: 100 available

--- License Selection ---
  [1] Office 365 E3
  [2] Office 365 F3
  [3] Skip license assignment
Select Office license type (1-3): 1

=== Assigning Microsoft 365 Licenses ===
Found M365 user: John Smith
ℹ️  UsageLocation: US
  ✅ Assigned: Enterprise Mobility + Security E3
  ✅ Assigned: Office 365 E3

License Assignment Summary:
  Licenses assigned: 2
  Already assigned: 0
  Failed: 0

=== Checking for Exchange Online Mailbox ===
Waiting for mailbox to be created (this may take a moment)...
   Still waiting... (10 seconds elapsed)
✅ Exchange Online license is active.
   Mailbox should be available within a few minutes.

=== Fixing Proxy Addresses ===
  ✅ Added: smtp:jsmith@rehrigpenn.com
  ✅ Added: smtp:Jsmith@Rehrigpacific.com
  ℹ️  Already has: smtp:Jsmith@Rehrig.onmicrosoft.com
  ✅ Added: smtp:Jsmith@Rehrig.mail.onmicrosoft.com
  ℹ️  Already has: SMTP:Jsmith@Rehrig.com
  ✅ Added: SIP:Jsmith@Rehrig.com

Proxy Address Summary:
  Addresses added: 4
  Already configured: 2
  Failed: 0

╔════════════════════════════════════════════════════════════╗
║  FINAL SUMMARY FOR: John Smith                            ║
╚════════════════════════════════════════════════════════════╝

Operation Results:
  Groups:   ✅ Success
  Licenses: ✅ Success
  Mailbox:  ✅ Provisioned
  Proxies:  ✅ Success

🎉 All operations completed successfully!
```

## 🔧 Configuration

### Customizing Standard Groups

Edit the `$standardGroups` array at the top of `ADhelper.ps1`:

```powershell
$standardGroups = @(
    "CN=All_Employees,OU=Adaxes%20Managed,OU=Security%20Groups,DC=RPL,DC=Local",
    "CN=US%20Employees,OU=Distribution%20Lists,DC=RPL,DC=Local",
    # Add or remove groups as needed
)
```

### Customizing Proxy Addresses

Edit the `Get-ExpectedProxyAddresses` function to modify the proxy address list.

### Customizing License SKUs

The script automatically detects licenses by SKU part number:
- **EMS E3**: `EMSPREMIUM`
- **Office 365 E3**: `ENTERPRISEPACK`
- **Office 365 F3**: `DESKLESSPACK` or `SPE_F1`

## 📊 Logging

All operations are logged to timestamped files:
```
ADHelper-Log-2025-11-19_12-36-52.txt
```

Logs include:
- All operations performed
- Success/failure status
- Error messages and warnings
- Timestamps for each action

## ⚠️ Error Handling

The script includes comprehensive error handling for common scenarios:

### User Not Found
```
❌ User 'jsmth' not found in Active Directory.
💡 Tips:
   - Check the spelling of the username
   - Make sure the user account has been created
   - Try using the full sAMAccountName (e.g., 'jsmith' not 'John Smith')
```

### Account Disabled
```
⚠️ This account is currently disabled. Some operations may fail.
Do you want to continue anyway? (Y/N)
```

### No Licenses Available
```
❌ No Office 365 E3 licenses available. Cannot proceed with E3 assignment.
```

### User Not Synced to Azure AD
```
❌ User not found in Microsoft 365: jsmith@rehrig.com
⚠️ The user may not be synced to Azure AD yet. This can take up to 30 minutes after AD creation.
⚠️ You can skip license assignment for now and run this again later.
```

### Missing UsageLocation
```
⚠️ User does not have a UsageLocation set. Setting to 'US'...
✅ UsageLocation set to 'US'
```

### Microsoft 365 Connection Failure
```
⚠️ Failed to connect to Microsoft 365: Authentication failed
💡 Tips:
   - Verify your admin account has Microsoft 365 admin rights
   - Check if MFA is enabled (may require app password)
   - Ensure the account is not locked or expired
⚠️ License assignment features will not be available.
⚠️ You can still use proxy and group management features.
```

## 🔒 Security Considerations

- **Credentials**: Admin credentials are only stored in memory during script execution
- **Logging**: Logs do not contain passwords or sensitive credential information
- **Permissions**: Requires appropriate AD and M365 admin rights
- **Scope**: Only modifies specified users - no bulk operations without confirmation

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👤 Author

**NateDog (NModlin)**
- GitHub: [@NModlin](https://github.com/NModlin)

## 🙏 Acknowledgments

- Built for streamlining user onboarding processes
- Designed to reduce manual configuration errors
- Saves IT administrators significant time on repetitive tasks

## 📞 Support

If you encounter any issues or have questions:
1. Check the error messages - they include helpful troubleshooting tips
2. Review the log files for detailed operation history
3. Open an issue on GitHub with the error details

## 📦 Additional Utilities

This repository also includes standalone utility scripts:

### autoSMTPproxy.ps1
A focused script for auditing and fixing proxy addresses for existing users. Useful for:
- Bulk proxy address audits
- Fixing proxy addresses without modifying groups or licenses
- Generating proxy audit reports

### autoGroupAdd.ps1
A standalone script for adding users to standard employee groups. Useful for:
- Adding groups without license assignment
- Batch group membership operations
- Quick group additions

**Note**: For new user onboarding, **ADhelper.ps1** is recommended as it combines all operations in the correct order.

---

**⚡ Quick Start**: `.\ADhelper.ps1` (Run as Administrator for best experience)

**🎯 Recommended for**: New user onboarding, complete user setup, automated provisioning


