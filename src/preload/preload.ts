import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Run ADHelper script
  runADHelperScript: (username: string, operation: string) =>
    ipcRenderer.invoke('run-adhelper-script', username, operation),
  
  // Listen for progress updates
  onADHelperProgress: (callback: (data: string) => void) => {
    ipcRenderer.on('adhelper-progress', (_event, data) => callback(data));
  },
  
  // Remove progress listener
  removeADHelperProgressListener: () => {
    ipcRenderer.removeAllListeners('adhelper-progress');
  },

  // MFA Blocking Group Removal
  removeMFABlocking: (username: string) =>
    ipcRenderer.invoke('remove-mfa-blocking', username),

  onMFARemovalProgress: (callback: (data: string) => void) => {
    ipcRenderer.on('mfa-removal-progress', (_event, data) => callback(data));
  },

  removeMFARemovalProgressListener: () => {
    ipcRenderer.removeAllListeners('mfa-removal-progress');
  },

  // Create New User
  createNewUser: (userInfo: any) =>
    ipcRenderer.invoke('create-new-user', userInfo),

  onUserCreationProgress: (callback: (data: string) => void) => {
    ipcRenderer.on('user-creation-progress', (_event, data) => callback(data));
  },

  removeUserCreationProgressListener: () => {
    ipcRenderer.removeAllListeners('user-creation-progress');
  },

  // Windows Credential Manager
  saveCredential: (target: string, username: string, password: string) =>
    ipcRenderer.invoke('save-credential', target, username, password),

  getCredential: (target: string) =>
    ipcRenderer.invoke('get-credential', target),

  deleteCredential: (target: string) =>
    ipcRenderer.invoke('delete-credential', target),

  // Site Configuration Management
  saveSiteConfig: (siteConfig: any) =>
    ipcRenderer.invoke('save-site-config', siteConfig),

  getSiteConfigs: () =>
    ipcRenderer.invoke('get-site-configs'),

  deleteSiteConfig: (siteId: string) =>
    ipcRenderer.invoke('delete-site-config', siteId),

  // Active Directory Connection Test
  testADConnection: () =>
    ipcRenderer.invoke('test-ad-connection'),

  // Job Profile Management
  saveJobProfiles: (siteId: string, jobProfiles: any[]) =>
    ipcRenderer.invoke('save-job-profiles', siteId, jobProfiles),

  getJobProfiles: (siteId: string) =>
    ipcRenderer.invoke('get-job-profiles', siteId),
});

// Type definitions for TypeScript
export interface ElectronAPI {
  runADHelperScript: (username: string, operation: string) => Promise<{ success: boolean; output?: string; error?: string }>;
  onADHelperProgress: (callback: (data: string) => void) => void;
  removeADHelperProgressListener: () => void;
  removeMFABlocking: (username: string) => Promise<{ success: boolean; result?: any; error?: string }>;
  onMFARemovalProgress: (callback: (data: string) => void) => void;
  removeMFARemovalProgressListener: () => void;
  createNewUser: (userInfo: any) => Promise<{ success: boolean; result?: any; error?: string }>;
  onUserCreationProgress: (callback: (data: string) => void) => void;
  removeUserCreationProgressListener: () => void;
  saveCredential: (target: string, username: string, password: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  getCredential: (target: string) => Promise<{ success: boolean; username?: string; password?: string; error?: string }>;
  deleteCredential: (target: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  saveSiteConfig: (siteConfig: any) => Promise<{ success: boolean; message?: string; error?: string }>;
  getSiteConfigs: () => Promise<{ success: boolean; sites?: any[]; error?: string }>;
  deleteSiteConfig: (siteId: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  testADConnection: () => Promise<{ success: boolean; connected: boolean; domain?: string; domainController?: string; responseTime?: number; error?: string; timestamp: string }>;
  saveJobProfiles: (siteId: string, jobProfiles: any[]) => Promise<{ success: boolean; message?: string; error?: string }>;
  getJobProfiles: (siteId: string) => Promise<{ success: boolean; jobProfiles?: any[]; error?: string }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

