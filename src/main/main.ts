import { app, BrowserWindow, ipcMain, session, Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { spawn } from 'child_process';
import logger from './logger';
import auditLogger from './auditLogger';
import roleManager from './roleManager';
import { rateLimited } from './rateLimiter';
import config from './config';
import { registerJiraHandlers, startSiteTicketPoller, stopSiteTicketPoller } from './jiraHandler';

// ── Input Validation Constants ──────────────────────────────────────────────
/** Permitted operations that may be passed to the ADHelper script via IPC */
const ALLOWED_OPERATIONS = new Set(['process', 'groups', 'proxies']);

/** Permitted modes for bulk user processing */
const ALLOWED_BULK_MODES = new Set(['groups', 'proxies', 'both']);

/** sAMAccountName or UPN — matches renderer's isValidUsernameOrEmail pattern */
const USERNAME_REGEX = /^[a-zA-Z0-9._%+-]+(@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})?$/;

/**
 * Credential username — broader than USERNAME_REGEX to support compound formats
 * such as "url|email" used by the Jira credential store entry.
 * Still rejects shell metacharacters (`$`, `` ` ``, `"`, `'`, `\n`, etc.).
 */
const CREDENTIAL_USERNAME_REGEX = /^[a-zA-Z0-9._%+\-@:/|\\]{1,512}$/;

/** Site/profile IDs — alphanumeric plus hyphens and underscores, max 64 chars */
const SITE_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

/** Credential target names — safe characters, no shell metacharacters, max 256 chars */
const CREDENTIAL_TARGET_REGEX = /^[a-zA-Z0-9._/\\:@-]{1,256}$/;

// ── Resource Path Resolution ────────────────────────────────────────────────
// In development, resources (scripts, icons) live at the project root.
// In production (packaged), they are copied to the resources/ directory
// via electron-builder's extraResources config.
function getResourcePath(...segments: string[]): string {
  const basePath = app.isPackaged ? process.resourcesPath : app.getAppPath();
  return path.join(basePath, ...segments);
}

// ── Secure PowerShell Execution Helper ───────────────────────────────────────
// All PowerShell execution MUST go through this helper to prevent command injection.
// It uses -File (never -Command with user input) and passes arguments safely.

// ── IPC Payload Interfaces ──────────────────────────────────────────────────

/** Site location configuration stored in site-config.json */
interface SiteConfig {
  id: string;
  name: string;
  groups: string[];
  /** Optional Jira project key used for site-based ticket filtering (e.g. "ORL", "PHX") */
  jiraProjectKey?: string;
}

/** A single group entry within a job profile */
interface JobProfileGroup {
  name: string;
  distinguishedName: string;
}

/** A job profile category with associated AD groups */
interface JobProfile {
  category: string;
  groups: JobProfileGroup[];
}

/** Payload sent from the renderer when creating a new AD user */
interface NewUserInfo {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  ou: string;
  title?: string;
  department?: string;
  manager?: string;
  managerEmail?: string;
  siteLocation?: string;
  /** Distinguished names of groups from the selected job profile */
  jobProfileGroups?: string[];
}

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
  /** Max retries on transient failure (default: config.maxPSRetries) */
  maxRetries?: number;
}

interface PSExecutionResult {
  success: boolean;
  output?: string;
  result?: unknown;
  error?: string;
}

async function executePowerShellScript(options: PSExecutionOptions): Promise<PSExecutionResult> {
  const maxRetries = options.maxRetries ?? config.maxPSRetries;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await executePowerShellScriptOnce(options);
    } catch (err: any) {
      const isLast = attempt === maxRetries;
      if (isLast) throw err;

      const delay = config.baseRetryDelayMs * Math.pow(2, attempt);
      logger.warn('PS script failed, retrying', {
        script: path.basename(options.scriptPath),
        attempt: attempt + 1,
        maxRetries,
        delayMs: delay,
        error: err?.error || err?.message || String(err),
      });
      await new Promise(r => setTimeout(r, delay));
    }
  }
  // Unreachable — satisfies TS return type
  throw new Error('Retry loop exited unexpectedly');
}

