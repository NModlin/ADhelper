# 🚀 ADHelper Desktop App - Quick Start Guide

## What You Have Now

A **modern, professional desktop application** that combines:
- ✅ **Active Directory management** (your existing PowerShell functionality)
- ✅ **Jira 48h ticket updater** (new feature)
- ✅ **Beautiful Material-UI interface** with dark/light mode
- ✅ **Windows installer** ready to build

---

## 🎯 Get Started in 3 Steps

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Run the App
```bash
npm run dev
```
**OR** double-click `START_APP.bat`

### Step 3: Explore!
- Navigate through Dashboard, AD Helper, Jira Updater, and Settings
- Toggle dark/light mode with the sun/moon icon
- Try processing a test user in AD Helper

---

## 📦 Build an Installer

When you're ready to distribute:

```bash
npm run build:win
```
**OR** double-click `BUILD_INSTALLER.bat`

The installer will be created in the `release/` folder.

---

## 🎨 What's Included

### 1. **Dashboard Page**
- Overview statistics
- Quick access cards
- Recent activity log

### 2. **AD Helper Page**
- Search users by username/email
- Process users (groups, licenses, proxies)
- Real-time PowerShell output
- Success/error notifications

### 3. **Jira Updater Page**
- Configure Jira credentials
- Find tickets not updated in 48 hours
- Bulk update tickets
- Add comments, change status, or update assignees

### 4. **Settings Page**
- Active Directory configuration
- Microsoft 365 settings
- Application preferences
- About information

---

## 🔧 Key Files

| File | Purpose |
|------|---------|
| `START_APP.bat` | Launch app in development mode |
| `BUILD_INSTALLER.bat` | Build Windows installer |
| `package.json` | Dependencies and scripts |
| `src/main/main.ts` | Electron main process |
| `src/renderer/App.tsx` | Main React app |
| `src/renderer/pages/` | All page components |
| `ADhelper_fixed.ps1` | Your PowerShell backend |

---

## 📚 Documentation

- **APP_SUMMARY.md** - Complete implementation overview
- **GETTING_STARTED.md** - Detailed setup instructions
- **DEPLOYMENT_CHECKLIST.md** - Pre-deployment checklist
- **README_APP.md** - Full application documentation

---

## 🎯 Next Steps

1. **Test the app**: `npm run dev`
2. **Customize settings**: Update AD domain, Jira credentials
3. **Replace icon**: Add your custom icon to `public/icon.ico`
4. **Build installer**: `npm run build:win`
5. **Deploy**: Share the installer with your team

---

## 💡 Tips

- **Dark Mode**: Click the sun/moon icon in the top-right
- **Navigation**: Use the sidebar to switch between pages
- **Real-time Updates**: Watch PowerShell output in real-time
- **Error Handling**: All errors are displayed with helpful messages

---

## 🐛 Troubleshooting

**App won't start?**
- Run `npm install` first
- Check that Node.js 18+ is installed

**PowerShell errors?**
- Ensure AD PowerShell module is installed
- Run PowerShell as Administrator

**Build errors?**
- Delete `node_modules` and `dist` folders
- Run `npm install` again

---

## 🎉 You're All Set!

Your ADHelper is now a modern desktop application with:
- ✨ Beautiful UI
- 🚀 Fast performance
- 🔒 Secure architecture
- 📦 Easy deployment

**Enjoy your new app!** 🎊

