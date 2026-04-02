/**
 * Role-Based Access Control (RBAC) Manager
 *
 * Two permission tiers:
 *   - admin:    Full access to all operations
 *   - operator: Standard operations only (process user, MFA removal, AD test)
 *
 * Role is stored in %APPDATA%/adhelper-app/rbac-config.json
 * Default role is "operator" (fail-secure). Admin access requires explicit configuration.
 */

import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import os from 'os';
import logger from './logger';

export type UserRole = 'admin' | 'operator';

export interface RBACConfig {
  role: UserRole;
  configuredBy: string;
  configuredAt: string;
}

/** Operations that require admin role */
const ADMIN_ONLY_OPERATIONS = new Set([
  'create-new-user',
  'process-contractor-account',
  'process-bulk-users',
  'update-display-name',
  'set-user-role',
  'jira-bulk-update',
]);

class RoleManager {
  private configPath = '';
  private cachedRole: UserRole = 'operator';

  /** Call after app.whenReady() */
  init(): void {
    try {
      const userData = app.getPath('userData');
      this.configPath = path.join(userData, 'rbac-config.json');
      this.loadRole();
    } catch (err) {
      console.error('[RoleManager] Failed to initialize:', err);
      // Default to operator (fail-secure) when init fails
      this.cachedRole = 'operator';
    }
  }

  /** Get the current user role */
  getRole(): UserRole {
    return this.cachedRole;
  }

  /** Set the user role (admin only) */
  setRole(role: UserRole): RBACConfig {
    const config: RBACConfig = {
      role,
      configuredBy: os.userInfo().username,
      configuredAt: new Date().toISOString(),
    };

    try {
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf8');
      this.cachedRole = role;
    } catch (err) {
      console.error('[RoleManager] Failed to save role:', err);
      throw new Error('Failed to save role configuration');
    }

    return config;
  }

  /** Check if the current role has permission for an operation */
  hasPermission(operation: string): boolean {
    if (this.cachedRole === 'admin') return true;
    return !ADMIN_ONLY_OPERATIONS.has(operation);
  }

  /** Get the full RBAC config */
  getConfig(): RBACConfig {
    return {
      role: this.cachedRole,
      configuredBy: this.getStoredConfig()?.configuredBy ?? os.userInfo().username,
      configuredAt: this.getStoredConfig()?.configuredAt ?? new Date().toISOString(),
    };
  }

  /** Get list of admin-only operations (for UI) */
  getAdminOnlyOperations(): string[] {
    return Array.from(ADMIN_ONLY_OPERATIONS);
  }

  private loadRole(): void {
    const config = this.getStoredConfig();
    if (config && (config.role === 'admin' || config.role === 'operator')) {
      this.cachedRole = config.role;
    } else {
      // Default to operator (fail-secure) — admin requires explicit configuration
      logger.warn('[RoleManager] No valid RBAC config found — defaulting to operator role (fail-secure)');
      this.cachedRole = 'operator';
    }
  }

  private getStoredConfig(): RBACConfig | null {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf8');
        return JSON.parse(data) as RBACConfig;
      }
    } catch {
      // Corrupted file — fall back to default
    }
    return null;
  }
}

const roleManager = new RoleManager();
export default roleManager;