function executePowerShellScriptOnce(options: PSExecutionOptions): Promise<PSExecutionResult> {
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

      logger.debug('PS script closed', {
        script: path.basename(options.scriptPath),
        code,
        stdoutLen: stdout.length,
        stderrLen: stderr.length,
        stderrPreview: stderr.slice(0, 500) || undefined,
      });

      if (code === 0 && stdout.trim()) {
        try {
          const jsonMatch = stdout.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            logger.debug('PS script result (JSON)', { script: path.basename(options.scriptPath), result });
            resolve({ success: true, result, output: stdout });
          } else {
            logger.debug('PS script result (no JSON)', { script: path.basename(options.scriptPath), outputPreview: stdout.slice(0, 300) });
            resolve({ success: true, output: stdout });
          }
        } catch {
          logger.warn('PS script JSON parse failed', { script: path.basename(options.scriptPath), outputPreview: stdout.slice(0, 300) });
          resolve({ success: true, output: stdout });
        }
      } else if (code === 0) {
        resolve({ success: true, output: stdout });
      } else {
        logger.error('PS script failed', { script: path.basename(options.scriptPath), code, stderr: stderr.slice(0, 500), stdout: stdout.slice(0, 500) });
        reject({ success: false, error: stderr || stdout || 'PowerShell script failed' });
      }
    });

    ps.on('error', (error: Error) => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try { fs.unlinkSync(tempFilePath); } catch { /* ignore */ }
      }
      logger.error('PS script spawn error', { script: path.basename(options.scriptPath), error: error.message });
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
    icon: getResourcePath('public', 'icon.ico'),
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

let tray: Tray | null = null;

