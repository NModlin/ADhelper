// Mock electronAPI for browser mode
// This allows the app to run in both Electron and browser

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

// Mock implementation for browser mode
const mockElectronAPI: ElectronAPI = {
  runADHelperScript: async (_username: string, _operation: string) => {
    console.warn('Running in browser mode - ADHelper script not available');
    return {
      success: false,
      error: 'AD operations are only available in desktop mode. Please use the desktop app.'
    };
  },

  onADHelperProgress: (_callback: (data: string) => void) => {
    console.warn('Running in browser mode - progress updates not available');
  },
  
  removeADHelperProgressListener: () => {
    console.warn('Running in browser mode - no listeners to remove');
  },

  removeMFABlocking: async (_username: string) => {
    console.warn('Running in browser mode - MFA removal not available');
    return {
      success: false,
      error: 'MFA removal is only available in desktop mode. Please use the desktop app.'
    };
  },

  onMFARemovalProgress: (_callback: (data: string) => void) => {
    console.warn('Running in browser mode - progress updates not available');
  },

  removeMFARemovalProgressListener: () => {
    console.warn('Running in browser mode - no listeners to remove');
  },

  createNewUser: async (_userInfo: any) => {
    console.warn('Running in browser mode - User creation not available');
    return {
      success: false,
      error: 'User creation is only available in desktop mode. Please use the desktop app.'
    };
  },

  onUserCreationProgress: (_callback: (data: string) => void) => {
    console.warn('Running in browser mode - progress updates not available');
  },

  removeUserCreationProgressListener: () => {
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
  },

  // Site Configuration Management (browser mode fallback)
  saveSiteConfig: async (siteConfig: any) => {
    try {
      const sites = JSON.parse(localStorage.getItem('siteConfigs') || '[]');
      const existingIndex = sites.findIndex((s: any) => s.id === siteConfig.id);
      if (existingIndex >= 0) {
        sites[existingIndex] = siteConfig;
      } else {
        sites.push(siteConfig);
      }
      localStorage.setItem('siteConfigs', JSON.stringify(sites));
      return { success: true, message: 'Site configuration saved to browser storage' };
    } catch (error) {
      return { success: false, error: 'Failed to save site configuration' };
    }
  },

  getSiteConfigs: async () => {
    try {
      const sites = JSON.parse(localStorage.getItem('siteConfigs') || '[]');
      return { success: true, sites };
    } catch (error) {
      return { success: false, error: 'Failed to retrieve site configurations' };
    }
  },

  deleteSiteConfig: async (siteId: string) => {
    try {
      let sites = JSON.parse(localStorage.getItem('siteConfigs') || '[]');
      sites = sites.filter((s: any) => s.id !== siteId);
      localStorage.setItem('siteConfigs', JSON.stringify(sites));
      return { success: true, message: 'Site configuration deleted from browser storage' };
    } catch (error) {
      return { success: false, error: 'Failed to delete site configuration' };
    }
  },

  // AD Connection Test (browser mode - always return disconnected)
  testADConnection: async () => {
    return {
      success: true,
      connected: false,
      error: 'AD connection test not available in browser mode',
      timestamp: new Date().toISOString()
    };
  },

  // Job Profile Management (browser mode - use localStorage)
  saveJobProfiles: async (siteId: string, jobProfiles: any[]) => {
    try {
      let allProfiles: any = {};
      const stored = localStorage.getItem('jobProfiles');
      if (stored) {
        allProfiles = JSON.parse(stored);
      }
      allProfiles[siteId] = jobProfiles;
      localStorage.setItem('jobProfiles', JSON.stringify(allProfiles));
      return { success: true, message: 'Job profiles saved to browser storage' };
    } catch (error) {
      return { success: false, error: 'Failed to save job profiles' };
    }
  },

  getJobProfiles: async (siteId: string) => {
    try {
      const stored = localStorage.getItem('jobProfiles');
      if (!stored) {
        return { success: true, jobProfiles: [] };
      }
      const allProfiles = JSON.parse(stored);
      const jobProfiles = allProfiles[siteId] || [];
      return { success: true, jobProfiles };
    } catch (error) {
      return { success: false, error: 'Failed to load job profiles' };
    }
  }
};

// Export the electronAPI - use real one if available, otherwise use mock
export const electronAPI: ElectronAPI = (window as any).electronAPI || mockElectronAPI;

// Check if running in Electron
export const isElectron = !!(window as any).electronAPI;

