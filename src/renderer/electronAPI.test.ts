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
    ];
    for (const method of expectedMethods) {
      expect(typeof (api as any)[method]).toBe('function');
    }
  });

  // ── Credential management via localStorage ─────────────────────────
  describe('credential management (browser localStorage fallback)', () => {
    it('saveCredential stores data and returns success', async () => {
      const result = await electronAPIModule.electronAPI.saveCredential('TestTarget', 'user1', 'pass1');
      expect(result.success).toBe(true);
      const stored = JSON.parse(localStorage.getItem('credentials') || '{}');
      expect(stored.TestTarget).toEqual({ username: 'user1', password: 'pass1' });
    });

    it('getCredential retrieves previously saved credentials', async () => {
      await electronAPIModule.electronAPI.saveCredential('TestTarget', 'alice', 'secret');
      const result = await electronAPIModule.electronAPI.getCredential('TestTarget');
      expect(result.success).toBe(true);
      expect(result.username).toBe('alice');
      expect(result.password).toBe('secret');
    });

    it('getCredential returns null fields for missing target', async () => {
      const result = await electronAPIModule.electronAPI.getCredential('NonExistent');
      expect(result.success).toBe(true);
      expect(result.username).toBeNull();
      expect(result.password).toBeNull();
    });

    it('deleteCredential removes stored credential', async () => {
      await electronAPIModule.electronAPI.saveCredential('TestTarget', 'u', 'p');
      const del = await electronAPIModule.electronAPI.deleteCredential('TestTarget');
      expect(del.success).toBe(true);
      const result = await electronAPIModule.electronAPI.getCredential('TestTarget');
      expect(result.username).toBeNull();
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
      await electronAPIModule.electronAPI.saveSiteConfig({ id: 's1', name: 'Old' });
      await electronAPIModule.electronAPI.saveSiteConfig({ id: 's1', name: 'New' });
      const result = await electronAPIModule.electronAPI.getSiteConfigs();
      expect(result.sites).toHaveLength(1);
      expect(result.sites![0].name).toBe('New');
    });

    it('deleteSiteConfig removes the config', async () => {
      await electronAPIModule.electronAPI.saveSiteConfig({ id: 's1', name: 'Site 1' });
      await electronAPIModule.electronAPI.deleteSiteConfig('s1');
      const result = await electronAPIModule.electronAPI.getSiteConfigs();
      expect(result.sites).toHaveLength(0);
    });
  });

  // ── Job profiles ───────────────────────────────────────────────────
  describe('job profile management (browser localStorage fallback)', () => {
    it('saveJobProfiles and getJobProfiles round-trip', async () => {
      const profiles = [{ category: 'Engineering', groups: ['g1'] }];
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

    it('getUserRole returns admin in browser mode', async () => {
      const result = await electronAPIModule.electronAPI.getUserRole();
      expect(result.role).toBe('admin');
    });

    it('setUserRole returns error in browser mode', async () => {
      const result = await electronAPIModule.electronAPI.setUserRole('operator');
      expect(result.success).toBe(false);
    });

    it('findStaleJiraTickets returns error in browser mode', async () => {
      const cfg = { url: 'x', email: 'y', apiToken: 'z' };
      const result = await electronAPIModule.electronAPI.findStaleJiraTickets(cfg, 48);
      expect(result.success).toBe(false);
    });
  });
});

