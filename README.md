# ADhelper - Active Directory & Jira Management App

![React](https://img.shields.io/badge/React-19.2.3-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue)
![Electron](https://img.shields.io/badge/Electron-39.2.7-blue)
![Material-UI](https://img.shields.io/badge/Material--UI-7.3.7-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Windows-lightgrey)

## 🚀 Quick Start

**Browser Mode (Recommended):**
```bash
npm run dev:vite
```
Then open: `http://127.0.0.1:5173`

**Desktop Mode (Electron):**
```bash
npm run dev
```

See [How to Run](docs/guides/HOW_TO_RUN.md) for detailed instructions.

## 📚 Documentation

**Complete documentation is now organized in the [docs/](docs/) directory!**

- **[📖 Documentation Index](docs/INDEX.md)** - Complete documentation catalog
- **[🚀 Getting Started](docs/guides/GETTING_STARTED.md)** - New user guide
- **[✨ Features](docs/features/)** - Feature documentation
- **[📘 Guides](docs/guides/)** - Configuration and deployment guides
- **[🔧 Technical Docs](docs/technical/)** - Implementation details
- **[🎨 UI/UX Docs](docs/ui-ux/)** - Branding and design guidelines
- **[📊 Status Reports](docs/status/)** - Implementation status and testing

> **Tip:** Start with the [Documentation Index](docs/INDEX.md) to find what you need!

---

## 📖 About

**ADhelper** is a modern web/desktop application that combines:
1. **Active Directory Management** - PowerShell-based user onboarding automation
2. **Jira Ticket Management** - Find and update stale tickets automatically

Built with React, TypeScript, Material-UI, and Electron. Works in both browser and desktop modes!

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
              │  1. Add to 10 Groups   │ ✅
              │     • All_Employees    │
              │     • US Employees     │
              │     • USEmployees      │
              │     • Password Policy  │
              │     • Intune Enrollment│
              │     • Help Desk Access │
              │     • RehrigVPN        │
              │     • RehrigVPN_Distro │
              │     • GeneralDistrib.  │
              │     • Selfservice      │
              └────────┬───────────────┘
                       │
                       ▼
              ┌────────────────────────┐
              │  2. Configure Proxies  │ ✉️
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

### Core Functionality
- **🔐 Secure Authentication**: Login with admin credentials (a- account) for Active Directory
- **👥 Automatic Group Assignment**: Adds users to 10 standard employee groups
- **✉️ Proxy Address Configuration**: Automatically configures all required email proxy addresses
- **🔓 Account Management**: Password reset, account unlock, MFA group removal, and user creation
- **📦 Contractor Account Processing**: Extend contractor accounts with proper group and proxy setup
- **📊 Detailed Reporting**: Comprehensive logging and status summaries
- **⚠️ Smart Error Handling**: Graceful error recovery with helpful troubleshooting tips

### 🚀 Advanced Features
- **⚡ Parallel Processing**: 60-80% faster processing with configurable concurrent jobs (1-20)
- **📦 Bulk User Processing**: Process multiple users via CSV, comma-separated, or multiline input with mode selection (All/Groups Only/Proxies Only)
- **📅 Contractor Account Processing**: Move users to Non-Rehrig OU, set expiration, apply groups and proxies
- **🔓 MFA Blocking Removal**: Remove users from MFA blocking group with email-format support
- **🛡️ Role-Based Access Control**: Admin/Operator roles with permission-gated operations
- **📝 Audit Logging**: All sensitive operations logged to structured audit trail
- **⚙️ Externalized Configuration**: Groups, proxies, and contractor settings in `config/adhelper-config.json`
- **📊 Real-time Progress Tracking**: Native Electron progress bars for all operations
- **🎤 Voice Commands**: Optional voice-controlled interface for hands-free operation (PowerShell)
- **🔐 Secure Credential Storage**: Windows Credential Manager integration

### Performance Improvements
- **Single User**: 45-60s → 12-20s (70-75% faster with parallel processing)
- **Bulk Users (10)**: 8-10 min → 2-3 min (70-80% faster)
- **Group Assignment**: 30-45s → 8-15s (60-80% faster)
- **Proxy Configuration**: 10-15s → 3-5s (70-80% faster)

## 📋 Prerequisites

### Required
- **Windows 10/11** or **Windows Server 2016+**
- **PowerShell 5.1** or higher
- **RSAT: Active Directory Tools** (installed via Windows Features)
- **Admin credentials** for Active Directory (a- account)

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

### Option 2: Manual RSAT Installation

If RSAT is not installed:

```powershell
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
   Checking Active Directory module...
   ✅ Active Directory module is already installed and loaded.
   ```

3. **Login**: Enter your admin credentials (e.g., `a-nmodlin`)

4. **Main Menu**:
   ```
   ╔════════════════════════════════════════════════════════════╗
   ║      AD HELPER - Group & Proxy Manager                    ║
   ╚════════════════════════════════════════════════════════════╝
     [1]  Process User (Validation → Groups → Proxies)
     [2]  Process Bulk Users (CSV or Array) 🚀
     [3]  Reset User Password
     [4]  Unlock User Account
     [5]  Create New User Account
     [6]  Voice Commands Mode 🎤
     [7]  Toggle Parallel Processing
     [8]  Settings & Configuration
     [9]  Remove from MFA Blocking Group 🔓
     [10] Voice Commands Test & Diagnostics 🔧
     [11] Process Contractor Accounts 📅
     [12] Exit
   ```

5. **Process a User**: Select option 1 and enter the user's sAMAccountName or email

### What Happens When Processing a User

The script performs operations in this order:

1. ✅ **Adds to 10 Standard Groups**:
   - All_Employees
   - US Employees (Distribution List)
   - USEmployees (Security Group)
   - Password Policy - Standard User No Expiration
   - Intune User Enrollment
   - Help Desk Access
   - RehrigVPN
   - RehrigVPN_Distro
   - GeneralDistribution
   - Selfservice

2. ✅ **Configures Proxy Addresses**:
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
  Proxies:  ✅ Success

🎉 All operations completed successfully!
```

## 🔧 Configuration

### Externalized Configuration

Groups, proxy templates, and contractor settings are now in `config/adhelper-config.json`:

```json
{
  "standardGroups": [ "CN=All_Employees,..." ],
  "proxyAddressTemplates": [
    { "prefix": "smtp", "domain": "rehrigpenn.com", "casing": "lower" },
    { "prefix": "SMTP", "domain": "Rehrig.com", "casing": "titleCase" }
  ],
  "contractor": {
    "targetOU": "OU=Non-Rehrig,OU=Accounts,DC=RPL,DC=Local",
    "displayNameSuffix": " - Contractor",
    "extensionYears": 1
  }
}
```

The config module (`scripts/ADConfig.psm1`) searches: user override → dev repo → installed app → hardcoded fallback.

### Customizing Standard Groups

Edit the `standardGroups` array in `config/adhelper-config.json`, or the `$standardGroups` array in `ADhelper.ps1` (fallback).

### Customizing Proxy Addresses

Edit `proxyAddressTemplates` in `config/adhelper-config.json`, or the `Get-ExpectedProxyAddresses` function in `ADhelper.ps1` (fallback).

## 📊 Logging

**PowerShell logs** — timestamped files per session:
```
ADHelper-Log-2025-11-19_12-36-52.txt
```

**Electron logs** (in `%APPDATA%/adhelper-app/logs/`):
- `adhelper-main.log` — Main process log (5MB rotation)
- `adhelper-audit.log` — Sensitive operation audit trail (10MB rotation)
- `adhelper-ps.log` — PowerShell structured JSON log (5MB rotation)

Logs include:
- All operations performed with structured JSON metadata
- Success/failure status and error details
- Timestamps for each action
- Audit trail for user creation, role changes, and credential access

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

## 🔒 Security Considerations

- **Credentials**: Admin credentials stored securely via Windows Credential Manager
- **RBAC**: Role-based access control with Admin/Operator tiers restricts sensitive operations
- **Audit Logging**: All sensitive operations logged to structured audit trail with timestamps
- **Logging**: Main and PowerShell structured JSON logs; no passwords in logs
- **Permissions**: Requires appropriate AD admin rights (a- account)
- **Scope**: Only modifies specified users - no bulk operations without confirmation
- **Input Validation**: All user inputs are validated before processing
- **PowerShell Security**: Scripts executed via `-File` (never `-Command`) to prevent injection
- **Electron Security**: Context isolation enabled, node integration disabled, CSP headers enforced
- **Rate Limiting**: IPC handlers protected against rapid repeated invocations

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


