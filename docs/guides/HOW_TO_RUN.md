# How to Run ADHelper App

**Version:** 1.0.0
**Last Updated:** 2026-02-09
**Status:** Current
**Related Docs:** [README.md](../README.md)

## ✅ The App is Now Working!

### Quick Start - Browser Mode (Recommended for Testing)

**Start the development server:**
```bash
npm run dev:vite
```

**Then open in your browser:**
```
http://127.0.0.1:5173
```
(Or whatever port Vite shows in the terminal)

### Desktop Mode (Electron)

**Start both Vite and Electron:**
```bash
npm run dev
```

This will:
1. Start Vite dev server
2. Launch Electron desktop window after 3 seconds

### What You'll See

**Browser Mode:**
- ✅ Full Material-UI interface with dark/light mode
- ✅ Sidebar navigation (Dashboard, AD Helper, Jira Updater, Settings)
- ✅ Jira Updater works fully (REST API)
- ⚠️ AD Helper shows warning (PowerShell requires desktop mode)

**Desktop Mode (Electron):**
- ✅ Everything from browser mode
- ✅ PowerShell integration for AD operations
- ✅ Desktop window with DevTools
- ✅ No limitations

### If the Window Doesn't Appear

1. **Check your taskbar** - the window might be minimized or behind other windows
2. **Wait 5-10 seconds** - it takes a moment to start
3. **Look for errors** in the console window
4. **Try again** - Press Ctrl+C to stop, then run `npm run dev` again

### Using the App

#### Dashboard
- View statistics and recent activity
- Quick access to AD Helper and Jira Updater

#### AD Helper
1. Enter a username or email
2. Click "Search & Process User"
3. Watch real-time progress updates
4. See success/error messages

#### Jira Updater
1. Go to Settings first
2. Enter your Jira URL, email, and API token
3. Return to Jira Updater page
4. Click "Find Stale Tickets"
5. Select update action and click "Update Tickets"

#### Settings
- Configure Active Directory domain
- Set Microsoft 365 tenant ID
- Toggle application preferences
- View app version info

### Stopping the App

**Option 1:** Close the Electron window (X button)
**Option 2:** Press `Ctrl+C` in the console window

### Common Issues

**Port already in use:**
- The app will automatically try ports 5173, 5174, 5175, etc.
- This is normal and not an error

**Cache errors:**
- GPU cache errors are warnings only
- They don't affect functionality
- Safe to ignore

**Autofill errors:**
- DevTools warnings only
- Safe to ignore

### Development Features

- **Hot Reload**: Edit React files and see changes instantly
- **DevTools**: Press F12 or Ctrl+Shift+I to open Chrome DevTools
- **Console Logs**: Check the terminal for backend logs

### Next Steps

1. **Test AD Helper** with a test user
2. **Configure Jira** credentials in Settings
3. **Customize** the PowerShell script if needed
4. **Build installer** when ready: `npm run build:win`

### Building for Production

When you're ready to create an installer:

```bash
npm run build:win
```

This creates a Windows installer in the `release/` folder.

---

## 🎉 Enjoy Your New App!

You now have a modern, professional desktop application for AD and Jira management!

**Need help?** Check these files:
- `QUICK_START.md` - Quick reference
- `GETTING_STARTED.md` - Detailed guide
- `APP_SUMMARY.md` - Complete overview
- `DEPLOYMENT_CHECKLIST.md` - Pre-deployment steps

