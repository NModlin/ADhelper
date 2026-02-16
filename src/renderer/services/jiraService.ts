/**
 * DEPRECATED — Jira API calls are now routed through the main process via IPC.
 * See src/main/jiraHandler.ts for the implementation.
 *
 * This file is kept only for type exports used elsewhere.
 */

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

