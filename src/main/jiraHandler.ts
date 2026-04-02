/**
 * Jira IPC Handlers — routes all Jira API calls through the main process.
 *
 * Security guarantees:
 *   C1 – API tokens are retrieved from Windows Credential Manager internally;
 *         they never travel over IPC or enter renderer memory.
 *   C3 – HTTP requests originate from the main process, bypassing renderer CSP.
 *   I3 – Audit logging for all Jira operations.
 *   I4 – RBAC: bulk operations require admin role.
 */

import { ipcMain, app, Notification, BrowserWindow } from 'electron';
import axios, { AxiosInstance } from 'axios';
import fs from 'fs';
import path from 'path';
import logger from './logger';
import auditLogger from './auditLogger';
import roleManager from './roleManager';
import { rateLimited } from './rateLimiter';
import config from './config';

/**
 * Callback injected by main.ts at startup so jiraHandler can read credentials
 * from Windows Credential Manager without creating a circular import.
 */
export type CredentialFetcher = (target: string) => Promise<{
  success: boolean;
  username?: string | null;
  password?: string | null;
  error?: string;
}>;

/** Internal-only: fully resolved Jira connection config, including the secret token. */
interface JiraCredentials {
  url: string;
  email: string;
  apiToken: string;
}

export interface JiraTicket {
  key: string;
  summary: string;
  status: string;
  lastUpdated: string;
  assignee: string;
  updated: string;
}

