# ADHelper Desktop App - Deployment Checklist

**Version:** 1.0.0
**Last Updated:** 2026-02-09
**Status:** Current
**Related Docs:** [README.md](../README.md)

## ✅ Pre-Deployment Checklist

### 1. **Development Setup**
- [ ] Node.js 18+ installed
- [ ] npm dependencies installed (`npm install`)
- [ ] PowerShell 5.1+ available
- [ ] Active Directory PowerShell module installed
- [ ] Microsoft Graph PowerShell SDK installed (optional)

### 2. **Configuration**
- [ ] Update `ADhelper_fixed.ps1` with your AD domain settings
- [ ] Test PowerShell script manually
- [ ] Configure default AD domain in Settings page
- [ ] Set up Jira credentials (if using Jira features)

### 3. **Customization**
- [ ] Replace `public/icon.ico` with your custom icon
- [ ] Update app name in `package.json` if desired
- [ ] Update company/author information
- [ ] Customize branding colors in `App.tsx` theme

### 4. **Testing**
- [ ] Run app in development mode: `npm run dev`
- [ ] Test AD Helper with a test user
- [ ] Test Jira integration (if applicable)
- [ ] Test dark/light mode toggle
- [ ] Test all navigation pages
- [ ] Verify PowerShell execution works
- [ ] Check error handling

### 5. **Build Preparation**
- [ ] Clean build artifacts: `rm -rf dist release`
- [ ] Compile main process: `npm run build:main`
- [ ] Build renderer: `npm run build:renderer`
- [ ] Verify no TypeScript errors

## 🚀 Building the Installer

### Option 1: Using npm script
```bash
npm run build:win
```

### Option 2: Using batch file
Double-click `BUILD_INSTALLER.bat`

### What Gets Created
- `release/ADHelper Setup X.X.X.exe` - NSIS installer
- Desktop shortcut (after installation)
- Start menu entry (after installation)
- Uninstaller

## 📦 Installer Configuration

The installer is configured in `package.json` under the `build` section:

```json
{
  "build": {
    "appId": "com.adhelper.app",
    "productName": "ADHelper",
    "win": {
      "target": ["nsis"],
      "icon": "public/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    }
  }
}
```

### Customization Options
- **appId**: Unique identifier for your app
- **productName**: Display name
- **icon**: Path to .ico file (256x256 recommended)
- **oneClick**: Set to `true` for one-click install
- **allowToChangeInstallationDirectory**: Let users choose install location

## 🎯 Post-Build Steps

### 1. **Test the Installer**
- [ ] Run the installer on a clean machine
- [ ] Verify desktop shortcut works
- [ ] Verify Start menu entry works
- [ ] Test the installed application
- [ ] Test uninstaller

### 2. **Distribution**
- [ ] Upload installer to file share/network drive
- [ ] Create installation instructions for users
- [ ] Document system requirements
- [ ] Provide support contact information

### 3. **User Documentation**
- [ ] Create user guide (screenshots, steps)
- [ ] Document AD permissions required
- [ ] Document Jira setup process
- [ ] Create FAQ document

## 🔧 Troubleshooting Build Issues

### "Cannot find module" errors
```bash
rm -rf node_modules package-lock.json
npm install
```

### TypeScript compilation errors
```bash
npm run build:main
# Fix any errors shown
```

### Vite build errors
```bash
npm run build:renderer
# Fix any errors shown
```

### Electron-builder errors
- Ensure all dependencies are installed
- Check that `dist/` folder contains compiled files
- Verify icon file exists at `public/icon.ico`

## 📋 System Requirements

### For Development
- Windows 10/11
- Node.js 18+
- PowerShell 5.1+
- 4GB RAM minimum
- 500MB disk space

### For End Users
- Windows 10/11
- PowerShell 5.1+ (included in Windows)
- Active Directory access (for AD features)
- Jira account (for Jira features)
- 200MB disk space

## 🎉 Quick Start Commands

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Build installer
npm run build:win

# Or use batch files
START_APP.bat          # Development mode
BUILD_INSTALLER.bat    # Build installer
```

## 📞 Support

If you encounter issues:
1. Check `GETTING_STARTED.md` for troubleshooting
2. Review error messages in console
3. Verify all prerequisites are met
4. Check PowerShell execution policy
5. Ensure AD module is available

---

**Ready to deploy?** Follow this checklist step by step for a smooth deployment! ✨

