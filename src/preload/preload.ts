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
});

// Type definitions for TypeScript
export interface ElectronAPI {
  executePowerShell: (script: string, args?: string[]) => Promise<{ success: boolean; output?: string; error?: string }>;
  runADHelperScript: (username: string, operation: string) => Promise<{ success: boolean; output?: string; error?: string }>;
  onADHelperProgress: (callback: (data: string) => void) => void;
  removeADHelperProgressListener: () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

