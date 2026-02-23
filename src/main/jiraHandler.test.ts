import { describe, it, expect, vi, beforeEach } from 'vitest';

// Capture handlers registered via ipcMain.handle
const registeredHandlers: Record<string, (...args: any[]) => any> = {};

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: any) => {
      registeredHandlers[channel] = handler;
    }),
  },
}));

vi.mock('./logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), init: vi.fn() },
}));

vi.mock('./auditLogger', () => ({
  default: {
    logStart: vi.fn(),
    logSuccess: vi.fn(),
    logFailure: vi.fn(),
    log: vi.fn(),
    init: vi.fn(),
  },
}));

// Use vi.hoisted so these are available in vi.mock factories (which are hoisted)
const { mockHasPermission, mockGet, mockPost, mockPut } = vi.hoisted(() => ({
  mockHasPermission: vi.fn().mockReturnValue(true),
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
}));

vi.mock('./roleManager', () => ({
  default: {
    hasPermission: mockHasPermission,
    init: vi.fn(),
    getRole: vi.fn().mockReturnValue('admin'),
  },
}));

// Make rateLimited a pass-through so we test the actual handler logic
vi.mock('./rateLimiter', () => ({
  rateLimited: (_channel: string, handler: any) => handler,
}));

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: mockGet,
      post: mockPost,
      put: mockPut,
    })),
  },
}));

import { registerJiraHandlers } from './jiraHandler';
import auditLogger from './auditLogger';

const mockConfig = { url: 'https://test.atlassian.net', email: 'test@example.com', apiToken: 'token123' };

beforeEach(() => {
  vi.clearAllMocks();
  mockHasPermission.mockReturnValue(true);
  // Clear and re-register handlers
  Object.keys(registeredHandlers).forEach(k => delete registeredHandlers[k]);
  registerJiraHandlers();
});

