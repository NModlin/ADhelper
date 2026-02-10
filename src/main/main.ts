import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
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
  const scriptPath = path.join(app.getAppPath(), 'ADhelper.ps1');
  
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

// IPC Handler for MFA Blocking Group Removal
ipcMain.handle('remove-mfa-blocking', async (event, username: string) => {
  const scriptPath = path.join(app.getAppPath(), 'ADhelper.ps1');

  return new Promise((resolve, reject) => {
    // Create a PowerShell command that calls the MFA removal function
    const psCommand = `
      $ErrorActionPreference = "Continue"
      . "${scriptPath}"

      # Get stored credentials
      $credential = Get-StoredCredential -Target "ADHelper_AdminCred"
      if (-not $credential) {
        Write-Error "No stored credentials found. Please configure credentials in Settings."
        exit 1
      }

      # Remove from MFA blocking group
      $result = Remove-UserFromMFABlocking -SamAccountName "${username}" -Credential $credential

      # Output result as JSON
      $result | ConvertTo-Json -Depth 10
    `;

    const ps = spawn('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-Command', psCommand
    ]);

    let stdout = '';
    let stderr = '';

    ps.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      // Send progress updates to renderer
      event.sender.send('mfa-removal-progress', output);
    });

    ps.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ps.on('close', (code) => {
      if (code === 0 && stdout.trim()) {
        try {
          const result = JSON.parse(stdout.trim());
          resolve({ success: true, result });
        } catch (e) {
          resolve({ success: true, output: stdout });
        }
      } else {
        reject({ success: false, error: stderr || stdout || 'MFA removal failed' });
      }
    });

    ps.on('error', (error) => {
      reject({ success: false, error: error.message });
    });
  });
});

