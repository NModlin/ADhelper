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

let auditLogger: typeof import('./auditLogger').default;

const logDir = path.join(os.tmpdir(), 'logs');
const auditFile = path.join(logDir, 'adhelper-audit.log');

function cleanAuditFiles() {
  try {
    if (fs.existsSync(logDir)) {
      const files = fs.readdirSync(logDir);
      for (const file of files) {
        if (file.startsWith('adhelper-audit')) {
          fs.unlinkSync(path.join(logDir, file));
        }
      }
    }
  } catch { /* ignore */ }
}

beforeEach(async () => {
  vi.resetModules();
  vi.doMock('electron', () => ({
    app: {
      getPath: vi.fn().mockReturnValue(os.tmpdir()),
    },
  }));
  cleanAuditFiles();
  const mod = await import('./auditLogger');
  auditLogger = mod.default;
});

afterEach(() => {
  cleanAuditFiles();
});

describe('AuditLogger', () => {
  describe('init()', () => {
    it('initializes without throwing', () => {
      expect(() => auditLogger.init()).not.toThrow();
    });

    it('creates log directory if it does not exist', () => {
      // Remove dir first
      try { fs.rmSync(logDir, { recursive: true }); } catch { /* ignore */ }
      auditLogger.init();
      expect(fs.existsSync(logDir)).toBe(true);
    });

    it('handles init failure gracefully', async () => {
      vi.resetModules();
      vi.doMock('electron', () => ({
        app: {
          getPath: vi.fn(() => { throw new Error('no path'); }),
        },
      }));
      const mod = await import('./auditLogger');
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => mod.default.init()).not.toThrow();
      spy.mockRestore();
    });
  });

  describe('log()', () => {
    it('writes JSON event to console', () => {
      auditLogger.init();
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      auditLogger.log({
        operation: 'test-op',
        operator: 'testuser',
        target: 'target1',
        result: 'success',
        details: { key: 'value' },
      });
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('[AUDIT]'));
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('test-op'));
      spy.mockRestore();
    });

    it('writes JSON line to audit file', () => {
      auditLogger.init();
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      auditLogger.log({
        operation: 'file-test',
        operator: 'testuser',
        target: 'target1',
        result: 'success',
        details: {},
      });
      spy.mockRestore();

      expect(fs.existsSync(auditFile)).toBe(true);
      const content = fs.readFileSync(auditFile, 'utf8');
      const parsed = JSON.parse(content.trim());
      expect(parsed.operation).toBe('file-test');
      expect(parsed.timestamp).toBeTruthy();
      expect(parsed.operator).toBe('testuser');
      expect(parsed.result).toBe('success');
    });

    it('does not throw when not initialized', () => {
      // Don't call init() — log should still not crash
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      expect(() => auditLogger.log({
        operation: 'no-init',
        operator: 'testuser',
        target: 'target1',
        result: 'success',
        details: {},
      })).not.toThrow();
      spy.mockRestore();
    });

    it('does not write to file when not initialized', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      auditLogger.log({
        operation: 'no-init',
        operator: 'testuser',
        target: 'target1',
        result: 'success',
        details: {},
      });
      spy.mockRestore();
      expect(fs.existsSync(auditFile)).toBe(false);
    });

    it('appends multiple events to the same file', () => {
      auditLogger.init();
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      auditLogger.log({ operation: 'op1', operator: 'u', target: 't', result: 'success', details: {} });
      auditLogger.log({ operation: 'op2', operator: 'u', target: 't', result: 'failure', details: {} });
      spy.mockRestore();

      const lines = fs.readFileSync(auditFile, 'utf8').trim().split('\n');
      expect(lines.length).toBe(2);
      expect(JSON.parse(lines[0]).operation).toBe('op1');
      expect(JSON.parse(lines[1]).operation).toBe('op2');
    });
  });

  describe('convenience methods', () => {
    it('logStart() logs with phase=start and result=success', () => {
      auditLogger.init();
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      auditLogger.logStart('create-user', 'john.doe', { extra: 'info' });
      spy.mockRestore();

      const content = fs.readFileSync(auditFile, 'utf8').trim();
      const parsed = JSON.parse(content);
      expect(parsed.operation).toBe('create-user');
      expect(parsed.target).toBe('john.doe');
      expect(parsed.result).toBe('success');
      expect(parsed.details.phase).toBe('start');
      expect(parsed.details.extra).toBe('info');
      expect(parsed.operator).toBe(os.userInfo().username);
    });

    it('logSuccess() logs with phase=complete and result=success', () => {
      auditLogger.init();
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      auditLogger.logSuccess('create-user', 'john.doe');
      spy.mockRestore();

      const parsed = JSON.parse(fs.readFileSync(auditFile, 'utf8').trim());
      expect(parsed.result).toBe('success');
      expect(parsed.details.phase).toBe('complete');
    });

    it('logFailure() logs with phase=complete and result=failure', () => {
      auditLogger.init();
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      auditLogger.logFailure('create-user', 'john.doe', 'AD timeout');
      spy.mockRestore();

      const parsed = JSON.parse(fs.readFileSync(auditFile, 'utf8').trim());
      expect(parsed.result).toBe('failure');
      expect(parsed.details.phase).toBe('complete');
      expect(parsed.details.error).toBe('AD timeout');
    });
  });

  describe('log rotation', () => {
    it('rotates log file when it exceeds 10MB', () => {
      auditLogger.init();
      // Create a file just over 10MB
      const bigData = 'x'.repeat(10 * 1024 * 1024 + 1);
      fs.writeFileSync(auditFile, bigData, 'utf8');

      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      auditLogger.log({ operation: 'after-rotate', operator: 'u', target: 't', result: 'success', details: {} });
      spy.mockRestore();

      // The old file should have been rotated to .1
      expect(fs.existsSync(`${auditFile}.1`)).toBe(true);
      // The new file should contain the new event
      const content = fs.readFileSync(auditFile, 'utf8');
      expect(content).toContain('after-rotate');
    });

    it('does not rotate when file is under 10MB', () => {
      auditLogger.init();
      const smallData = 'x'.repeat(100);
      fs.writeFileSync(auditFile, smallData, 'utf8');

      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      auditLogger.log({ operation: 'no-rotate', operator: 'u', target: 't', result: 'success', details: {} });
      spy.mockRestore();

      expect(fs.existsSync(`${auditFile}.1`)).toBe(false);
    });
  });
});

