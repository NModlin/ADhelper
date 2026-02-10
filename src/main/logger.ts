import fs from 'fs';
import path from 'path';
import { app } from 'electron';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MAX_LOG_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_ROTATED_FILES = 3;

class Logger {
  private logDir: string = '';
  private logFile: string = '';
  private minLevel: LogLevel = 'info';
  private initialized = false;

  /** Call after app.whenReady() so getPath is available */
  init(minLevel: LogLevel = 'info'): void {
    this.minLevel = minLevel;
    try {
      this.logDir = path.join(app.getPath('userData'), 'logs');
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
      this.logFile = path.join(this.logDir, 'adhelper-main.log');
      this.initialized = true;
      this.info('Logger initialized', { logDir: this.logDir, minLevel });
    } catch (err) {
      // Fall back to console-only if file logging fails
      console.error('[Logger] Failed to initialize file logging:', err);
    }
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.log('debug', message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log('warn', message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.log('error', message, meta);
  }

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[this.minLevel]) return;

    const timestamp = new Date().toISOString();
    const tag = level.toUpperCase().padEnd(5);
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    const line = `[${timestamp}] ${tag} ${message}${metaStr}`;

    // Always write to console
    switch (level) {
      case 'debug': console.debug(line); break;
      case 'info':  console.log(line);   break;
      case 'warn':  console.warn(line);  break;
      case 'error': console.error(line); break;
    }

    // Write to file
    if (this.initialized) {
      try {
        this.rotateIfNeeded();
        fs.appendFileSync(this.logFile, line + '\n', 'utf8');
      } catch {
        // Swallow file-write errors so logging never crashes the app
      }
    }
  }

  private rotateIfNeeded(): void {
    try {
      if (!fs.existsSync(this.logFile)) return;
      const stat = fs.statSync(this.logFile);
      if (stat.size < MAX_LOG_SIZE_BYTES) return;

      // Rotate: .log → .log.1 → .log.2 → .log.3 (delete oldest)
      for (let i = MAX_ROTATED_FILES; i >= 1; i--) {
        const older = `${this.logFile}.${i}`;
        const newer = i === 1 ? this.logFile : `${this.logFile}.${i - 1}`;
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
      // Rotation failure is non-critical
    }
  }
}

/** Singleton logger — import and use throughout the main process */
const logger = new Logger();
export default logger;

