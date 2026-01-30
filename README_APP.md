# ADHelper Desktop Application

A modern Electron-based desktop application for managing Active Directory users and Jira tickets.

## Features

### 🎯 AD Helper
- **User Management**: Search and process Active Directory users
- **Group Assignment**: Automatically add users to standard employee groups
- **License Management**: Assign Microsoft 365 licenses (EMS E3, Office 365 E3/F3)
- **Proxy Configuration**: Configure email proxy addresses automatically
- **Real-time Progress**: See live updates as operations are performed

### 📋 Jira 48h Updater
- **Stale Ticket Detection**: Find tickets not updated in 48 hours
- **Bulk Updates**: Update multiple tickets at once
- **Flexible Actions**: Add comments, change status, or update assignees
- **Jira API Integration**: Direct integration with Jira Cloud

### ⚙️ Modern Interface
- **Material-UI Design**: Beautiful, responsive interface
- **Dark/Light Mode**: Toggle between themes
- **Dashboard**: Overview of recent activities and statistics
- **Settings Panel**: Configure AD and M365 settings

## Development

### Prerequisites
- Node.js 18+ and npm
- PowerShell 5.1+
- Windows 10/11
- Active Directory PowerShell module
- Microsoft Graph PowerShell SDK

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run in development mode**:
   ```bash
   npm run dev
   ```
   This will start both the Vite dev server and Electron app.

3. **Build for production**:
   ```bash
   npm run build
   ```
   This creates a distributable installer in the `release/` folder.

### Project Structure

```
ADhelperAPP/
├── src/
│   ├── main/              # Electron main process
│   │   └── main.ts        # Main process entry point
│   ├── preload/           # Preload scripts
│   │   └── preload.ts     # IPC bridge
│   └── renderer/          # React frontend
│       ├── components/    # Reusable components
│       ├── pages/         # Page components
│       │   ├── Dashboard.tsx
│       │   ├── ADHelper.tsx
│       │   ├── JiraUpdater.tsx
│       │   └── Settings.tsx
│       ├── services/      # API services
│       ├── App.tsx        # Main app component
│       └── main.tsx       # React entry point
├── public/                # Static assets
├── scripts/               # Build scripts
├── ADhelper_fixed.ps1     # PowerShell backend
└── package.json           # Dependencies and scripts
```

## Building the Installer

To create a Windows installer:

```bash
npm run build:win
```

This will create an NSIS installer in the `release/` directory with:
- Desktop shortcut
- Start menu entry
- Uninstaller
- All required dependencies

## Usage

### AD Helper

1. Launch the application
2. Navigate to "AD Helper" from the sidebar
3. Enter a username or email address
4. Click "Process User"
5. The app will:
   - Add user to standard groups
   - Assign M365 licenses
   - Configure proxy addresses
   - Show real-time progress

### Jira Updater

1. Navigate to "Jira Updater"
2. Configure your Jira settings:
   - Jira URL
   - Email
   - API Token
3. Select update action
4. Click "Find Stale Tickets"
5. Review tickets and click "Update All"

## Configuration

Settings can be configured in the Settings page:
- Active Directory domain and server
- Microsoft 365 tenant ID
- Application preferences
- Auto-save credentials
- Notifications

## Technologies

- **Electron**: Desktop application framework
- **React**: UI framework
- **TypeScript**: Type-safe development
- **Material-UI**: Component library
- **Vite**: Fast build tool
- **PowerShell**: Backend automation
- **Jira API**: Ticket management

## License

MIT License - See LICENSE file for details

## Author

NModlin

## Support

For issues and feature requests, please visit:
https://github.com/NModlin/ADhelper/issues

