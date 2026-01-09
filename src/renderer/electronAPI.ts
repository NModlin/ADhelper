// Mock electronAPI for browser mode
// This allows the app to run in both Electron and browser

export interface ElectronAPI {
  executePowerShell: (script: string, args?: string[]) => Promise<{ success: boolean; output?: string; error?: string }>;
  runADHelperScript: (username: string, operation: string) => Promise<{ success: boolean; output?: string; error?: string }>;
  onADHelperProgress: (callback: (data: string) => void) => void;
  removeADHelperProgressListener: () => void;
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
  }
};

// Export the electronAPI - use real one if available, otherwise use mock
export const electronAPI: ElectronAPI = (window as any).electronAPI || mockElectronAPI;

// Check if running in Electron
export const isElectron = !!(window as any).electronAPI;

