import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // PowerShell execution
  executePowerShell: (script: string, args?: string[]) => 
    ipcRenderer.invoke('execute-powershell', script, args),
  
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

  // Windows Credential Manager
  saveCredential: (target: string, username: string, password: string) =>
    ipcRenderer.invoke('save-credential', target, username, password),

  getCredential: (target: string) =>
    ipcRenderer.invoke('get-credential', target),

  deleteCredential: (target: string) =>
    ipcRenderer.invoke('delete-credential', target),
});

// Type definitions for TypeScript
export interface ElectronAPI {
  executePowerShell: (script: string, args?: string[]) => Promise<{ success: boolean; output?: string; error?: string }>;
  runADHelperScript: (username: string, operation: string) => Promise<{ success: boolean; output?: string; error?: string }>;
  onADHelperProgress: (callback: (data: string) => void) => void;
  removeADHelperProgressListener: () => void;
  saveCredential: (target: string, username: string, password: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  getCredential: (target: string) => Promise<{ success: boolean; username?: string; password?: string; error?: string }>;
  deleteCredential: (target: string) => Promise<{ success: boolean; message?: string; error?: string }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

