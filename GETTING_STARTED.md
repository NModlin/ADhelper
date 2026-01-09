# Getting Started with ADHelper Desktop App

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Run in Development Mode

```bash
npm run dev
```

This will:
- Start the Vite development server on http://localhost:5173
- Launch the Electron app automatically
- Enable hot-reload for instant updates

### 3. Build for Production

```bash
npm run build:win
```

This creates a Windows installer in the `release/` folder.

## 📁 Project Structure

```
ADhelperAPP/
├── src/
│   ├── main/
│   │   └── main.ts              # Electron main process
│   ├── preload/
│   │   └── preload.ts           # IPC bridge (secure communication)
│   └── renderer/
│       ├── pages/
│       │   ├── Dashboard.tsx    # Main dashboard
│       │   ├── ADHelper.tsx     # AD user management
│       │   ├── JiraUpdater.tsx  # Jira ticket updater
│       │   └── Settings.tsx     # App settings
│       ├── App.tsx              # Main React component
│       └── main.tsx             # React entry point
├── public/
│   ├── index.html               # HTML template
│   └── icon.ico                 # App icon
├── ADhelper_fixed.ps1           # PowerShell backend
└── package.json                 # Dependencies & scripts
```

## 🎨 Features

### Dashboard
- Overview of recent activities
- Quick stats (users processed, tickets updated, etc.)
- Quick access to main features

### AD Helper
- Search for users by username or email
- Automatically add users to standard groups
- Assign Microsoft 365 licenses
- Configure email proxy addresses
- Real-time progress updates

### Jira Updater
- Find tickets not updated in 48 hours
- Bulk update tickets
- Configurable update actions (comment, status, assignee)
- Direct Jira API integration

### Settings
- Configure Active Directory settings
- Set Microsoft 365 tenant info
- Application preferences
- Dark/Light mode toggle

## 🔧 Development

### Available Scripts

- `npm run dev` - Run in development mode
- `npm run build` - Build for production
- `npm run build:main` - Compile Electron main process
- `npm run build:renderer` - Build React frontend
- `npm run build:win` - Create Windows installer

### Tech Stack

- **Electron** - Desktop app framework
- **React** - UI library
- **TypeScript** - Type safety
- **Material-UI** - Component library
- **Vite** - Build tool
- **PowerShell** - Backend automation

## 📦 Building the Installer

The installer includes:
- ✅ Desktop shortcut
- ✅ Start menu entry
- ✅ Uninstaller
- ✅ All dependencies bundled
- ✅ PowerShell scripts included

To customize the installer, edit the `build` section in `package.json`.

## 🎯 Next Steps

1. **Customize the PowerShell script** (`ADhelper_fixed.ps1`) for your environment
2. **Add your Jira API credentials** in the Settings page
3. **Configure AD domain settings** in Settings
4. **Test the app** with a test user
5. **Build the installer** and deploy to your team

## 🐛 Troubleshooting

### App won't start
- Make sure Node.js 18+ is installed
- Run `npm install` to install dependencies
- Check that port 5173 is not in use

### PowerShell errors
- Ensure PowerShell 5.1+ is installed
- Check that AD PowerShell module is available
- Run PowerShell as Administrator

### Build errors
- Delete `node_modules` and `dist` folders
- Run `npm install` again
- Try `npm run build:main` and `npm run build:renderer` separately

## 📝 License

MIT License - See LICENSE file for details

