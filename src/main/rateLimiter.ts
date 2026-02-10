/**
 * Rate Limiter for IPC operations.
 * Prevents duplicate concurrent requests (e.g. double-clicks, rapid retries).
 * Each channel can only have one in-flight operation at a time.
 */

import logger from './logger';

const inFlightOps = new Set<string>();

/**
 * Wraps an IPC handler to ensure only one call per channel runs at a time.
 * Returns a "busy" error if a duplicate request arrives while one is in-flight.
 */
export function rateLimited<T>(
  channel: string,
  handler: (...args: any[]) => Promise<T>,
): (...args: any[]) => Promise<T | { success: false; error: string }> {
  return async (...args: any[]) => {
    if (inFlightOps.has(channel)) {
      logger.warn(`Rate limited: ${channel} — operation already in progress`);
      return { success: false, error: 'Operation already in progress. Please wait for it to complete.' };
    }
    inFlightOps.add(channel);
    try {
      return await handler(...args);
    } finally {
      inFlightOps.delete(channel);
    }
  };
}

/** Exposed for testing — returns the current set of in-flight operations */
export function _getInFlightOps(): Set<string> {
  return inFlightOps;
}

