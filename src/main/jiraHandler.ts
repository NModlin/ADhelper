/**
 * Jira IPC Handlers — routes all Jira API calls through the main process.
 *
 * This solves:
 *   C1 – Buffer.from() works in Node.js (main process)
 *   C3 – HTTP requests from main process bypass renderer CSP
 *   I2 – API tokens never reach the renderer
 *   I3 – Audit logging for all Jira operations
 *   I4 – RBAC for bulk operations
 */

import { ipcMain } from 'electron';
import axios, { AxiosInstance } from 'axios';
import logger from './logger';
import auditLogger from './auditLogger';
import roleManager from './roleManager';
import { rateLimited } from './rateLimiter';

export interface JiraConfig {
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

function createJiraClient(config: JiraConfig): AxiosInstance {
  const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
  return axios.create({
    baseURL: `${config.url}/rest/api/3`,
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

export function registerJiraHandlers(): void {
  // ── Find Stale Tickets ──────────────────────────────────────────────────
  ipcMain.handle(
    'jira-find-stale-tickets',
    rateLimited('jira-find-stale-tickets', async (_event, config: JiraConfig, hoursThreshold: number = 48) => {
      logger.info('IPC: jira-find-stale-tickets', { url: config.url, hoursThreshold });
      auditLogger.logStart('jira-find-stale-tickets', config.url, { hoursThreshold });

      try {
        const client = createJiraClient(config);
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

        auditLogger.logSuccess('jira-find-stale-tickets', config.url, { ticketCount: tickets.length });
        return { success: true, tickets };
      } catch (err: any) {
        const msg = err.response?.data?.errorMessages?.[0] || err.message || 'Failed to fetch tickets';
        auditLogger.logFailure('jira-find-stale-tickets', config.url, msg);
        return { success: false, error: msg };
      }
    }),
  );

  // ── Bulk Update Tickets ─────────────────────────────────────────────────
  ipcMain.handle(
    'jira-bulk-update',
    rateLimited('jira-bulk-update', async (_event, config: JiraConfig, tickets: JiraTicket[], action: string, value: string) => {
      // RBAC: bulk operations require admin role
      if (!roleManager.hasPermission('jira-bulk-update')) {
        return { success: false, error: 'Permission denied. Admin role required for Jira bulk operations.' };
      }

      logger.info('IPC: jira-bulk-update', { url: config.url, ticketCount: tickets.length, action });
      auditLogger.logStart('jira-bulk-update', config.url, { ticketCount: tickets.length, action });

      const client = createJiraClient(config);
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
        auditLogger.logFailure('jira-bulk-update', config.url, `${results.failed} tickets failed`, { results });
      } else {
        auditLogger.logSuccess('jira-bulk-update', config.url, { results });
      }
      return { success: true, results };
    }),
  );
}

