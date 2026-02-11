/**
 * Audit Logger — immutable audit trail for sensitive operations.
 * Writes to a separate audit log file from the general application log.
 *
 * Logged operations: MFA removal, user creation, contractor processing,
 * credential save/delete, and any future sensitive IPC handlers.
 */

import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import os from 'os';

export interface AuditEvent {
  timestamp: string;
  operation: string;
  operator: string;
  target: string;
  result: 'success' | 'failure';
  details: Record<string, unknown>;
}

const MAX_AUDIT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_ROTATED_FILES = 5;

class AuditLogger {
  private logDir = '';
  private auditFile = '';
  private initialized = false;

  /** Call after app.whenReady() */
  init(): void {
    try {
      this.logDir = path.join(app.getPath('userData'), 'logs');
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
      this.auditFile = path.join(this.logDir, 'adhelper-audit.log');
      this.initialized = true;
    } catch (err) {
      console.error('[AuditLogger] Failed to initialize:', err);
    }
  }

  /**
   * Record an audit event. This is append-only and should never be
   * suppressed by log-level settings.
   */
  log(event: Omit<AuditEvent, 'timestamp'>): void {
    const entry: AuditEvent = {
      timestamp: new Date().toISOString(),
      ...event,
    };

    const line = JSON.stringify(entry);
    console.log(`[AUDIT] ${line}`);

    if (this.initialized) {
      try {
        this.rotateIfNeeded();
        fs.appendFileSync(this.auditFile, line + '\n', 'utf8');
      } catch {
        // Never crash the app due to audit logging
      }
    }
  }

  /** Convenience: log the start of a sensitive operation */
  logStart(operation: string, target: string, details: Record<string, unknown> = {}): void {
    this.log({
      operation,
      operator: os.userInfo().username,
      target,
      result: 'success', // "started" is logged as success; failures update later
      details: { phase: 'start', ...details },
    });
  }

  /** Convenience: log the successful completion of a sensitive operation */
  logSuccess(operation: string, target: string, details: Record<string, unknown> = {}): void {
    this.log({
      operation,
      operator: os.userInfo().username,
      target,
      result: 'success',
      details: { phase: 'complete', ...details },
    });
  }

  /** Convenience: log a failed sensitive operation */
  logFailure(operation: string, target: string, error: string, details: Record<string, unknown> = {}): void {
    this.log({
      operation,
      operator: os.userInfo().username,
      target,
      result: 'failure',
      details: { phase: 'complete', error, ...details },
    });
  }

  private rotateIfNeeded(): void {
    try {
      if (!fs.existsSync(this.auditFile)) return;
      const stat = fs.statSync(this.auditFile);
      if (stat.size < MAX_AUDIT_SIZE_BYTES) return;

      for (let i = MAX_ROTATED_FILES; i >= 1; i--) {
        const older = `${this.auditFile}.${i}`;
        const newer = i === 1 ? this.auditFile : `${this.auditFile}.${i - 1}`;
        if (fs.existsSync(newer)) {
          if (i === MAX_ROTATED_FILES && fs.existsSync(older)) {
            fs.unlinkSync(older);
          }
          if (i === 1) {
            fs.renameSync(newer, older);
          } else if (fs.existsSync(newer)) {
            fs.renameSync(newer, older);
          }
        }
      }
    } catch {
      // Non-critical
    }
  }
}

const auditLogger = new AuditLogger();
export default auditLogger;

