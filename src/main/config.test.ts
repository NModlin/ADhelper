import { describe, it, expect, vi, beforeEach } from 'vitest';

let config: typeof import('./config').default;

beforeEach(async () => {
  vi.resetModules();
  // Clear all ADHELPER env vars before each test
  delete process.env.ADHELPER_LOG_LEVEL;
  delete process.env.ADHELPER_AD_TIMEOUT_MS;
  delete process.env.ADHELPER_PS_TIMEOUT_MS;
  delete process.env.ADHELPER_MAX_RETRIES;
  delete process.env.ADHELPER_RETRY_DELAY_MS;
  delete process.env.ADHELPER_DEV_HOST;
  delete process.env.NODE_ENV;
});

describe('config', () => {
  describe('default values', () => {
    it('has correct defaults when no env vars are set', async () => {
      const mod = await import('./config');
      config = mod.default;

      expect(config.isDev).toBe(false);
      expect(config.logLevel).toBe('info'); // production default
      expect(config.adConnectionTimeoutMs).toBe(15000);
      expect(config.psDefaultTimeoutMs).toBe(0);
      expect(config.maxPSRetries).toBe(2);
      expect(config.baseRetryDelayMs).toBe(1000);
      expect(config.devServerHost).toBe('localhost');
      expect(config.devServerPorts).toEqual([5173, 5174, 5175, 5176, 5177, 5178, 5179, 5180]);
    });
  });

  describe('isDev', () => {
    it('is true when NODE_ENV is development', async () => {
      process.env.NODE_ENV = 'development';
      const mod = await import('./config');
      expect(mod.default.isDev).toBe(true);
    });

    it('is false when NODE_ENV is production', async () => {
      process.env.NODE_ENV = 'production';
      const mod = await import('./config');
      expect(mod.default.isDev).toBe(false);
    });

    it('is false when NODE_ENV is not set', async () => {
      delete process.env.NODE_ENV;
      const mod = await import('./config');
      expect(mod.default.isDev).toBe(false);
    });
  });

  describe('logLevel', () => {
    it('defaults to debug in development mode', async () => {
      process.env.NODE_ENV = 'development';
      const mod = await import('./config');
      expect(mod.default.logLevel).toBe('debug');
    });

    it('defaults to info in production mode', async () => {
      process.env.NODE_ENV = 'production';
      const mod = await import('./config');
      expect(mod.default.logLevel).toBe('info');
    });

    it('reads from ADHELPER_LOG_LEVEL env var', async () => {
      process.env.ADHELPER_LOG_LEVEL = 'warn';
      const mod = await import('./config');
      expect(mod.default.logLevel).toBe('warn');
    });
  });

  describe('envInt parsing', () => {
    it('reads integer from env var', async () => {
      process.env.ADHELPER_AD_TIMEOUT_MS = '5000';
      const mod = await import('./config');
      expect(mod.default.adConnectionTimeoutMs).toBe(5000);
    });

    it('falls back to default on non-numeric value', async () => {
      process.env.ADHELPER_AD_TIMEOUT_MS = 'not-a-number';
      const mod = await import('./config');
      expect(mod.default.adConnectionTimeoutMs).toBe(15000);
    });

    it('parses zero correctly', async () => {
      process.env.ADHELPER_MAX_RETRIES = '0';
      const mod = await import('./config');
      expect(mod.default.maxPSRetries).toBe(0);
    });

    it('reads ADHELPER_RETRY_DELAY_MS', async () => {
      process.env.ADHELPER_RETRY_DELAY_MS = '2500';
      const mod = await import('./config');
      expect(mod.default.baseRetryDelayMs).toBe(2500);
    });
  });

  describe('envString parsing', () => {
    it('reads string from ADHELPER_DEV_HOST', async () => {
      process.env.ADHELPER_DEV_HOST = '0.0.0.0';
      const mod = await import('./config');
      expect(mod.default.devServerHost).toBe('0.0.0.0');
    });

    it('falls back to default when env var not set', async () => {
      delete process.env.ADHELPER_DEV_HOST;
      const mod = await import('./config');
      expect(mod.default.devServerHost).toBe('localhost');
    });
  });
});

