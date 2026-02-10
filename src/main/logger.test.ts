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

// We need a fresh logger instance for each test, so we use dynamic import
// after mocking. But since logger.ts exports a singleton, we'll re-import.
let logger: typeof import('./logger').default;

beforeEach(async () => {
  vi.resetModules();
  // Re-mock electron after resetModules
  vi.doMock('electron', () => ({
    app: {
      getPath: vi.fn().mockReturnValue(os.tmpdir()),
    },
  }));
  const mod = await import('./logger');
  logger = mod.default;
});

afterEach(() => {
  // Clean up any test log files
  const logDir = path.join(os.tmpdir(), 'logs');
  try {
    if (fs.existsSync(logDir)) {
      const files = fs.readdirSync(logDir);
      for (const file of files) {
        if (file.startsWith('adhelper-main')) {
          fs.unlinkSync(path.join(logDir, file));
        }
      }
    }
  } catch {
    // ignore cleanup errors
  }
});

describe('Logger', () => {
  it('initializes without throwing', () => {
    expect(() => logger.init('debug')).not.toThrow();
  });

  it('writes to console at info level', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.init('info');
    logger.info('test message');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('test message'));
    spy.mockRestore();
  });

  it('respects minimum log level', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.init('info');

    logger.debug('should be suppressed');
    expect(debugSpy).not.toHaveBeenCalled();

    logger.info('should appear');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('should appear'));

    debugSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('includes metadata in log output', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.init('info');
    logger.info('with meta', { key: 'value' });
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('"key":"value"'));
    spy.mockRestore();
  });

  it('writes to log file after initialization', () => {
    logger.init('info');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logger.warn('file test');
    warnSpy.mockRestore();

    const logFile = path.join(os.tmpdir(), 'logs', 'adhelper-main.log');
    expect(fs.existsSync(logFile)).toBe(true);
    const content = fs.readFileSync(logFile, 'utf8');
    expect(content).toContain('file test');
  });

  it('logs at all four levels', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    logger.init('debug');
    logger.debug('d');
    logger.info('i');
    logger.warn('w');
    logger.error('e');

    expect(debugSpy).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();

    debugSpy.mockRestore();
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});

