import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { spawn } from 'child_process';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, '../../public/icon.ico'),
    title: 'ADHelper - Active Directory & Jira Manager',
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    // Try to load from Vite dev server - try multiple ports
    const tryPorts = async () => {
      const ports = [5173, 5174, 5175, 5176, 5177, 5178, 5179, 5180];
      for (const port of ports) {
        try {
          await mainWindow?.loadURL(`http://localhost:${port}`);
          console.log(`Successfully loaded from port ${port}`);
          mainWindow?.webContents.openDevTools();
          return;
        } catch (err) {
          console.log(`Port ${port} failed, trying next...`);
        }
      }
      console.error('Could not connect to Vite dev server on any port');
    };
    tryPorts();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers for PowerShell execution
ipcMain.handle('execute-powershell', async (event, script: string, args: string[] = []) => {
  return new Promise((resolve, reject) => {
    const ps = spawn('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-Command', script,
      ...args
    ]);

    let stdout = '';
    let stderr = '';

    ps.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    ps.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ps.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output: stdout });
      } else {
        reject({ success: false, error: stderr || stdout });
      }
    });

    ps.on('error', (error) => {
      reject({ success: false, error: error.message });
    });
  });
});

// IPC Handler for running the main ADHelper script
ipcMain.handle('run-adhelper-script', async (event, username: string, operation: string) => {
  const scriptPath = path.join(app.getAppPath(), 'ADhelper_fixed.ps1');
  
  return new Promise((resolve, reject) => {
    const ps = spawn('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-File', scriptPath,
      '-Username', username,
      '-Operation', operation
    ]);

    let stdout = '';
    let stderr = '';

    ps.stdout.on('data', (data) => {
      stdout += data.toString();
      // Send progress updates to renderer
      event.sender.send('adhelper-progress', data.toString());
    });

    ps.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ps.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output: stdout });
      } else {
        reject({ success: false, error: stderr || stdout });
      }
    });

    ps.on('error', (error) => {
      reject({ success: false, error: error.message });
    });
  });
});

