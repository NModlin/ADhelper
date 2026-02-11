/**
 * Centralized application configuration.
 * Reads from environment variables with sensible defaults for dev/prod.
 *
 * Usage:
 *   import config from './config';
 *   if (config.isDev) { ... }
 */

function envInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined) return fallback;
  const parsed = parseInt(raw, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function envString(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

/** Whether the app is running in development mode */
const isDev = process.env.NODE_ENV === 'development';

const config = {
  /** true when NODE_ENV === 'development' */
  isDev,

  /** Minimum log level — override with ADHELPER_LOG_LEVEL */
  logLevel: envString('ADHELPER_LOG_LEVEL', isDev ? 'debug' : 'info') as
    'debug' | 'info' | 'warn' | 'error',

  /** Vite dev server ports to try (first match wins) */
  devServerPorts: [5173, 5174, 5175, 5176, 5177, 5178, 5179, 5180],

  /** Default timeout for AD connection test (ms) — override with ADHELPER_AD_TIMEOUT_MS */
  adConnectionTimeoutMs: envInt('ADHELPER_AD_TIMEOUT_MS', 15000),

  /** Default timeout for PowerShell scripts (ms, 0 = no timeout) — override with ADHELPER_PS_TIMEOUT_MS */
  psDefaultTimeoutMs: envInt('ADHELPER_PS_TIMEOUT_MS', 0),

  /** Maximum number of retries for transient PS failures — override with ADHELPER_MAX_RETRIES */
  maxPSRetries: envInt('ADHELPER_MAX_RETRIES', 2),

  /** Base delay between retries in ms (doubles each attempt) — override with ADHELPER_RETRY_DELAY_MS */
  baseRetryDelayMs: envInt('ADHELPER_RETRY_DELAY_MS', 1000),

  /** Vite dev server host */
  devServerHost: envString('ADHELPER_DEV_HOST', 'localhost'),
} as const;

export default config;