function createJiraClient(creds: JiraCredentials): AxiosInstance {
  const auth = Buffer.from(`${creds.email}:${creds.apiToken}`).toString('base64');
  return axios.create({
    baseURL: `${creds.url}/rest/api/3`,
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
  });
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

export function registerJiraHandlers(getCredential: CredentialFetcher): void {
  /**
   * Retrieve and parse Jira credentials from Windows Credential Manager.
   * The credential is stored with username = "url|email" and password = apiToken.
   * Returns null when credentials are absent or malformed.
   */
  async function loadJiraCredentials(): Promise<JiraCredentials | null> {
    const result = await getCredential('ADHelper_Jira');
    if (!result.success || !result.username || !result.password) {
      return null;
    }
    const parts = result.username.split('|');
    const url = parts[0] || '';
    const email = parts[1] || '';
    if (!url || !email) return null;
    return { url, email, apiToken: result.password };
  }

  // ── Find Stale Tickets ──────────────────────────────────────────────────
  ipcMain.handle(
    'jira-find-stale-tickets',
    rateLimited('jira-find-stale-tickets', async (_event, hoursThreshold: number = 48) => {
      const creds = await loadJiraCredentials();
      if (!creds) {
        logger.warn('IPC: jira-find-stale-tickets — credentials not configured');
        return { success: false, error: 'Jira credentials not configured. Please set them in Settings.' };
      }

      logger.info('IPC: jira-find-stale-tickets', { url: creds.url, hoursThreshold });
      auditLogger.logStart('jira-find-stale-tickets', creds.url, { hoursThreshold });

      try {
        const client = createJiraClient(creds);
        const cutoffDate = new Date();
        cutoffDate.setHours(cutoffDate.getHours() - hoursThreshold);
        const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
        const jql = `updated < "${cutoffDateStr}" AND status != Done AND status != Closed ORDER BY updated ASC`;

        const response = await client.get('/search', {
          params: { jql, fields: 'summary,status,updated,assignee', maxResults: 100 },
        });

        const tickets: JiraTicket[] = response.data.issues.map((issue: any) => ({
          key: issue.key,
          summary: issue.fields.summary,
          status: issue.fields.status.name,
          lastUpdated: formatDate(issue.fields.updated),
          assignee: issue.fields.assignee?.displayName || 'Unassigned',
          updated: issue.fields.updated,
        }));

        auditLogger.logSuccess('jira-find-stale-tickets', creds.url, { ticketCount: tickets.length });
        return { success: true, tickets };
      } catch (err: any) {
        const msg = err.response?.data?.errorMessages?.[0] || err.message || 'Failed to fetch tickets';
        auditLogger.logFailure('jira-find-stale-tickets', creds.url, msg);
        return { success: false, error: msg };
      }
    }),
  );

  // ── Find Site Tickets ───────────────────────────────────────────────────
  // Returns open tickets from the Jira projects mapped to the user's responsible sites.
  // projectKeys: array of Jira project keys (e.g. ["ORL", "PHX"])
  ipcMain.handle(
    'jira-find-site-tickets',
    rateLimited('jira-find-site-tickets', async (_event, projectKeys: string[]) => {
      if (!Array.isArray(projectKeys) || projectKeys.length === 0) {
        return { success: true, tickets: [] };
      }

      // Sanitise: allow only alphanumeric project keys (standard Jira format)
      const safe = projectKeys.filter(k => /^[A-Za-z0-9_]{1,20}$/.test(k));
      if (safe.length === 0) {
        logger.warn('IPC: jira-find-site-tickets — all project keys rejected as invalid');
        return { success: false, error: 'No valid Jira project keys provided.' };
      }

      const creds = await loadJiraCredentials();
      if (!creds) {
        logger.warn('IPC: jira-find-site-tickets — credentials not configured');
        return { success: false, error: 'Jira credentials not configured. Please set them in Settings.' };
      }

      logger.info('IPC: jira-find-site-tickets', { url: creds.url, projectKeys: safe });
      auditLogger.logStart('jira-find-site-tickets', creds.url, { projectKeys: safe });

      try {
        const client = createJiraClient(creds);
        const projectList = safe.map(k => `"${k}"`).join(',');
        const jql = `project in (${projectList}) AND status != Done AND status != Closed ORDER BY updated DESC`;

        const response = await client.get('/search', {
          params: { jql, fields: 'summary,status,updated,assignee,project', maxResults: 200 },
        });

        const tickets: JiraTicket[] = response.data.issues.map((issue: any) => ({
          key: issue.key,
          summary: issue.fields.summary,
          status: issue.fields.status.name,
          lastUpdated: formatDate(issue.fields.updated),
          assignee: issue.fields.assignee?.displayName || 'Unassigned',
          updated: issue.fields.updated,
        }));

        auditLogger.logSuccess('jira-find-site-tickets', creds.url, { ticketCount: tickets.length });
        return { success: true, tickets };
      } catch (err: any) {
        const msg = err.response?.data?.errorMessages?.[0] || err.message || 'Failed to fetch site tickets';
        auditLogger.logFailure('jira-find-site-tickets', creds.url, msg);
        return { success: false, error: msg };
      }
    }),
  );

  // ── Bulk Update Tickets ─────────────────────────────────────────────────
  ipcMain.handle(
    'jira-bulk-update',
    rateLimited('jira-bulk-update', async (_event, tickets: JiraTicket[], action: string, value: string) => {
      // RBAC: bulk operations require admin role
      if (!roleManager.hasPermission('jira-bulk-update')) {
        return { success: false, error: 'Permission denied. Admin role required for Jira bulk operations.' };
      }

      const creds = await loadJiraCredentials();
      if (!creds) {
        logger.warn('IPC: jira-bulk-update — credentials not configured');
        return { success: false, error: 'Jira credentials not configured. Please set them in Settings.' };
      }

      logger.info('IPC: jira-bulk-update', { url: creds.url, ticketCount: tickets.length, action });
      auditLogger.logStart('jira-bulk-update', creds.url, { ticketCount: tickets.length, action });

      const client = createJiraClient(creds);
      const results = { success: 0, failed: 0, errors: [] as string[] };

      for (const ticket of tickets) {
        try {
          switch (action) {
            case 'comment':
              await client.post(`/issue/${ticket.key}/comment`, {
                body: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: value }] }] },
              });
              break;
            case 'status':
              await client.post(`/issue/${ticket.key}/transitions`, { transition: { id: value } });
              break;
            case 'assignee':
              await client.put(`/issue/${ticket.key}/assignee`, { accountId: value });
              break;
          }
          results.success++;
        } catch (err: any) {
          results.failed++;
          const msg = err.response?.data?.errorMessages?.[0] || err.message || 'Unknown error';
          results.errors.push(`${ticket.key}: ${msg}`);
        }
      }

      if (results.failed > 0) {
        auditLogger.logFailure('jira-bulk-update', creds.url, `${results.failed} tickets failed`, { results });
      } else {
        auditLogger.logSuccess('jira-bulk-update', creds.url, { results });
      }
      return { success: true, results };
    }),
  );
}

// ── Site Ticket Background Poller ─────────────────────────────────────────────
// Runs in the main process independently of renderer navigation.
// Polls at the interval defined by config.siteTicketPollIntervalMs (default 5 min).

/** Site config shape (mirrors the interface in main.ts) */
interface SiteConfig {
  id: string;
  name: string;
  groups: string[];
  jiraProjectKey?: string;
}