// IPC Handler for Creating New User
ipcMain.handle('create-new-user', async (event, userInfo: any) => {
  const scriptPath = path.join(app.getAppPath(), 'ADhelper.ps1');
  const emailScriptPath = path.join(app.getAppPath(), 'scripts', 'Send-NewUserEmail.ps1');

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
          console.log(`Loading ${siteGroups.length} site-specific groups for ${selectedSite.name}`);
        }
      }
    } catch (error) {
      console.error('Failed to load site groups:', error);
    }
  }

  // Extract job profile groups from userInfo
  let jobProfileGroups: string[] = [];
  if (userInfo.jobProfileGroups && Array.isArray(userInfo.jobProfileGroups)) {
    jobProfileGroups = userInfo.jobProfileGroups;
    console.log(`Loading ${jobProfileGroups.length} job profile groups`);
  }

  return new Promise((resolve, reject) => {
    // Create a PowerShell command that calls the user creation function
    const psCommand = `
      $ErrorActionPreference = "Continue"
      . "${scriptPath}"
      . "${emailScriptPath}"

      # Get stored credentials
      $credential = Get-StoredCredential -Target "ADHelper_AdminCred"
      if (-not $credential) {
        Write-Error "No stored credentials found. Please configure credentials in Settings."
        exit 1
      }

      # Prepare user info
      $userParams = @{
        FirstName = "${userInfo.firstName}"
        LastName = "${userInfo.lastName}"
        SamAccountName = "${userInfo.username}"
        UserPrincipalName = "${userInfo.email}"
        Path = "${userInfo.ou}"
      }

      ${userInfo.title ? `$userParams.Title = "${userInfo.title}"` : ''}
      ${userInfo.department ? `$userParams.Department = "${userInfo.department}"` : ''}
      ${userInfo.manager ? `$userParams.Manager = "${userInfo.manager}"` : ''}

      # Site-specific groups
      $siteGroups = @(${siteGroups.map(g => `"${g.replace(/"/g, '`"')}"`).join(', ')})

      # Job profile groups
      $jobProfileGroups = @(${jobProfileGroups.map(g => `"${g.replace(/"/g, '`"')}"`).join(', ')})

      # Create user
      try {
        # Generate secure password
        $passwordLength = 12
        $allowedChars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*"
        $password = -join ((1..$passwordLength) | ForEach-Object { Get-Random -InputObject $allowedChars.ToCharArray() })
        $securePassword = ConvertTo-SecureString -String $password -AsPlainText -Force

        # Create the user
        Write-Host "Creating user account..." -ForegroundColor Cyan
        New-ADUser -Name "$($userParams.FirstName) $($userParams.LastName)" \`
          -GivenName $userParams.FirstName \`
          -Surname $userParams.LastName \`
          -SamAccountName $userParams.SamAccountName \`
          -UserPrincipalName $userParams.UserPrincipalName \`
          -Path $userParams.Path \`
          -AccountPassword $securePassword \`
          -Enabled $true \`
          -ChangePasswordAtLogon $true \`
          -Credential $credential \`
          -ErrorAction Stop

        Write-Host "✅ User account created successfully!" -ForegroundColor Green

        # Add user to groups (standard + site-specific + job profile)
        Write-Host "\`n📋 Adding user to groups..." -ForegroundColor Cyan
        ${siteGroups.length > 0 || jobProfileGroups.length > 0 ? `
        $groupSuccess = Add-UserToStandardGroups -SamAccountName $userParams.SamAccountName -Credential $credential -AdditionalGroups $siteGroups -JobProfileGroups $jobProfileGroups
        ` : `
        $groupSuccess = Add-UserToStandardGroups -SamAccountName $userParams.SamAccountName -Credential $credential
        `}

        if (-not $groupSuccess) {
          Write-Warning "⚠️ Some groups failed to be added, but user was created successfully."
        }

        # Send email to manager
        $emailSent = $false
        $managerEmail = $null

        # Priority 1: If Manager DN is provided, retrieve email from AD
        ${userInfo.manager ? `
        if (-not [string]::IsNullOrWhiteSpace($userParams.Manager)) {
          Write-Host "📧 Retrieving manager email address from AD..." -ForegroundColor Cyan
          $managerEmail = Get-ManagerEmailFromDN -ManagerDN $userParams.Manager -Credential $credential

          if ($managerEmail) {
            Write-Host "Sending credentials to manager: $managerEmail" -ForegroundColor Cyan
            $emailParams = @{
              EmployeeName = "$($userParams.FirstName) $($userParams.LastName)"
              EmailAddress = $userParams.UserPrincipalName
              TempPassword = $password
              ManagerEmail = $managerEmail
              CreationDate = (Get-Date -Format "MMMM dd, yyyy 'at' hh:mm tt")
            }

            $emailSent = Send-NewUserCredentialEmail @emailParams
          }
          else {
            Write-Warning "Could not retrieve manager email from AD."
          }
        }
        ` : ''}

        # Priority 2: If no Manager DN or AD lookup failed, use manual manager email
        ${userInfo.managerEmail ? `
        if (-not $emailSent -and -not [string]::IsNullOrWhiteSpace("${userInfo.managerEmail}")) {
          $managerEmail = "${userInfo.managerEmail}"
          Write-Host "📧 Using manually entered manager email: $managerEmail" -ForegroundColor Cyan

          $emailParams = @{
            EmployeeName = "$($userParams.FirstName) $($userParams.LastName)"
            EmailAddress = $userParams.UserPrincipalName
            TempPassword = $password
            ManagerEmail = $managerEmail
            CreationDate = (Get-Date -Format "MMMM dd, yyyy 'at' hh:mm tt")
          }

          $emailSent = Send-NewUserCredentialEmail @emailParams
        }
        ` : ''}

        # Return success with password and email status
        @{
          Success = $true
          Username = $userParams.SamAccountName
          Email = $userParams.UserPrincipalName
          Password = $password
          EmailSent = $emailSent
          ManagerEmail = $managerEmail
          Message = "User created successfully"
        } | ConvertTo-Json
      }
      catch {
        @{
          Success = $false
          Error = $_.Exception.Message
        } | ConvertTo-Json
      }
    `;

    const ps = spawn('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-Command', psCommand
    ]);

    let stdout = '';
    let stderr = '';

    ps.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      // Send progress updates to renderer
      event.sender.send('user-creation-progress', output);
    });

    ps.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ps.on('close', (code) => {
      if (code === 0 && stdout.trim()) {
        try {
          const result = JSON.parse(stdout.trim());
          if (result.Success) {
            resolve({ success: true, result });
          } else {
            reject({ success: false, error: result.Error || 'User creation failed' });
          }
        } catch (e) {
          resolve({ success: true, output: stdout });
        }
      } else {
        reject({ success: false, error: stderr || stdout || 'User creation failed' });
      }
    });

    ps.on('error', (error) => {
      reject({ success: false, error: error.message });
    });
  });
});