function createTray() {
  const trayIconPath = getResourcePath('public', 'tray-icon.png');
  const icon = nativeImage.createFromPath(trayIconPath);
  tray = new Tray(icon);
  tray.setToolTip('ADHelper - Rehrig IT Tools');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show ADHelper',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(() => {
  logger.init(config.logLevel);
  auditLogger.init();
  roleManager.init();
  registerJiraHandlers(async (target: string) => {
    const scriptPath = getResourcePath('scripts', 'CredentialManager.ps1');
    try {
      return await executePowerShellScript({
        scriptPath,
        args: { Action: 'Get', Target: target },
      });
    } catch {
      return { success: false, error: 'Credential not found' };
    }
  });
  logger.info('App starting', { version: app.getVersion(), env: config.isDev ? 'development' : 'production' });

  createWindow();
  createTray();

  // Start background polling for site tickets (OS notifications on new arrivals)
  startSiteTicketPoller(async (target: string) => {
    const scriptPath = getResourcePath('scripts', 'CredentialManager.ps1');
    try {
      return await executePowerShellScript({
        scriptPath,
        args: { Action: 'Get', Target: target },
      });
    } catch {
      return { success: false, error: 'Credential not found' };
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  stopSiteTicketPoller();
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
  // Validate operation against the allowlist to prevent injection of arbitrary PS operations
  if (!ALLOWED_OPERATIONS.has(operation)) {
    logger.warn('IPC: run-adhelper-script — rejected invalid operation', { operation });
    return { success: false, error: `Invalid operation: "${operation}"` };
  }

  // Validate username format (sAMAccountName or UPN)
  if (!USERNAME_REGEX.test(username)) {
    logger.warn('IPC: run-adhelper-script — rejected invalid username', { username });
    return { success: false, error: 'Invalid username format' };
  }

  // RBAC check
  if (!roleManager.hasPermission('run-adhelper-script')) {
    logger.warn('IPC: run-adhelper-script — permission denied', { username, operation });
    return { success: false, error: 'Permission denied.' };
  }

  logger.info('IPC: run-adhelper-script', { username, operation });
  const scriptPath = getResourcePath('ADhelper.ps1');

  auditLogger.logStart('run-adhelper-script', username, { operation });

  try {
    const result = await executePowerShellScript({
      scriptPath,
      args: { Username: username, Operation: operation },
      progressChannel: 'adhelper-progress',
      sender: event.sender,
    });
    auditLogger.logSuccess('run-adhelper-script', username, { operation });
    return result;
  } catch (err: any) {
    auditLogger.logFailure('run-adhelper-script', username, err.error || err.message || String(err));
    throw err;
  }
}));

// IPC Handler for MFA Blocking Group Removal
// SECURE: Uses -File with separate -Username argument (no string interpolation)
ipcMain.handle('remove-mfa-blocking', rateLimited('remove-mfa-blocking', async (event, username: string) => {
  // Strip @domain.com if user entered email — Get-ADUser -Identity needs sAMAccountName, not UPN
  let samAccountName = username;
  if (username.includes('@')) {
    samAccountName = username.split('@')[0];
    logger.info('IPC: remove-mfa-blocking — stripped email to sAMAccountName', { original: username, samAccountName });
  }
  logger.info('IPC: remove-mfa-blocking', { username: samAccountName });

  const scriptPath = getResourcePath('scripts', 'Remove-MFABlocking.ps1');

  auditLogger.logStart('remove-mfa-blocking', samAccountName);

  try {
    const result = await executePowerShellScript({
      scriptPath,
      args: { Username: samAccountName },
      progressChannel: 'mfa-removal-progress',
      sender: event.sender,
      timeoutMs: 30000, // 30-second timeout to prevent hangs
    });
    logger.info('IPC: remove-mfa-blocking completed', { success: result.success, result: result.result });
    auditLogger.logSuccess('remove-mfa-blocking', samAccountName, { result: result.result });
    return result;
  } catch (err: any) {
    logger.error('IPC: remove-mfa-blocking failed', { error: err.error || err.message || String(err) });
    auditLogger.logFailure('remove-mfa-blocking', samAccountName, err.error || err.message || String(err));
    throw err;
  }
}));

// IPC Handler for Creating New User
// SECURE: All user input is written to a JSON temp file, never interpolated into commands.
// The PS bridge script reads the JSON file and deletes it after parsing.
ipcMain.handle('create-new-user', rateLimited('create-new-user', async (event, userInfo: NewUserInfo) => {
  if (!roleManager.hasPermission('create-new-user')) {
    return { success: false, error: 'Permission denied. Admin role required to create new users.' };
  }
  logger.info('IPC: create-new-user', { username: userInfo.username, firstName: userInfo.firstName, lastName: userInfo.lastName });
  auditLogger.logStart('create-new-user', userInfo.username, { firstName: userInfo.firstName, lastName: userInfo.lastName, email: userInfo.email });
  // Load site-specific groups if site location is selected
  let siteGroups: string[] = [];
  if (userInfo.siteLocation) {
    try {
      const configPath = path.join(app.getPath('userData'), 'site-config.json');
      if (fs.existsSync(configPath)) {
        const data = fs.readFileSync(configPath, 'utf8');
        const sites = JSON.parse(data);
        const selectedSite = (sites as SiteConfig[]).find(s => s.id === userInfo.siteLocation);
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

  const scriptPath = getResourcePath('scripts', 'Create-NewUser.ps1');

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

  try {
    const result = await executePowerShellScript({
      scriptPath,
      paramsFile: userParams,
      progressChannel: 'user-creation-progress',
      sender: event.sender,
    });
    auditLogger.logSuccess('create-new-user', userInfo.username, { firstName: userInfo.firstName, lastName: userInfo.lastName });
    return result;
  } catch (err: any) {
    auditLogger.logFailure('create-new-user', userInfo.username, err.error || err.message || String(err));
    throw err;
  }
}));

// IPC Handler for Contractor Account Extension Processing
// SECURE: All user input is written to a JSON temp file, never interpolated into commands.
ipcMain.handle('process-contractor-account', rateLimited('process-contractor-account', async (event, usernames: string[]) => {
  if (!roleManager.hasPermission('process-contractor-account')) {
    return { success: false, error: 'Permission denied. Admin role required to process contractor accounts.' };
  }
  logger.info('IPC: process-contractor-account', { count: usernames.length });
  auditLogger.logStart('process-contractor-account', usernames.join(', '), { count: usernames.length });

  const scriptPath = getResourcePath('scripts', 'Process-ContractorAccount.ps1');

  try {
    const result = await executePowerShellScript({
      scriptPath,
      paramsFile: { usernames },
      progressChannel: 'contractor-processing-progress',
      sender: event.sender,
    });
    auditLogger.logSuccess('process-contractor-account', usernames.join(', '), { count: usernames.length });
    return result;
  } catch (err: any) {
    auditLogger.logFailure('process-contractor-account', usernames.join(', '), err.error || err.message || String(err));
    throw err;
  }
}));

// IPC Handler for Bulk User Processing (groups + proxy addresses)
// SECURE: All user input is written to a JSON temp file, never interpolated into commands.
ipcMain.handle('process-bulk-users', rateLimited('process-bulk-users', async (event, usernames: string[], mode: string) => {
  if (!roleManager.hasPermission('process-bulk-users')) {
    return { success: false, error: 'Permission denied. Admin role required for bulk user processing.' };
  }
  if (!ALLOWED_BULK_MODES.has(mode)) {
    logger.warn('IPC: process-bulk-users — rejected invalid mode', { mode });
    return { success: false, error: `Invalid mode: "${mode}". Must be one of: groups, proxies, both.` };
  }
  logger.info('IPC: process-bulk-users', { count: usernames.length, mode });
  auditLogger.logStart('process-bulk-users', usernames.join(', '), { count: usernames.length, mode });

  const scriptPath = getResourcePath('scripts', 'Process-BulkUsers.ps1');

  try {
    const result = await executePowerShellScript({
      scriptPath,
      paramsFile: { usernames, mode },
      progressChannel: 'bulk-processing-progress',
      sender: event.sender,
    });
    auditLogger.logSuccess('process-bulk-users', usernames.join(', '), { count: usernames.length, mode });
    return result;
  } catch (err: any) {
    auditLogger.logFailure('process-bulk-users', usernames.join(', '), err.error || err.message || String(err));
    throw err;
  }
}));

// IPC Handler for AD Display Name Update
// SECURE: All user input is written to a JSON temp file, never interpolated into commands.
ipcMain.handle('update-display-name', rateLimited('update-display-name', async (event, samAccountName: string, newDisplayName: string) => {
  if (!roleManager.hasPermission('update-display-name')) {
    return { success: false, error: 'Permission denied. Admin role required to update display names.' };
  }

  // Validate sAMAccountName format
  if (!USERNAME_REGEX.test(samAccountName)) {
    logger.warn('IPC: update-display-name — rejected invalid samAccountName', { samAccountName });
    return { success: false, error: 'Invalid sAMAccountName format' };
  }

  // Validate newDisplayName — non-empty, printable chars only, max 256 chars
  const DISPLAY_NAME_REGEX = /^[\p{L}\p{M}\p{N} ,.''\-]{1,256}$/u;
  if (!DISPLAY_NAME_REGEX.test(newDisplayName.trim())) {
    logger.warn('IPC: update-display-name — rejected invalid newDisplayName');
    return { success: false, error: 'Invalid display name. Use letters, spaces, hyphens, apostrophes, and commas only.' };
  }

  logger.info('IPC: update-display-name', { samAccountName });
  auditLogger.logStart('update-display-name', samAccountName, { newDisplayName: newDisplayName.trim() });

  const scriptPath = getResourcePath('scripts', 'Update-ADDisplayName.ps1');

  try {
    const result = await executePowerShellScript({
      scriptPath,
      paramsFile: { samAccountName, newDisplayName: newDisplayName.trim() },
      progressChannel: 'display-name-update-progress',
      sender: event.sender,
    });
    auditLogger.logSuccess('update-display-name', samAccountName, { newDisplayName: newDisplayName.trim() });
    return result;
  } catch (err: any) {
    auditLogger.logFailure('update-display-name', samAccountName, err.error || err.message || String(err));
    throw err;
  }
}));

// IPC Handlers for Windows Credential Manager (already safe — using -File with args)
ipcMain.handle('save-credential', rateLimited('save-credential', async (_event, target: string, username: string, password: string) => {
  // Validate target name (safe characters, no shell metacharacters)
  if (!CREDENTIAL_TARGET_REGEX.test(target)) {
    logger.warn('IPC: save-credential — rejected invalid target', { target });
    return { success: false, error: 'Invalid credential target name' };
  }
  // Validate username (sAMAccountName, UPN, or composite "url|email" for Jira)
  if (!CREDENTIAL_USERNAME_REGEX.test(username)) {
    logger.warn('IPC: save-credential — rejected invalid username', { username });
    return { success: false, error: 'Invalid username format' };
  }
  // Validate password is non-empty and within a safe length limit
  if (!password || password.length > 1024) {
    logger.warn('IPC: save-credential — rejected invalid password length');
    return { success: false, error: 'Invalid password: must be non-empty and under 1024 characters' };
  }
  auditLogger.logStart('save-credential', target, { username });
  const scriptPath = getResourcePath('scripts', 'CredentialManager.ps1');
  try {
    const result = await executePowerShellScript({
      scriptPath,
      args: { Action: 'Save', Target: target, Username: username, Password: password },
    });
    auditLogger.logSuccess('save-credential', target, { username });
    return result;
  } catch (err: any) {
    auditLogger.logFailure('save-credential', target, err.error || err.message || String(err));
    throw err;
  }
}));

ipcMain.handle('get-credential', rateLimited('get-credential', async (_event, target: string) => {
  if (!CREDENTIAL_TARGET_REGEX.test(target)) {
    logger.warn('IPC: get-credential — rejected invalid target', { target });
    return { success: false, error: 'Invalid credential target name' };
  }
  const scriptPath = getResourcePath('scripts', 'CredentialManager.ps1');
  try {
    return await executePowerShellScript({
      scriptPath,
      args: { Action: 'Get', Target: target },
    });
  } catch {
    // Return null if credential not found (not an error)
    return { success: true, username: null, password: null };
  }
}));

// IPC Handlers for Site Configuration Management
ipcMain.handle('save-site-config', rateLimited('save-site-config', async (_event, siteConfig: SiteConfig) => {
  if (!SITE_ID_REGEX.test(siteConfig.id)) {
    logger.warn('IPC: save-site-config — rejected invalid site id', { id: siteConfig.id });
    return { success: false, error: 'Invalid site ID' };
  }
  auditLogger.logStart('save-site-config', siteConfig.id || 'unknown');
  try {
    const configPath = path.join(app.getPath('userData'), 'site-config.json');
    let sites: SiteConfig[] = [];

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

    auditLogger.logSuccess('save-site-config', siteConfig.id || 'unknown');
    return { success: true, message: 'Site configuration saved successfully' };
  } catch (error: any) {
    auditLogger.logFailure('save-site-config', siteConfig.id || 'unknown', error.message);
    return { success: false, error: error.message };
  }
}));

ipcMain.handle('get-site-configs', rateLimited('get-site-configs', async (_event) => {
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
}));

ipcMain.handle('delete-site-config', rateLimited('delete-site-config', async (_event, siteId: string) => {
  if (!SITE_ID_REGEX.test(siteId)) {
    logger.warn('IPC: delete-site-config — rejected invalid siteId', { siteId });
    return { success: false, error: 'Invalid site ID' };
  }
  auditLogger.logStart('delete-site-config', siteId);
  try {
    const configPath = path.join(app.getPath('userData'), 'site-config.json');

    if (!fs.existsSync(configPath)) {
      auditLogger.logSuccess('delete-site-config', siteId, { note: 'no config file' });
      return { success: true, message: 'No sites to delete' };
    }

    const data = fs.readFileSync(configPath, 'utf8');
    let sites = JSON.parse(data);

    // Remove site
    sites = sites.filter((s: SiteConfig) => s.id !== siteId);

    // Save updated list
    fs.writeFileSync(configPath, JSON.stringify(sites, null, 2), 'utf8');

    auditLogger.logSuccess('delete-site-config', siteId);
    return { success: true, message: 'Site configuration deleted successfully' };
  } catch (error: any) {
    auditLogger.logFailure('delete-site-config', siteId, error.message);
    return { success: false, error: error.message };
  }
}));

// IPC Handlers for Responsible Sites (Jira site-ownership tracking)
ipcMain.handle('get-responsible-sites', rateLimited('get-responsible-sites', async (_event) => {
  try {
    const configPath = path.join(app.getPath('userData'), 'responsible-sites.json');
    if (!fs.existsSync(configPath)) return { success: true, siteIds: [] };
    const data = fs.readFileSync(configPath, 'utf8');
    return { success: true, siteIds: JSON.parse(data) as string[] };
  } catch (error: any) {
    return { success: false, error: error.message, siteIds: [] };
  }
}));

ipcMain.handle('save-responsible-sites', rateLimited('save-responsible-sites', async (_event, siteIds: string[]) => {
  if (!Array.isArray(siteIds)) {
    return { success: false, error: 'siteIds must be an array' };
  }
  for (const id of siteIds) {
    if (!SITE_ID_REGEX.test(id)) {
      logger.warn('IPC: save-responsible-sites — rejected invalid site id', { id });
      return { success: false, error: `Invalid site ID: ${id}` };
    }
  }
  auditLogger.logStart('save-responsible-sites', 'config', { siteCount: siteIds.length });
  try {
    const configPath = path.join(app.getPath('userData'), 'responsible-sites.json');
    fs.writeFileSync(configPath, JSON.stringify(siteIds, null, 2), 'utf8');
    auditLogger.logSuccess('save-responsible-sites', 'config', { siteCount: siteIds.length });
    return { success: true, message: 'Responsible sites saved successfully' };
  } catch (error: any) {
    auditLogger.logFailure('save-responsible-sites', 'config', error.message);
    return { success: false, error: error.message };
  }
}));

// IPC Handler for AD Connection Test
// SECURE: Uses -File to call Test-ADConnection.ps1 which uses lightweight .NET
// DirectoryServices calls (not the heavy AD PowerShell module) for fast checks.
ipcMain.handle('test-ad-connection', async (_event) => {
  logger.debug('IPC: test-ad-connection');
  const scriptPath = getResourcePath('scripts', 'Test-ADConnection.ps1');

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
ipcMain.handle('save-job-profiles', rateLimited('save-job-profiles', async (_event, siteId: string, jobProfiles: JobProfile[]) => {
  if (!SITE_ID_REGEX.test(siteId)) {
    logger.warn('IPC: save-job-profiles — rejected invalid siteId', { siteId });
    return { success: false, error: 'Invalid site ID' };
  }
  auditLogger.logStart('save-job-profiles', siteId, { count: jobProfiles?.length });
  try {
    const configPath = path.join(app.getPath('userData'), 'job-profiles.json');

    let allProfiles: Record<string, JobProfile[]> = {};

    // Load existing profiles
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      allProfiles = JSON.parse(data);
    }

    // Update profiles for this site
    allProfiles[siteId] = jobProfiles;

    // Save updated profiles
    fs.writeFileSync(configPath, JSON.stringify(allProfiles, null, 2), 'utf8');

    auditLogger.logSuccess('save-job-profiles', siteId, { count: jobProfiles?.length });
    return { success: true, message: 'Job profiles saved successfully' };
  } catch (error: any) {
    auditLogger.logFailure('save-job-profiles', siteId, error.message);
    return { success: false, error: error.message };
  }
}));

ipcMain.handle('get-job-profiles', rateLimited('get-job-profiles', async (_event, siteId: string) => {
  if (!SITE_ID_REGEX.test(siteId)) {
    logger.warn('IPC: get-job-profiles — rejected invalid siteId', { siteId });
    return { success: false, error: 'Invalid site ID' };
  }
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
}));

ipcMain.handle('delete-credential', rateLimited('delete-credential', async (_event, target: string) => {
  if (!CREDENTIAL_TARGET_REGEX.test(target)) {
    logger.warn('IPC: delete-credential — rejected invalid target', { target });
    return { success: false, error: 'Invalid credential target name' };
  }
  auditLogger.logStart('delete-credential', target);
  const scriptPath = getResourcePath('scripts', 'CredentialManager.ps1');
  try {
    const result = await executePowerShellScript({
      scriptPath,
      args: { Action: 'Delete', Target: target },
    });
    auditLogger.logSuccess('delete-credential', target);
    return result;
  } catch (err: any) {
    auditLogger.logFailure('delete-credential', target, err.error || err.message || String(err));
    throw err;
  }
}));

// ── RBAC (Role-Based Access Control) IPC Handlers ──────────────────────────
ipcMain.handle('get-user-role', async () => {
  return {
    success: true,
    role: roleManager.getRole(),
    config: roleManager.getConfig(),
    adminOnlyOperations: roleManager.getAdminOnlyOperations(),
  };
});

ipcMain.handle('set-user-role', async (_event, role: string) => {
  if (!roleManager.hasPermission('set-user-role')) {
    return { success: false, error: 'Permission denied. Only admins can change roles.' };
  }
  if (role !== 'admin' && role !== 'operator') {
    return { success: false, error: 'Invalid role. Must be "admin" or "operator".' };
  }

  // Capture the current role BEFORE mutation so both logStart and logSuccess
  // accurately reflect the transition (previousRole → role).
  const previousRole = roleManager.getRole();
  auditLogger.logStart('set-user-role', role, { previousRole });

  try {
    const config = roleManager.setRole(role);
    auditLogger.logSuccess('set-user-role', role, { previousRole });
    logger.info('User role changed', { role, previousRole, configuredBy: config.configuredBy });
    return { success: true, config };
  } catch (err: any) {
    auditLogger.logFailure('set-user-role', role, err.message || String(err));
    return { success: false, error: err.message || 'Failed to set role' };
  }
});