let pollerTimer: NodeJS.Timeout | null = null;

/** Keys of tickets seen in the previous poll — used to detect new arrivals. */
const seenTicketKeys = new Set<string>();

/**
 * Start the background poller.
 * @param getCredential — the same CredentialFetcher passed to registerJiraHandlers
 */
export function startSiteTicketPoller(getCredential: CredentialFetcher): void {
  if (pollerTimer) return; // already running

  const poll = async () => {
    try {
      // 1. Load responsible site IDs
      const respPath = path.join(app.getPath('userData'), 'responsible-sites.json');
      if (!fs.existsSync(respPath)) return;
      const responsibleIds: string[] = JSON.parse(fs.readFileSync(respPath, 'utf8'));
      if (responsibleIds.length === 0) return;

      // 2. Load all site configs and filter to responsible ones with a Jira project key
      const sitePath = path.join(app.getPath('userData'), 'site-config.json');
      if (!fs.existsSync(sitePath)) return;
      const allSites: SiteConfig[] = JSON.parse(fs.readFileSync(sitePath, 'utf8'));
      const projectKeys = allSites
        .filter(s => responsibleIds.includes(s.id) && s.jiraProjectKey)
        .map(s => s.jiraProjectKey as string);
      if (projectKeys.length === 0) return;

      // 3. Load Jira credentials
      const credResult = await getCredential('ADHelper_Jira');
      if (!credResult.success || !credResult.username || !credResult.password) return;
      const parts = credResult.username.split('|');
      const url = parts[0] || '';
      const email = parts[1] || '';
      if (!url || !email) return;
      const creds: JiraCredentials = { url, email, apiToken: credResult.password };

      // 4. Fetch open tickets
      const client = createJiraClient(creds);
      const projectList = projectKeys.map(k => `"${k}"`).join(',');
      const jql = `project in (${projectList}) AND status != Done AND status != Closed ORDER BY updated DESC`;
      const response = await client.get('/search', {
        params: { jql, fields: 'summary,status,updated,assignee,project', maxResults: 200 },
      });

      const tickets: JiraTicket[] = response.data.issues.map((issue: any) => ({
        key: issue.key,
        summary: issue.fields.summary,
        status: issue.fields.status.name,
        lastUpdated: formatDate(issue.fields.updated),
        assignee: issue.fields.assignee?.displayName || 'Unassigned',
        updated: issue.fields.updated,
      }));

      // 5. Detect new tickets (not seen in previous poll)
      const currentKeys = new Set(tickets.map(t => t.key));
      const newTickets = tickets.filter(t => !seenTicketKeys.has(t.key));

      // Update the seen set
      seenTicketKeys.clear();
      currentKeys.forEach(k => seenTicketKeys.add(k));

      // 6. Fire OS notification for each new ticket (max 3 to avoid notification spam)
      if (newTickets.length > 0 && Notification.isSupported()) {
        const toNotify = newTickets.slice(0, 3);
        for (const ticket of toNotify) {
          new Notification({
            title: `New Site Ticket: ${ticket.key}`,
            body: `${ticket.summary}\nAssignee: ${ticket.assignee}`,
            silent: false,
          }).show();
        }
        if (newTickets.length > 3) {
          new Notification({
            title: 'ADHelper — Site Tickets',
            body: `${newTickets.length - 3} more new site tickets found.`,
            silent: true,
          }).show();
        }
        logger.info('Site ticket poller: notified new tickets', { count: newTickets.length });
      }

      // 7. Push total count to renderer so the tab badge updates live
      const win = BrowserWindow.getAllWindows()[0];
      if (win && !win.isDestroyed()) {
        win.webContents.send('site-ticket-count', tickets.length);
      }
    } catch (err: any) {
      // Polling errors are non-fatal — log and wait for next cycle
      logger.debug('Site ticket poller error (non-fatal)', { message: err?.message });
    }
  };

  // Run immediately on start, then on the configured interval
  poll();
  pollerTimer = setInterval(poll, config.siteTicketPollIntervalMs);
  logger.info('Site ticket poller started', { intervalMs: config.siteTicketPollIntervalMs });
}

/** Stop the background poller — call on app quit. */
export function stopSiteTicketPoller(): void {
  if (pollerTimer) {
    clearInterval(pollerTimer);
    pollerTimer = null;
    logger.info('Site ticket poller stopped');
  }
}

