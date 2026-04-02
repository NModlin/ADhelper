// Mock electronAPI for browser mode
// This allows the app to run in both Electron and browser

// ── Shared IPC payload types (mirror of preload.ts / main.ts definitions) ────

export interface SiteConfig {
  id: string;
  name: string;
  groups: string[];
  /** Optional Jira project key used for site-based ticket filtering (e.g. "ORL", "PHX") */
  jiraProjectKey?: string;
}

export interface JobProfileGroup {
  name: string;
  distinguishedName: string;
}

export interface JobProfile {
  category: string;
  groups: JobProfileGroup[];
}

export interface NewUserInfo {
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
  jobProfileGroups?: string[];
}

export interface RBACConfig {
  role: 'admin' | 'operator';
  configuredBy: string;
  configuredAt: string;
}

export interface JiraTicket {
  key: string;
  summary: string;
  status: string;
  lastUpdated: string;
  assignee: string;
  updated: string;
}

/** Shape of the PowerShell result object returned by Remove-MFABlocking.ps1 */
export interface MFARemovalResult {
  Success?: boolean;
  WasInGroup?: boolean;
  Message?: string;
  ErrorType?: string;
  DisplayName?: string;
  Error?: string;
}

export interface ElectronAPI {
  runADHelperScript: (username: string, operation: string) => Promise<{ success: boolean; output?: string; error?: string }>;
  onADHelperProgress: (callback: (data: string) => void) => void;
  removeADHelperProgressListener: () => void;
  removeMFABlocking: (username: string) => Promise<{ success: boolean; result?: MFARemovalResult; error?: string }>;
  onMFARemovalProgress: (callback: (data: string) => void) => void;
  removeMFARemovalProgressListener: () => void;
  createNewUser: (userInfo: NewUserInfo) => Promise<{ success: boolean; result?: unknown; error?: string }>;
  onUserCreationProgress: (callback: (data: string) => void) => void;
  removeUserCreationProgressListener: () => void;
  processContractorAccount: (usernames: string[]) => Promise<{ success: boolean; result?: unknown; error?: string }>;
  onContractorProcessingProgress: (callback: (data: string) => void) => void;
  removeContractorProcessingProgressListener: () => void;
  processBulkUsers: (usernames: string[], mode: string) => Promise<{ success: boolean; result?: unknown; error?: string }>;
  onBulkProcessingProgress: (callback: (data: string) => void) => void;
  removeBulkProcessingProgressListener: () => void;
  updateDisplayName: (samAccountName: string, newDisplayName: string) => Promise<{ success: boolean; result?: unknown; error?: string }>;
  onDisplayNameUpdateProgress: (callback: (data: string) => void) => void;
  removeDisplayNameUpdateProgressListener: () => void;
  saveCredential: (target: string, username: string, password: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  getCredential: (target: string) => Promise<{ success: boolean; username?: string; password?: string; error?: string }>;
  deleteCredential: (target: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  saveSiteConfig: (siteConfig: SiteConfig) => Promise<{ success: boolean; message?: string; error?: string }>;
  getSiteConfigs: () => Promise<{ success: boolean; sites?: SiteConfig[]; error?: string }>;
  deleteSiteConfig: (siteId: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  testADConnection: () => Promise<{ success: boolean; connected: boolean; domain?: string; domainController?: string; responseTime?: number; error?: string; timestamp: string }>;
  saveJobProfiles: (siteId: string, jobProfiles: JobProfile[]) => Promise<{ success: boolean; message?: string; error?: string }>;
  getJobProfiles: (siteId: string) => Promise<{ success: boolean; jobProfiles?: JobProfile[]; error?: string }>;
  getUserRole: () => Promise<{ success: boolean; role: string; config: RBACConfig; adminOnlyOperations: string[] }>;
  setUserRole: (role: string) => Promise<{ success: boolean; config?: RBACConfig; error?: string }>;
  getResponsibleSites: () => Promise<{ success: boolean; siteIds?: string[]; error?: string }>;
  saveResponsibleSites: (siteIds: string[]) => Promise<{ success: boolean; message?: string; error?: string }>;
  findStaleJiraTickets: (hoursThreshold: number) => Promise<{ success: boolean; tickets?: JiraTicket[]; error?: string }>;
  bulkUpdateJiraTickets: (tickets: JiraTicket[], action: string, value: string) => Promise<{ success: boolean; results?: { success: number; failed: number; errors: string[] }; error?: string }>;
  findSiteJiraTickets: (projectKeys: string[]) => Promise<{ success: boolean; tickets?: JiraTicket[]; error?: string }>;
  onSiteTicketCount: (callback: (count: number) => void) => void;
  removeSiteTicketCountListener: () => void;
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

  createNewUser: async (_userInfo: NewUserInfo) => {
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

  processContractorAccount: async (_usernames: string[]) => {
    console.warn('Running in browser mode - Contractor processing not available');
    return {
      success: false,
      error: 'Contractor account processing is only available in desktop mode. Please use the desktop app.'
    };
  },

  onContractorProcessingProgress: (_callback: (data: string) => void) => {
    console.warn('Running in browser mode - progress updates not available');
  },

  removeContractorProcessingProgressListener: () => {
    console.warn('Running in browser mode - no listeners to remove');
  },

  processBulkUsers: async (_usernames: string[], _mode: string) => {
    console.warn('Running in browser mode - Bulk processing not available');
    return {
      success: false,
      error: 'Bulk user processing is only available in desktop mode. Please use the desktop app.'
    };
  },

  onBulkProcessingProgress: (_callback: (data: string) => void) => {
    console.warn('Running in browser mode - progress updates not available');
  },

  removeBulkProcessingProgressListener: () => {
    console.warn('Running in browser mode - no listeners to remove');
  },

  updateDisplayName: async (_samAccountName: string, _newDisplayName: string) => {
    console.warn('Running in browser mode - Display name update not available');
    return {
      success: false,
      error: 'Display name updates are only available in desktop mode. Please use the desktop app.'
    };
  },

  onDisplayNameUpdateProgress: (_callback: (data: string) => void) => {
    console.warn('Running in browser mode - progress updates not available');
  },

  removeDisplayNameUpdateProgressListener: () => {
    console.warn('Running in browser mode - no listeners to remove');
  },

  saveCredential: async (_target: string, _username: string, _password: string) => {
    // Credential storage requires the Windows Credential Manager (desktop app only).
    // Storing credentials in browser storage (localStorage/sessionStorage) is insecure
    // and is explicitly disallowed.
    return { success: false, error: 'Credential storage is not available in browser mode. Please use the desktop app.' };
  },

  getCredential: async (_target: string) => {
    return { success: false, error: 'Credential storage is not available in browser mode. Please use the desktop app.' };
  },

  deleteCredential: async (_target: string) => {
    return { success: false, error: 'Credential storage is not available in browser mode. Please use the desktop app.' };
  },

  // Site Configuration Management (browser mode fallback)
  saveSiteConfig: async (siteConfig: SiteConfig) => {
    try {
      const sites: SiteConfig[] = JSON.parse(localStorage.getItem('siteConfigs') || '[]');
      const existingIndex = sites.findIndex(s => s.id === siteConfig.id);
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
      let sites: SiteConfig[] = JSON.parse(localStorage.getItem('siteConfigs') || '[]');
      sites = sites.filter(s => s.id !== siteId);
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
  saveJobProfiles: async (siteId: string, jobProfiles: JobProfile[]) => {
    try {
      let allProfiles: Record<string, JobProfile[]> = {};
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
  },

  getUserRole: async () => {
    console.warn('Running in browser mode - RBAC not available');
    // Return 'operator' to match the production fail-secure default (H3).
    // All actual operations are blocked in browser mode regardless of role.
    return { success: true, role: 'operator', config: { role: 'operator' as const, configuredBy: 'browser', configuredAt: new Date().toISOString() }, adminOnlyOperations: [] };
  },

  setUserRole: async (_role: string) => {
    console.warn('Running in browser mode - RBAC not available');
    return { success: false, error: 'Role management is only available in desktop mode.' };
  },

  findStaleJiraTickets: async (_hoursThreshold: number) => {
    console.warn('Running in browser mode - Jira integration not available');
    return { success: false, error: 'Jira integration is only available in desktop mode.' };
  },

  bulkUpdateJiraTickets: async (_tickets: JiraTicket[], _action: string, _value: string) => {
    console.warn('Running in browser mode - Jira integration not available');
    return { success: false, error: 'Jira integration is only available in desktop mode.' };
  },

  getResponsibleSites: async () => {
    try {
      const siteIds: string[] = JSON.parse(localStorage.getItem('responsibleSiteIds') || '[]');
      return { success: true, siteIds };
    } catch {
      return { success: true, siteIds: [] };
    }
  },

  saveResponsibleSites: async (siteIds: string[]) => {
    try {
      localStorage.setItem('responsibleSiteIds', JSON.stringify(siteIds));
      return { success: true, message: 'Responsible sites saved to browser storage' };
    } catch {
      return { success: false, error: 'Failed to save responsible sites' };
    }
  },

  findSiteJiraTickets: async (_projectKeys: string[]) => {
    console.warn('Running in browser mode - Jira integration not available');
    return { success: false, error: 'Jira integration is only available in desktop mode.' };
  },

  // Push event stubs — no-ops in browser mode (main process never fires these)
  onSiteTicketCount: (_callback: (count: number) => void) => {
    // No-op in browser mode
  },

  removeSiteTicketCountListener: () => {
    // No-op in browser mode
  },
};

// Export the electronAPI - use real one if available, otherwise use mock.
// Spread the mock first so any methods missing from the preload (e.g. after
// a partial rebuild) gracefully fall back to the mock implementation instead
// of being undefined.
const realAPI = (window as any).electronAPI;
export const electronAPI: ElectronAPI = realAPI
  ? { ...mockElectronAPI, ...realAPI }
  : mockElectronAPI;

// Check if running in Electron
export const isElectron = !!realAPI;