describe('jiraHandler', () => {
  describe('registerJiraHandlers()', () => {
    it('registers jira-find-stale-tickets handler', () => {
      expect(registeredHandlers['jira-find-stale-tickets']).toBeDefined();
    });

    it('registers jira-bulk-update handler', () => {
      expect(registeredHandlers['jira-bulk-update']).toBeDefined();
    });
  });

  describe('jira-find-stale-tickets', () => {
    it('returns tickets on success', async () => {
      mockGet.mockResolvedValue({
        data: {
          issues: [
            {
              key: 'TEST-1',
              fields: {
                summary: 'Test ticket',
                status: { name: 'Open' },
                updated: '2026-02-10T00:00:00.000Z',
                assignee: { displayName: 'John Doe' },
              },
            },
          ],
        },
      });

      const handler = registeredHandlers['jira-find-stale-tickets'];
      const result = await handler({}, mockConfig, 48);

      expect(result.success).toBe(true);
      expect(result.tickets).toHaveLength(1);
      expect(result.tickets[0].key).toBe('TEST-1');
      expect(result.tickets[0].summary).toBe('Test ticket');
      expect(result.tickets[0].status).toBe('Open');
      expect(result.tickets[0].assignee).toBe('John Doe');
    });

    it('handles unassigned tickets', async () => {
      mockGet.mockResolvedValue({
        data: {
          issues: [{
            key: 'TEST-2',
            fields: { summary: 'No assignee', status: { name: 'Open' }, updated: '2026-02-10T00:00:00.000Z', assignee: null },
          }],
        },
      });

      const result = await registeredHandlers['jira-find-stale-tickets']({}, mockConfig, 48);
      expect(result.tickets[0].assignee).toBe('Unassigned');
    });

    it('logs audit events on success', async () => {
      mockGet.mockResolvedValue({ data: { issues: [] } });
      await registeredHandlers['jira-find-stale-tickets']({}, mockConfig, 48);

      expect(auditLogger.logStart).toHaveBeenCalledWith('jira-find-stale-tickets', mockConfig.url, expect.any(Object));
      expect(auditLogger.logSuccess).toHaveBeenCalledWith('jira-find-stale-tickets', mockConfig.url, expect.any(Object));
    });

    it('returns error on API failure', async () => {
      mockGet.mockRejectedValue({ message: 'Network error' });
      const result = await registeredHandlers['jira-find-stale-tickets']({}, mockConfig, 48);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(auditLogger.logFailure).toHaveBeenCalled();
    });

    it('extracts Jira error messages from response', async () => {
      mockGet.mockRejectedValue({ response: { data: { errorMessages: ['Bad JQL query'] } } });
      const result = await registeredHandlers['jira-find-stale-tickets']({}, mockConfig, 48);
      expect(result.error).toBe('Bad JQL query');
    });
  });

  describe('jira-bulk-update', () => {
    const tickets = [
      { key: 'TEST-1', summary: 'Ticket 1', status: 'Open', lastUpdated: '2 days ago', assignee: 'John', updated: '2026-02-14' },
      { key: 'TEST-2', summary: 'Ticket 2', status: 'Open', lastUpdated: '3 days ago', assignee: 'Jane', updated: '2026-02-13' },
    ];

    it('adds comments to all tickets', async () => {
      mockPost.mockResolvedValue({});
      const result = await registeredHandlers['jira-bulk-update']({}, mockConfig, tickets, 'comment', 'Auto update');

      expect(result.success).toBe(true);
      expect(result.results.success).toBe(2);
      expect(result.results.failed).toBe(0);
      expect(mockPost).toHaveBeenCalledTimes(2);
    });

    it('transitions ticket status', async () => {
      mockPost.mockResolvedValue({});
      await registeredHandlers['jira-bulk-update']({}, mockConfig, tickets, 'status', '31');

      expect(mockPost).toHaveBeenCalledWith('/issue/TEST-1/transitions', { transition: { id: '31' } });
      expect(mockPost).toHaveBeenCalledWith('/issue/TEST-2/transitions', { transition: { id: '31' } });
    });

    it('reassigns tickets', async () => {
      mockPut.mockResolvedValue({});
      await registeredHandlers['jira-bulk-update']({}, mockConfig, tickets, 'assignee', 'account-123');

      expect(mockPut).toHaveBeenCalledWith('/issue/TEST-1/assignee', { accountId: 'account-123' });
      expect(mockPut).toHaveBeenCalledWith('/issue/TEST-2/assignee', { accountId: 'account-123' });
    });

    it('returns permission denied for operators', async () => {
      mockHasPermission.mockReturnValue(false);
      const result = await registeredHandlers['jira-bulk-update']({}, mockConfig, tickets, 'comment', 'text');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Permission denied');
      expect(mockPost).not.toHaveBeenCalled();
    });

    it('handles partial failures gracefully', async () => {
      mockPost
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce({ message: 'Ticket not found' });

      const result = await registeredHandlers['jira-bulk-update']({}, mockConfig, tickets, 'comment', 'text');

      expect(result.success).toBe(true);
      expect(result.results.success).toBe(1);
      expect(result.results.failed).toBe(1);
      expect(result.results.errors).toHaveLength(1);
      expect(result.results.errors[0]).toContain('TEST-2');
    });

    it('logs audit start and success on full success', async () => {
      mockPost.mockResolvedValue({});
      await registeredHandlers['jira-bulk-update']({}, mockConfig, tickets, 'comment', 'text');

      expect(auditLogger.logStart).toHaveBeenCalledWith('jira-bulk-update', mockConfig.url, expect.objectContaining({ ticketCount: 2 }));
      expect(auditLogger.logSuccess).toHaveBeenCalled();
    });

    it('logs audit failure when some tickets fail', async () => {
      mockPost.mockRejectedValue({ message: 'error' });
      await registeredHandlers['jira-bulk-update']({}, mockConfig, tickets, 'comment', 'text');

      expect(auditLogger.logFailure).toHaveBeenCalledWith('jira-bulk-update', mockConfig.url, expect.stringContaining('2 tickets failed'), expect.any(Object));
    });
  });
});

