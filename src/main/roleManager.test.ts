import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Mock electron's app module
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue(os.tmpdir()),
  },
}));

let roleManager: typeof import('./roleManager').default;

const configPath = path.join(os.tmpdir(), 'rbac-config.json');

beforeEach(async () => {
  vi.resetModules();
  vi.doMock('electron', () => ({
    app: {
      getPath: vi.fn().mockReturnValue(os.tmpdir()),
    },
  }));
  // Clean up config file before each test
  try { fs.unlinkSync(configPath); } catch { /* ignore */ }

  const mod = await import('./roleManager');
  roleManager = mod.default;
});

afterEach(() => {
  try { fs.unlinkSync(configPath); } catch { /* ignore */ }
});

describe('RoleManager', () => {
  describe('init()', () => {
    it('initializes without throwing', () => {
      expect(() => roleManager.init()).not.toThrow();
    });

    it('defaults to admin role when no config file exists', () => {
      roleManager.init();
      expect(roleManager.getRole()).toBe('admin');
    });

    it('loads existing role from config file', () => {
      fs.writeFileSync(configPath, JSON.stringify({
        role: 'operator',
        configuredBy: 'testuser',
        configuredAt: '2026-01-01T00:00:00.000Z',
      }), 'utf8');
      roleManager.init();
      expect(roleManager.getRole()).toBe('operator');
    });

    it('defaults to admin when config file has invalid role', () => {
      fs.writeFileSync(configPath, JSON.stringify({
        role: 'superadmin',
        configuredBy: 'testuser',
        configuredAt: '2026-01-01T00:00:00.000Z',
      }), 'utf8');
      roleManager.init();
      expect(roleManager.getRole()).toBe('admin');
    });

    it('defaults to admin when config file is corrupted JSON', () => {
      fs.writeFileSync(configPath, 'not valid json{{{', 'utf8');
      roleManager.init();
      expect(roleManager.getRole()).toBe('admin');
    });

    it('defaults to admin when init fails (e.g., bad path)', async () => {
      vi.resetModules();
      vi.doMock('electron', () => ({
        app: {
          getPath: vi.fn(() => { throw new Error('no path'); }),
        },
      }));
      const mod = await import('./roleManager');
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mod.default.init();
      expect(mod.default.getRole()).toBe('admin');
      spy.mockRestore();
    });
  });

  describe('setRole()', () => {
    it('sets role to operator and persists to file', () => {
      roleManager.init();
      const config = roleManager.setRole('operator');
      expect(config.role).toBe('operator');
      expect(roleManager.getRole()).toBe('operator');

      // Verify file was written
      const saved = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      expect(saved.role).toBe('operator');
      expect(saved.configuredBy).toBe(os.userInfo().username);
      expect(saved.configuredAt).toBeTruthy();
    });

    it('sets role back to admin', () => {
      roleManager.init();
      roleManager.setRole('operator');
      expect(roleManager.getRole()).toBe('operator');
      roleManager.setRole('admin');
      expect(roleManager.getRole()).toBe('admin');
    });

    it('throws when file write fails', async () => {
      vi.resetModules();
      vi.doMock('electron', () => ({
        app: {
          getPath: vi.fn().mockReturnValue('/nonexistent/impossible/path'),
        },
      }));
      const mod = await import('./roleManager');
      mod.default.init();
      expect(() => mod.default.setRole('operator')).toThrow('Failed to save role configuration');
    });
  });

  describe('hasPermission()', () => {
    it('admin has permission for all operations', () => {
      roleManager.init();
      expect(roleManager.hasPermission('create-new-user')).toBe(true);
      expect(roleManager.hasPermission('process-contractor-account')).toBe(true);
      expect(roleManager.hasPermission('process-bulk-users')).toBe(true);
      expect(roleManager.hasPermission('set-user-role')).toBe(true);
      expect(roleManager.hasPermission('jira-bulk-update')).toBe(true);
      expect(roleManager.hasPermission('some-other-operation')).toBe(true);
    });

    it('operator is denied admin-only operations', () => {
      roleManager.init();
      roleManager.setRole('operator');
      expect(roleManager.hasPermission('create-new-user')).toBe(false);
      expect(roleManager.hasPermission('process-contractor-account')).toBe(false);
      expect(roleManager.hasPermission('process-bulk-users')).toBe(false);
      expect(roleManager.hasPermission('set-user-role')).toBe(false);
      expect(roleManager.hasPermission('jira-bulk-update')).toBe(false);
    });

    it('operator is allowed standard operations', () => {
      roleManager.init();
      roleManager.setRole('operator');
      expect(roleManager.hasPermission('process-user')).toBe(true);
      expect(roleManager.hasPermission('remove-mfa')).toBe(true);
      expect(roleManager.hasPermission('test-ad-connection')).toBe(true);
    });
  });

  describe('getConfig()', () => {
    it('returns config with current role', () => {
      roleManager.init();
      const config = roleManager.getConfig();
      expect(config.role).toBe('admin');
      expect(config.configuredBy).toBeTruthy();
      expect(config.configuredAt).toBeTruthy();
    });

    it('returns saved config metadata after setRole', () => {
      roleManager.init();
      roleManager.setRole('operator');
      const config = roleManager.getConfig();
      expect(config.role).toBe('operator');
      expect(config.configuredBy).toBe(os.userInfo().username);
    });
  });

  describe('getAdminOnlyOperations()', () => {
    it('returns array of admin-only operation names', () => {
      roleManager.init();
      const ops = roleManager.getAdminOnlyOperations();
      expect(ops).toContain('create-new-user');
      expect(ops).toContain('process-contractor-account');
      expect(ops).toContain('process-bulk-users');
      expect(ops).toContain('set-user-role');
      expect(ops).toContain('jira-bulk-update');
      expect(ops.length).toBe(5);
    });
  });
});

