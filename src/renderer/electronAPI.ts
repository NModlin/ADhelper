// Mock electronAPI for browser mode
// This allows the app to run in both Electron and browser

export interface ElectronAPI {
  executePowerShell: (script: string, args?: string[]) => Promise<{ success: boolean; output?: string; error?: string }>;
  runADHelperScript: (username: string, operation: string) => Promise<{ success: boolean; output?: string; error?: string }>;
  onADHelperProgress: (callback: (data: string) => void) => void;
  removeADHelperProgressListener: () => void;
  saveCredential: (target: string, username: string, password: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  getCredential: (target: string) => Promise<{ success: boolean; username?: string; password?: string; error?: string }>;
  deleteCredential: (target: string) => Promise<{ success: boolean; message?: string; error?: string }>;
}

// Mock implementation for browser mode
const mockElectronAPI: ElectronAPI = {
  executePowerShell: async (script: string, args?: string[]) => {
    console.warn('Running in browser mode - PowerShell execution not available');
    return {
      success: false,
      error: 'PowerShell execution is only available in desktop mode. Please use the desktop app.'
    };
  },
  
  runADHelperScript: async (username: string, operation: string) => {
    console.warn('Running in browser mode - ADHelper script not available');
    return {
      success: false,
      error: 'AD operations are only available in desktop mode. Please use the desktop app.'
    };
  },
  
  onADHelperProgress: (callback: (data: string) => void) => {
    console.warn('Running in browser mode - progress updates not available');
  },
  
  removeADHelperProgressListener: () => {
    console.warn('Running in browser mode - no listeners to remove');
  },

  saveCredential: async (target: string, username: string, password: string) => {
    console.warn('Running in browser mode - Credential Manager not available');
    // In browser mode, use localStorage as fallback (less secure but functional)
    try {
      const credentials = JSON.parse(localStorage.getItem('credentials') || '{}');
      credentials[target] = { username, password };
      localStorage.setItem('credentials', JSON.stringify(credentials));
      return { success: true, message: 'Credential saved to browser storage (use desktop app for secure storage)' };
    } catch (error) {
      return { success: false, error: 'Failed to save credential' };
    }
  },

  getCredential: async (target: string) => {
    console.warn('Running in browser mode - Credential Manager not available');
    // In browser mode, use localStorage as fallback
    try {
      const credentials = JSON.parse(localStorage.getItem('credentials') || '{}');
      const cred = credentials[target];
      if (cred) {
        return { success: true, username: cred.username, password: cred.password };
      }
      return { success: true, username: null, password: null };
    } catch (error) {
      return { success: false, error: 'Failed to retrieve credential' };
    }
  },

  deleteCredential: async (target: string) => {
    console.warn('Running in browser mode - Credential Manager not available');
    try {
      const credentials = JSON.parse(localStorage.getItem('credentials') || '{}');
      delete credentials[target];
      localStorage.setItem('credentials', JSON.stringify(credentials));
      return { success: true, message: 'Credential deleted from browser storage' };
    } catch (error) {
      return { success: false, error: 'Failed to delete credential' };
    }
  }
};

// Export the electronAPI - use real one if available, otherwise use mock
export const electronAPI: ElectronAPI = (window as any).electronAPI || mockElectronAPI;

// Check if running in Electron
export const isElectron = !!(window as any).electronAPI;

