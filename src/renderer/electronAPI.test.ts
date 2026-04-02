import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('electronAPI – browser mode fallback', () => {
  let electronAPIModule: typeof import('./electronAPI');

  beforeEach(async () => {
    vi.resetModules();
    // Ensure no window.electronAPI so we get the mock path
    delete (window as any).electronAPI;
    // Clear localStorage
    localStorage.clear();
    electronAPIModule = await import('./electronAPI');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('isElectron is false when window.electronAPI is absent', () => {
    expect(electronAPIModule.isElectron).toBe(false);
  });

  it('electronAPI object has all required methods', () => {
    const api = electronAPIModule.electronAPI;
    const expectedMethods = [
      'runADHelperScript', 'onADHelperProgress', 'removeADHelperProgressListener',
      'removeMFABlocking', 'onMFARemovalProgress', 'removeMFARemovalProgressListener',
      'createNewUser', 'onUserCreationProgress', 'removeUserCreationProgressListener',
      'processContractorAccount', 'onContractorProcessingProgress', 'removeContractorProcessingProgressListener',
      'processBulkUsers', 'onBulkProcessingProgress', 'removeBulkProcessingProgressListener',
      'saveCredential', 'getCredential', 'deleteCredential',
      'saveSiteConfig', 'getSiteConfigs', 'deleteSiteConfig',
      'testADConnection', 'saveJobProfiles', 'getJobProfiles',
      'getUserRole', 'setUserRole',
      'findStaleJiraTickets', 'bulkUpdateJiraTickets',
      'getResponsibleSites', 'saveResponsibleSites', 'findSiteJiraTickets',
      'onSiteTicketCount', 'removeSiteTicketCountListener',
      'updateDisplayName', 'onDisplayNameUpdateProgress', 'removeDisplayNameUpdateProgressListener',
    ];
    for (const method of expectedMethods) {
      expect(typeof (api as any)[method]).toBe('function');
    }
  });

  // ── Credential management — browser mode (no localStorage fallback) ──
  describe('credential management (desktop-only; returns error in browser mode)', () => {
    it('saveCredential returns failure with desktop-only error', async () => {
      const result = await electronAPIModule.electronAPI.saveCredential('TestTarget', 'user1', 'pass1');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/desktop/i);
    });

    it('getCredential returns failure with desktop-only error', async () => {
      const result = await electronAPIModule.electronAPI.getCredential('TestTarget');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/desktop/i);
    });

    it('getCredential does not return credentials from localStorage', async () => {
      // Even if something was stored in localStorage, getCredential must not expose it
      localStorage.setItem('credentials', JSON.stringify({ TestTarget: { username: 'u', password: 'p' } }));
      const result = await electronAPIModule.electronAPI.getCredential('TestTarget');
      expect(result.success).toBe(false);
      expect(result.username).toBeUndefined();
      expect(result.password).toBeUndefined();
    });

    it('deleteCredential returns failure with desktop-only error', async () => {
      const del = await electronAPIModule.electronAPI.deleteCredential('TestTarget');
      expect(del.success).toBe(false);
      expect(del.error).toMatch(/desktop/i);
    });
  });

  // ── Site config management ─────────────────────────────────────────
  describe('site config management (browser localStorage fallback)', () => {
    it('saveSiteConfig stores and getSiteConfigs retrieves', async () => {
      await electronAPIModule.electronAPI.saveSiteConfig({ id: 's1', name: 'Site 1', groups: [] });
      const result = await electronAPIModule.electronAPI.getSiteConfigs();
      expect(result.success).toBe(true);
      expect(result.sites).toHaveLength(1);
      expect(result.sites![0].name).toBe('Site 1');
    });

    it('saveSiteConfig updates existing config by id', async () => {
      await electronAPIModule.electronAPI.saveSiteConfig({ id: 's1', name: 'Old', groups: [] });
      await electronAPIModule.electronAPI.saveSiteConfig({ id: 's1', name: 'New', groups: [] });
      const result = await electronAPIModule.electronAPI.getSiteConfigs();
      expect(result.sites).toHaveLength(1);
      expect(result.sites![0].name).toBe('New');
    });

    it('deleteSiteConfig removes the config', async () => {
      await electronAPIModule.electronAPI.saveSiteConfig({ id: 's1', name: 'Site 1', groups: [] });
      await electronAPIModule.electronAPI.deleteSiteConfig('s1');
      const result = await electronAPIModule.electronAPI.getSiteConfigs();
      expect(result.sites).toHaveLength(0);
    });
  });

  // ── Job profiles ───────────────────────────────────────────────────
  describe('job profile management (browser localStorage fallback)', () => {
    it('saveJobProfiles and getJobProfiles round-trip', async () => {
      const profiles = [{ category: 'Engineering', groups: [{ name: 'Eng Group', distinguishedName: 'CN=Eng,DC=example,DC=com' }] }];
      await electronAPIModule.electronAPI.saveJobProfiles('site1', profiles);
      const result = await electronAPIModule.electronAPI.getJobProfiles('site1');
      expect(result.success).toBe(true);
      expect(result.jobProfiles).toEqual(profiles);
    });

    it('getJobProfiles returns empty array for unknown site', async () => {
      const result = await electronAPIModule.electronAPI.getJobProfiles('unknown');
      expect(result.jobProfiles).toEqual([]);
    });
  });

  // ── Desktop-only stubs ─────────────────────────────────────────────
  describe('desktop-only operations return graceful errors', () => {
    it('runADHelperScript returns error in browser mode', async () => {
      const result = await electronAPIModule.electronAPI.runADHelperScript('user', 'process');
      expect(result.success).toBe(false);
      expect(result.error).toContain('desktop mode');
    });

    it('testADConnection returns disconnected in browser mode', async () => {
      const result = await electronAPIModule.electronAPI.testADConnection();
      expect(result.connected).toBe(false);
    });

    it('getUserRole returns operator in browser mode (fail-secure default)', async () => {
      const result = await electronAPIModule.electronAPI.getUserRole();
      expect(result.role).toBe('operator');
    });

    it('setUserRole returns error in browser mode', async () => {
      const result = await electronAPIModule.electronAPI.setUserRole('operator');
      expect(result.success).toBe(false);
    });

    it('findStaleJiraTickets returns error in browser mode', async () => {
      const result = await electronAPIModule.electronAPI.findStaleJiraTickets(48);
      expect(result.success).toBe(false);
    });

    it('findSiteJiraTickets returns error in browser mode', async () => {
      const result = await electronAPIModule.electronAPI.findSiteJiraTickets(['ORL']);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/desktop/i);
    });
  });

  // ── Responsible sites — browser localStorage fallback ──────────────
  describe('responsible sites (browser localStorage fallback)', () => {
    it('getResponsibleSites returns empty array when nothing stored', async () => {
      const result = await electronAPIModule.electronAPI.getResponsibleSites();
      expect(result.success).toBe(true);
      expect(result.siteIds).toEqual([]);
    });

    it('saveResponsibleSites persists and getResponsibleSites retrieves', async () => {
      await electronAPIModule.electronAPI.saveResponsibleSites(['site-1', 'site-2']);
      const result = await electronAPIModule.electronAPI.getResponsibleSites();
      expect(result.success).toBe(true);
      expect(result.siteIds).toEqual(['site-1', 'site-2']);
    });

    it('saveResponsibleSites overwrites previous selection', async () => {
      await electronAPIModule.electronAPI.saveResponsibleSites(['site-1']);
      await electronAPIModule.electronAPI.saveResponsibleSites(['site-2', 'site-3']);
      const result = await electronAPIModule.electronAPI.getResponsibleSites();
      expect(result.siteIds).toEqual(['site-2', 'site-3']);
    });
  });
});

