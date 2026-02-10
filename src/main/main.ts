import { app, BrowserWindow, ipcMain, session } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { spawn } from 'child_process';
import logger from './logger';
import { rateLimited } from './rateLimiter';
import config from './config';

// ── Secure PowerShell Execution Helper ───────────────────────────────────────
// All PowerShell execution MUST go through this helper to prevent command injection.
// It uses -File (never -Command with user input) and passes arguments safely.

interface PSExecutionOptions {
  /** Absolute path to the .ps1 script to execute */
  scriptPath: string;
  /** Simple key-value arguments passed as -Key Value pairs to the script */
  args?: Record<string, string>;
  /** Complex parameters written to a JSON temp file; the path is passed as -ParamsFile */
  paramsFile?: Record<string, unknown>;
  /** IPC channel name for streaming progress to the renderer */
  progressChannel?: string;
  /** WebContents to send progress events to */
  sender?: Electron.WebContents;
  /** Timeout in milliseconds (0 = no timeout) */
  timeoutMs?: number;
}

interface PSExecutionResult {
  success: boolean;
  output?: string;
  result?: unknown;
  error?: string;
}

function executePowerShellScript(options: PSExecutionOptions): Promise<PSExecutionResult> {
  return new Promise((resolve, reject) => {
    const spawnArgs: string[] = [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-File', options.scriptPath,
    ];

    let tempFilePath: string | null = null;

    // If complex params are provided, write them to a JSON temp file
    if (options.paramsFile) {
      tempFilePath = path.join(os.tmpdir(), `adhelper-params-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
      fs.writeFileSync(tempFilePath, JSON.stringify(options.paramsFile), 'utf8');
      spawnArgs.push('-ParamsFile', tempFilePath);
    }

    // Add simple key-value arguments
    if (options.args) {
      for (const [key, value] of Object.entries(options.args)) {
        spawnArgs.push(`-${key}`, value);
      }
    }

    const ps = spawn('powershell.exe', spawnArgs);

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

    if (options.timeoutMs && options.timeoutMs > 0) {
      timeoutHandle = setTimeout(() => {
        timedOut = true;
        ps.kill();
        // Clean up temp file on timeout
        if (tempFilePath && fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
        resolve({
          success: false,
          error: 'PowerShell script execution timed out',
        });
      }, options.timeoutMs);
    }

    ps.stdout.on('data', (data: Buffer) => {
      const output = data.toString();
      stdout += output;
      if (options.progressChannel && options.sender) {
        options.sender.send(options.progressChannel, output);
      }
    });

    ps.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    ps.on('close', (code: number | null) => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      if (timedOut) return;

      // Clean up temp file (PS script should have already deleted it, but be safe)
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try { fs.unlinkSync(tempFilePath); } catch { /* ignore */ }
      }

      if (code === 0 && stdout.trim()) {
        try {
          const jsonMatch = stdout.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            resolve({ success: true, result, output: stdout });
          } else {
            resolve({ success: true, output: stdout });
          }
        } catch {
          resolve({ success: true, output: stdout });
        }
      } else if (code === 0) {
        resolve({ success: true, output: stdout });
      } else {
        reject({ success: false, error: stderr || stdout || 'PowerShell script failed' });
      }
    });

    ps.on('error', (error: Error) => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try { fs.unlinkSync(tempFilePath); } catch { /* ignore */ }
      }
      reject({ success: false, error: error.message });
    });
  });
}

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

  // ── Content Security Policy ──────────────────────────────────────────────
  // Restrict script sources to prevent XSS. In dev mode we allow the Vite
  // dev server; in production only same-origin scripts are permitted.
  const cspPolicy = config.isDev
    ? "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' http://localhost:* ws://localhost:*; img-src 'self' data:"
    : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:";

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [cspPolicy],
      },
    });
  });

  // Load the app
  if (config.isDev) {
    // Try to load from Vite dev server - try multiple ports
    const tryPorts = async () => {
      for (const port of config.devServerPorts) {
        try {
          await mainWindow?.loadURL(`http://${config.devServerHost}:${port}`);
          logger.info(`Dev server connected on port ${port}`);
          mainWindow?.webContents.openDevTools();
          return;
        } catch (err) {
          logger.debug(`Port ${port} failed, trying next...`);
        }
      }
      logger.error('Could not connect to Vite dev server on any port');
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
  logger.init(config.logLevel);
  logger.info('App starting', { version: app.getVersion(), env: config.isDev ? 'development' : 'production' });

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

// NOTE: The 'execute-powershell' handler has been REMOVED.
// It allowed arbitrary PowerShell code execution via -Command, which is a
// command injection risk. It was not used by any renderer code.
// All PowerShell execution now goes through executePowerShellScript() with -File.

// IPC Handler for running the main ADHelper script
ipcMain.handle('run-adhelper-script', rateLimited('run-adhelper-script', async (event, username: string, operation: string) => {
  logger.info('IPC: run-adhelper-script', { username, operation });
  const scriptPath = path.join(app.getAppPath(), 'ADhelper.ps1');

  return executePowerShellScript({
    scriptPath,
    args: { Username: username, Operation: operation },
    progressChannel: 'adhelper-progress',
    sender: event.sender,
  });
}));

// IPC Handler for MFA Blocking Group Removal
// SECURE: Uses -File with separate -Username argument (no string interpolation)
ipcMain.handle('remove-mfa-blocking', rateLimited('remove-mfa-blocking', async (event, username: string) => {
  logger.info('IPC: remove-mfa-blocking', { username });
  const scriptPath = path.join(app.getAppPath(), 'scripts', 'Remove-MFABlocking.ps1');

  return executePowerShellScript({
    scriptPath,
    args: { Username: username },
    progressChannel: 'mfa-removal-progress',
    sender: event.sender,
  });
}));

// IPC Handler for Creating New User
// SECURE: All user input is written to a JSON temp file, never interpolated into commands.
// The PS bridge script reads the JSON file and deletes it after parsing.
ipcMain.handle('create-new-user', rateLimited('create-new-user', async (event, userInfo: any) => {
  logger.info('IPC: create-new-user', { username: userInfo.username, firstName: userInfo.firstName, lastName: userInfo.lastName });
  // Load site-specific groups if site location is selected
  let siteGroups: string[] = [];
  if (userInfo.siteLocation) {
    try {
      const configPath = path.join(app.getPath('userData'), 'site-config.json');
      if (fs.existsSync(configPath)) {
        const data = fs.readFileSync(configPath, 'utf8');
        const sites = JSON.parse(data);
        const selectedSite = sites.find((s: any) => s.id === userInfo.siteLocation);
        if (selectedSite) {
          siteGroups = selectedSite.groups;
          logger.info('Loaded site-specific groups', { count: siteGroups.length, site: selectedSite.name });
        }
      }
    } catch (error) {
      logger.error('Failed to load site groups', { error: String(error) });
    }
  }

  // Extract job profile groups from userInfo
  let jobProfileGroups: string[] = [];
  if (userInfo.jobProfileGroups && Array.isArray(userInfo.jobProfileGroups)) {
    jobProfileGroups = userInfo.jobProfileGroups;
    logger.info('Loaded job profile groups', { count: jobProfileGroups.length });
  }

  const scriptPath = path.join(app.getAppPath(), 'scripts', 'Create-NewUser.ps1');

  // Build the parameters object — all user input goes into this JSON,
  // never into a PowerShell command string
  const userParams: Record<string, unknown> = {
    firstName: userInfo.firstName,
    lastName: userInfo.lastName,
    username: userInfo.username,
    email: userInfo.email,
    ou: userInfo.ou,
    title: userInfo.title || '',
    department: userInfo.department || '',
    manager: userInfo.manager || '',
    managerEmail: userInfo.managerEmail || '',
    siteGroups,
    jobProfileGroups,
  };

  return executePowerShellScript({
    scriptPath,
    paramsFile: userParams,
    progressChannel: 'user-creation-progress',
    sender: event.sender,
  });
}));

// IPC Handler for Contractor Account Extension Processing
// SECURE: All user input is written to a JSON temp file, never interpolated into commands.
ipcMain.handle('process-contractor-account', rateLimited('process-contractor-account', async (event, usernames: string[]) => {
  logger.info('IPC: process-contractor-account', { count: usernames.length });

  const scriptPath = path.join(app.getAppPath(), 'scripts', 'Process-ContractorAccount.ps1');

  return executePowerShellScript({
    scriptPath,
    paramsFile: { usernames },
    progressChannel: 'contractor-processing-progress',
    sender: event.sender,
  });
}));

// IPC Handlers for Windows Credential Manager (already safe — using -File with args)
ipcMain.handle('save-credential', async (_event, target: string, username: string, password: string) => {
  const scriptPath = path.join(app.getAppPath(), 'scripts', 'CredentialManager.ps1');
  return executePowerShellScript({
    scriptPath,
    args: { Action: 'Save', Target: target, Username: username, Password: password },
  });
});

ipcMain.handle('get-credential', async (_event, target: string) => {
  const scriptPath = path.join(app.getAppPath(), 'scripts', 'CredentialManager.ps1');
  try {
    return await executePowerShellScript({
      scriptPath,
      args: { Action: 'Get', Target: target },
    });
  } catch {
    // Return null if credential not found (not an error)
    return { success: true, username: null, password: null };
  }
});

// IPC Handlers for Site Configuration Management
ipcMain.handle('save-site-config', async (_event, siteConfig: any) => {
  try {
    const configPath = path.join(app.getPath('userData'), 'site-config.json');
    let sites: any[] = [];

    // Load existing sites
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      sites = JSON.parse(data);
    }

    // Update or add site
    const existingIndex = sites.findIndex(s => s.id === siteConfig.id);
    if (existingIndex >= 0) {
      sites[existingIndex] = siteConfig;
    } else {
      sites.push(siteConfig);
    }

    // Save to file
    fs.writeFileSync(configPath, JSON.stringify(sites, null, 2), 'utf8');

    return { success: true, message: 'Site configuration saved successfully' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-site-configs', async (_event) => {
  try {
    const configPath = path.join(app.getPath('userData'), 'site-config.json');

    if (!fs.existsSync(configPath)) {
      return { success: true, sites: [] };
    }

    const data = fs.readFileSync(configPath, 'utf8');
    const sites = JSON.parse(data);

    return { success: true, sites };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-site-config', async (_event, siteId: string) => {
  try {
    const configPath = path.join(app.getPath('userData'), 'site-config.json');

    if (!fs.existsSync(configPath)) {
      return { success: true, message: 'No sites to delete' };
    }

    const data = fs.readFileSync(configPath, 'utf8');
    let sites = JSON.parse(data);

    // Remove site
    sites = sites.filter((s: any) => s.id !== siteId);

    // Save updated list
    fs.writeFileSync(configPath, JSON.stringify(sites, null, 2), 'utf8');

    return { success: true, message: 'Site configuration deleted successfully' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// IPC Handler for AD Connection Test
// SECURE: Uses -File to call Test-ADConnection.ps1 which uses lightweight .NET
// DirectoryServices calls (not the heavy AD PowerShell module) for fast checks.
ipcMain.handle('test-ad-connection', async (_event) => {
  logger.debug('IPC: test-ad-connection');
  const scriptPath = path.join(app.getAppPath(), 'scripts', 'Test-ADConnection.ps1');

  try {
    const psResult = await executePowerShellScript({
      scriptPath,
      timeoutMs: config.adConnectionTimeoutMs,
    });

    // Parse the AD connection result
    if (psResult.result && typeof psResult.result === 'object') {
      const result = psResult.result as Record<string, unknown>;
      return {
        success: true,
        connected: result.Connected,
        domain: result.Domain,
        domainController: result.DomainController,
        responseTime: result.ResponseTime,
        error: result.Error,
        timestamp: result.Timestamp,
      };
    }

    return {
      success: false,
      connected: false,
      error: 'Failed to parse AD connection test result',
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    const errorMsg = error?.error || error?.message || 'AD connection test failed';
    return {
      success: false,
      connected: false,
      error: errorMsg.includes('timed out')
        ? 'Connection test timed out - Please check VPN connection'
        : errorMsg,
      timestamp: new Date().toISOString(),
    };
  }
});

// IPC Handler for Job Profile Management
ipcMain.handle('save-job-profiles', async (_event, siteId: string, jobProfiles: any[]) => {
  try {
    const configPath = path.join(app.getPath('userData'), 'job-profiles.json');

    let allProfiles: any = {};

    // Load existing profiles
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      allProfiles = JSON.parse(data);
    }

    // Update profiles for this site
    allProfiles[siteId] = jobProfiles;

    // Save updated profiles
    fs.writeFileSync(configPath, JSON.stringify(allProfiles, null, 2), 'utf8');

    return { success: true, message: 'Job profiles saved successfully' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-job-profiles', async (_event, siteId: string) => {
  try {
    const configPath = path.join(app.getPath('userData'), 'job-profiles.json');

    if (!fs.existsSync(configPath)) {
      return { success: true, jobProfiles: [] };
    }

    const data = fs.readFileSync(configPath, 'utf8');
    const allProfiles = JSON.parse(data);

    const jobProfiles = allProfiles[siteId] || [];

    return { success: true, jobProfiles };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-credential', async (_event, target: string) => {
  const scriptPath = path.join(app.getAppPath(), 'scripts', 'CredentialManager.ps1');
  return executePowerShellScript({
    scriptPath,
    args: { Action: 'Delete', Target: target },
  });
});