// IPC Handlers for Windows Credential Manager
ipcMain.handle('save-credential', async (event, target: string, username: string, password: string) => {
  const scriptPath = path.join(app.getAppPath(), 'scripts', 'CredentialManager.ps1');

  return new Promise((resolve, reject) => {
    const ps = spawn('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-File', scriptPath,
      '-Action', 'Save',
      '-Target', target,
      '-Username', username,
      '-Password', password
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
      try {
        const result = JSON.parse(stdout);
        if (result.success) {
          resolve(result);
        } else {
          reject(result);
        }
      } catch (error) {
        reject({ success: false, error: stderr || stdout || 'Failed to parse response' });
      }
    });

    ps.on('error', (error) => {
      reject({ success: false, error: error.message });
    });
  });
});

ipcMain.handle('get-credential', async (event, target: string) => {
  const scriptPath = path.join(app.getAppPath(), 'scripts', 'CredentialManager.ps1');

  return new Promise((resolve, reject) => {
    const ps = spawn('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-File', scriptPath,
      '-Action', 'Get',
      '-Target', target
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
      try {
        const result = JSON.parse(stdout);
        if (result.success) {
          resolve(result);
        } else {
          // Return null if credential not found (not an error)
          resolve({ success: true, username: null, password: null });
        }
      } catch (error) {
        reject({ success: false, error: stderr || stdout || 'Failed to parse response' });
      }
    });

    ps.on('error', (error) => {
      reject({ success: false, error: error.message });
    });
  });
});

// IPC Handlers for Site Configuration Management
ipcMain.handle('save-site-config', async (event, siteConfig: any) => {
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

ipcMain.handle('get-site-configs', async (event) => {
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

ipcMain.handle('delete-site-config', async (event, siteId: string) => {
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
ipcMain.handle('test-ad-connection', async (event) => {
  const scriptPath = path.join(app.getAppPath(), 'scripts', 'Test-ADConnection.ps1');

  return new Promise((resolve) => {
    const psCommand = `
      $ErrorActionPreference = "Stop"
      . "${scriptPath}"

      # Get stored credentials
      $credential = Get-StoredCredential -Target "ADHelper_AdminCred"

      # Run connection test with timeout
      if ($credential) {
        Test-ADConnection -Credential $credential -TimeoutSeconds 10
      } else {
        Test-ADConnection -TimeoutSeconds 10
      }
    `;

    const ps = spawn('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-Command', psCommand
    ]);

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    // Set a timeout for the entire operation (15 seconds)
    const timeout = setTimeout(() => {
      timedOut = true;
      ps.kill();
      resolve({
        success: false,
        connected: false,
        error: 'Connection test timed out - Please check VPN connection',
        timestamp: new Date().toISOString()
      });
    }, 15000);

    ps.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    ps.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ps.on('close', (code) => {
      clearTimeout(timeout);

      if (timedOut) {
        return; // Already resolved with timeout error
      }

      try {
        // Try to parse JSON result from PowerShell
        const jsonMatch = stdout.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          resolve({
            success: true,
            connected: result.Connected,
            domain: result.Domain,
            domainController: result.DomainController,
            responseTime: result.ResponseTime,
            error: result.Error,
            timestamp: result.Timestamp
          });
        } else {
          // No JSON found, connection failed
          resolve({
            success: false,
            connected: false,
            error: stderr || 'Failed to test AD connection',
            timestamp: new Date().toISOString()
          });
        }
      } catch (error: any) {
        resolve({
          success: false,
          connected: false,
          error: error.message || 'Failed to parse connection test result',
          timestamp: new Date().toISOString()
        });
      }
    });

    ps.on('error', (error) => {
      clearTimeout(timeout);
      resolve({
        success: false,
        connected: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    });
  });
});

// IPC Handler for Job Profile Management
ipcMain.handle('save-job-profiles', async (event, siteId: string, jobProfiles: any[]) => {
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

ipcMain.handle('get-job-profiles', async (event, siteId: string) => {
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

ipcMain.handle('delete-credential', async (event, target: string) => {
  const scriptPath = path.join(app.getAppPath(), 'scripts', 'CredentialManager.ps1');

  return new Promise((resolve, reject) => {
    const ps = spawn('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-File', scriptPath,
      '-Action', 'Delete',
      '-Target', target
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
      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (error) {
        reject({ success: false, error: stderr || stdout || 'Failed to parse response' });
      }
    });

    ps.on('error', (error) => {
      reject({ success: false, error: error.message });
    });
  });
});

