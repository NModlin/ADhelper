import { contextBridge, ipcRenderer } from 'electron';

// ── Shared IPC payload types (mirror of main.ts definitions) ─────────────────

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
  createNewUser: (userInfo: NewUserInfo) =>
    ipcRenderer.invoke('create-new-user', userInfo),

  onUserCreationProgress: (callback: (data: string) => void) => {
    ipcRenderer.on('user-creation-progress', (_event, data) => callback(data));
  },

  removeUserCreationProgressListener: () => {
    ipcRenderer.removeAllListeners('user-creation-progress');
  },

  // Process Contractor Account Extension
  processContractorAccount: (usernames: string[]) =>
    ipcRenderer.invoke('process-contractor-account', usernames),

  onContractorProcessingProgress: (callback: (data: string) => void) => {
    ipcRenderer.on('contractor-processing-progress', (_event, data) => callback(data));
  },

  removeContractorProcessingProgressListener: () => {
    ipcRenderer.removeAllListeners('contractor-processing-progress');
  },

  // Bulk User Processing (groups + proxies)
  processBulkUsers: (usernames: string[], mode: string) =>
    ipcRenderer.invoke('process-bulk-users', usernames, mode),

  onBulkProcessingProgress: (callback: (data: string) => void) => {
    ipcRenderer.on('bulk-processing-progress', (_event, data) => callback(data));
  },

  removeBulkProcessingProgressListener: () => {
    ipcRenderer.removeAllListeners('bulk-processing-progress');
  },

  // Update AD Display Name
  updateDisplayName: (samAccountName: string, newDisplayName: string) =>
    ipcRenderer.invoke('update-display-name', samAccountName, newDisplayName),

  onDisplayNameUpdateProgress: (callback: (data: string) => void) => {
    ipcRenderer.on('display-name-update-progress', (_event, data) => callback(data));
  },

  removeDisplayNameUpdateProgressListener: () => {
    ipcRenderer.removeAllListeners('display-name-update-progress');
  },

  // Windows Credential Manager
  saveCredential: (target: string, username: string, password: string) =>
    ipcRenderer.invoke('save-credential', target, username, password),

  getCredential: (target: string) =>
    ipcRenderer.invoke('get-credential', target),

  deleteCredential: (target: string) =>
    ipcRenderer.invoke('delete-credential', target),

  // Site Configuration Management
  saveSiteConfig: (siteConfig: SiteConfig) =>
    ipcRenderer.invoke('save-site-config', siteConfig),

  getSiteConfigs: () =>
    ipcRenderer.invoke('get-site-configs'),

  deleteSiteConfig: (siteId: string) =>
    ipcRenderer.invoke('delete-site-config', siteId),

  // Active Directory Connection Test
  testADConnection: () =>
    ipcRenderer.invoke('test-ad-connection'),

  // Job Profile Management
  saveJobProfiles: (siteId: string, jobProfiles: JobProfile[]) =>
    ipcRenderer.invoke('save-job-profiles', siteId, jobProfiles),

  getJobProfiles: (siteId: string) =>
    ipcRenderer.invoke('get-job-profiles', siteId),

  // RBAC (Role-Based Access Control)
  getUserRole: () =>
    ipcRenderer.invoke('get-user-role'),

  setUserRole: (role: string) =>
    ipcRenderer.invoke('set-user-role', role),

  // Responsible Sites (Jira site-ownership tracking)
  getResponsibleSites: () =>
    ipcRenderer.invoke('get-responsible-sites'),

  saveResponsibleSites: (siteIds: string[]) =>
    ipcRenderer.invoke('save-responsible-sites', siteIds),

  // Jira Integration (routed through main process for security + CSP bypass)
  // Credentials are retrieved internally by the main process from Windows Credential Manager.
  findStaleJiraTickets: (hoursThreshold: number) =>
    ipcRenderer.invoke('jira-find-stale-tickets', hoursThreshold),

  bulkUpdateJiraTickets: (tickets: JiraTicket[], action: string, value: string) =>
    ipcRenderer.invoke('jira-bulk-update', tickets, action, value),

  findSiteJiraTickets: (projectKeys: string[]) =>
    ipcRenderer.invoke('jira-find-site-tickets', projectKeys),

  // Push event: main process sends the current site-ticket count after each poll
  onSiteTicketCount: (callback: (count: number) => void) => {
    ipcRenderer.on('site-ticket-count', (_event, count: number) => callback(count));
  },

  removeSiteTicketCountListener: () => {
    ipcRenderer.removeAllListeners('site-ticket-count');
  },
});

// Type definitions for TypeScript
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
  processContractorAccount: (usernames: string[]) => Promise<{ success: boolean; result?: any; error?: string }>;
  onContractorProcessingProgress: (callback: (data: string) => void) => void;
  removeContractorProcessingProgressListener: () => void;
  processBulkUsers: (usernames: string[], mode: string) => Promise<{ success: boolean; result?: any; error?: string }>;
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

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

