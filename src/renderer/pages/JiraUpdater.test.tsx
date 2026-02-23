import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { getRehrigTheme } from '../theme/rehrigTheme';

// ── Hoisted mocks ──────────────────────────────────────────────────────
const mocks = vi.hoisted(() => ({
  getCredential: vi.fn(),
  findStaleJiraTickets: vi.fn(),
  bulkUpdateJiraTickets: vi.fn(),
  saveCredential: vi.fn(),
  deleteCredential: vi.fn(),
  testADConnection: vi.fn(),
  // Toast notification mocks
  showSuccess: vi.fn(),
  showError: vi.fn(),
  showWarning: vi.fn(),
  showInfo: vi.fn(),
  dismiss: vi.fn(),
}));

vi.mock('../hooks/useNotification', () => ({
  useNotification: () => ({
    showSuccess: mocks.showSuccess,
    showError: mocks.showError,
    showWarning: mocks.showWarning,
    showInfo: mocks.showInfo,
    dismiss: mocks.dismiss,
  }),
}));

vi.mock('../electronAPI', () => ({
  electronAPI: {
    getCredential: mocks.getCredential,
    findStaleJiraTickets: mocks.findStaleJiraTickets,
    bulkUpdateJiraTickets: mocks.bulkUpdateJiraTickets,
    saveCredential: mocks.saveCredential,
    deleteCredential: mocks.deleteCredential,
    testADConnection: mocks.testADConnection,
    // Stubs for other methods JiraUpdater doesn't directly use
    runADHelperScript: vi.fn(),
    onADHelperProgress: vi.fn(),
    removeADHelperProgressListener: vi.fn(),
    removeMFABlocking: vi.fn(),
    onMFARemovalProgress: vi.fn(),
    removeMFARemovalProgressListener: vi.fn(),
    createNewUser: vi.fn(),
    onUserCreationProgress: vi.fn(),
    removeUserCreationProgressListener: vi.fn(),
    processContractorAccount: vi.fn(),
    onContractorProcessingProgress: vi.fn(),
    removeContractorProcessingProgressListener: vi.fn(),
    processBulkUsers: vi.fn(),
    onBulkProcessingProgress: vi.fn(),
    removeBulkProcessingProgressListener: vi.fn(),
    saveSiteConfig: vi.fn(),
    getSiteConfigs: vi.fn(),
    deleteSiteConfig: vi.fn(),
    saveJobProfiles: vi.fn(),
    getJobProfiles: vi.fn(),
    getUserRole: vi.fn(),
    setUserRole: vi.fn(),
  },
  isElectron: true,
}));

// ── Test fixture constants (not real credentials) ───────────────────────
const TEST_JIRA_TOKEN = `test-fixture-jira-token-${Date.now()}`;

const MOCK_TICKETS = [
  { key: 'PROJ-101', summary: 'Fix login bug', status: 'Open', lastUpdated: '3 days ago', assignee: 'Alice', updated: '2026-02-13' },
  { key: 'PROJ-202', summary: 'Update docs', status: 'In Progress', lastUpdated: '2 days ago', assignee: 'Bob', updated: '2026-02-14' },
];

const SAVED_CRED = {
  success: true,
  username: 'https://test.atlassian.net|user@test.com',
  password: TEST_JIRA_TOKEN,
};

// ── Helpers ────────────────────────────────────────────────────────────
import JiraUpdater from './JiraUpdater';

const renderJira = () =>
  render(
    <ThemeProvider theme={getRehrigTheme('light')}>
      <JiraUpdater />
    </ThemeProvider>,
  );

// ── Tests ──────────────────────────────────────────────────────────────
describe('JiraUpdater – Jira Workflow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no saved credentials
    mocks.getCredential.mockResolvedValue({ success: true });
  });

  // ── 1. Configuration Flow ─────────────────────────────────────────
  describe('Configuration Flow', () => {
    it('loads saved credentials on mount and shows info toast', async () => {
      mocks.getCredential.mockResolvedValue(SAVED_CRED);
      renderJira();

      await waitFor(() => {
        expect(mocks.showInfo).toHaveBeenCalledWith('Credentials loaded from Settings');
      });
      expect(mocks.getCredential).toHaveBeenCalledWith('ADHelper_Jira');
    });

    it('renders empty fields when no credentials are saved', async () => {
      renderJira();
      // The credential info toast should NOT fire
      await waitFor(() => {
        expect(mocks.showInfo).not.toHaveBeenCalledWith('Credentials loaded from Settings');
      });
    });

    it('disables Find Stale Tickets button when credentials are empty', () => {
      renderJira();
      const btn = screen.getByRole('button', { name: /find stale tickets/i });
      expect(btn).toBeDisabled();
    });

    it('enables Find Stale Tickets when all credential fields are filled', async () => {
      mocks.getCredential.mockResolvedValue(SAVED_CRED);
      renderJira();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /find stale tickets/i })).not.toBeDisabled();
      });
    });
  });

  // ── 2. Find Stale Tickets Flow ────────────────────────────────────
  describe('Find Stale Tickets Flow', () => {
    beforeEach(() => {
      mocks.getCredential.mockResolvedValue(SAVED_CRED);
    });

    it('displays tickets in a table after clicking Find Stale Tickets', async () => {
      mocks.findStaleJiraTickets.mockResolvedValue({ success: true, tickets: MOCK_TICKETS });
      renderJira();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /find stale tickets/i })).not.toBeDisabled();
      });

      fireEvent.click(screen.getByRole('button', { name: /find stale tickets/i }));

      await waitFor(() => {
        expect(screen.getByText('PROJ-101')).toBeInTheDocument();
        expect(screen.getByText('Fix login bug')).toBeInTheDocument();
        expect(screen.getByText('PROJ-202')).toBeInTheDocument();
        expect(screen.getByText('Update docs')).toBeInTheDocument();
      });
    });

    it('table shows correct columns: Key, Summary, Status, Last Updated, Assignee', async () => {
      mocks.findStaleJiraTickets.mockResolvedValue({ success: true, tickets: MOCK_TICKETS });
      renderJira();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /find stale tickets/i })).not.toBeDisabled();
      });
      fireEvent.click(screen.getByRole('button', { name: /find stale tickets/i }));

      await waitFor(() => {
        expect(screen.getByText('Key')).toBeInTheDocument();
      });
      expect(screen.getByText('Summary')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Last Updated')).toBeInTheDocument();
      expect(screen.getByText('Assignee')).toBeInTheDocument();
    });

    it('shows ticket count in header', async () => {
      mocks.findStaleJiraTickets.mockResolvedValue({ success: true, tickets: MOCK_TICKETS });
      renderJira();
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /find stale tickets/i })).not.toBeDisabled();
      });
      fireEvent.click(screen.getByRole('button', { name: /find stale tickets/i }));

      await waitFor(() => {
        expect(screen.getByText('Found 2 Stale Tickets')).toBeInTheDocument();
      });
    });

    it('shows success toast when no stale tickets are found', async () => {
      mocks.findStaleJiraTickets.mockResolvedValue({ success: true, tickets: [] });
      renderJira();
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /find stale tickets/i })).not.toBeDisabled();
      });
      fireEvent.click(screen.getByRole('button', { name: /find stale tickets/i }));

      await waitFor(() => {
        expect(mocks.showSuccess).toHaveBeenCalledWith('No stale tickets found!');
      });
    });

    it('passes correct config and threshold to findStaleJiraTickets', async () => {
      mocks.findStaleJiraTickets.mockResolvedValue({ success: true, tickets: [] });
      renderJira();
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /find stale tickets/i })).not.toBeDisabled();
      });
      fireEvent.click(screen.getByRole('button', { name: /find stale tickets/i }));

      await waitFor(() => {
        expect(mocks.findStaleJiraTickets).toHaveBeenCalledWith(
          { url: 'https://test.atlassian.net', email: 'user@test.com', apiToken: TEST_JIRA_TOKEN },
          48,
        );
      });
    });

    it('shows empty state prompt before any search', () => {
      renderJira();
      expect(
        screen.getByText('Configure Jira settings and click "Find Stale Tickets" to get started'),
      ).toBeInTheDocument();
    });
  });

  // ── 3. Bulk Update Flow ───────────────────────────────────────────
  describe('Bulk Update Flow', () => {
    beforeEach(() => {
      mocks.getCredential.mockResolvedValue(SAVED_CRED);
      mocks.findStaleJiraTickets.mockResolvedValue({ success: true, tickets: MOCK_TICKETS });
    });

    const findAndShowTickets = async () => {
      renderJira();
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /find stale tickets/i })).not.toBeDisabled();
      });
      fireEvent.click(screen.getByRole('button', { name: /find stale tickets/i }));
      await waitFor(() => {
        expect(screen.getByText('PROJ-101')).toBeInTheDocument();
      });
    };

    it('shows Update All button after finding tickets', async () => {
      await findAndShowTickets();
      expect(screen.getByRole('button', { name: /update all/i })).toBeInTheDocument();
    });

    it('comment action: calls bulkUpdateJiraTickets with comment text', async () => {
      mocks.bulkUpdateJiraTickets.mockResolvedValue({
        success: true,
        results: { success: 2, failed: 0, errors: [] },
      });
      await findAndShowTickets();

      // Default action is "comment" with pre-filled text
      fireEvent.click(screen.getByRole('button', { name: /update all/i }));

      await waitFor(() => {
        expect(mocks.bulkUpdateJiraTickets).toHaveBeenCalledWith(
          { url: 'https://test.atlassian.net', email: 'user@test.com', apiToken: TEST_JIRA_TOKEN },
          MOCK_TICKETS,
          'comment',
          expect.stringContaining('automatically updated'),
        );
      });
    });

    it('shows success toast with correct ticket count after update', async () => {
      mocks.bulkUpdateJiraTickets.mockResolvedValue({
        success: true,
        results: { success: 2, failed: 0, errors: [] },
      });
      await findAndShowTickets();
      fireEvent.click(screen.getByRole('button', { name: /update all/i }));

      await waitFor(() => {
        expect(mocks.showSuccess).toHaveBeenCalledWith('Successfully updated 2 tickets');
      });
    });

    it('shows warning toast for partial failure when some updates fail', async () => {
      mocks.bulkUpdateJiraTickets.mockResolvedValue({
        success: true,
        results: { success: 1, failed: 1, errors: ['PROJ-202: permission denied'] },
      });
      await findAndShowTickets();
      fireEvent.click(screen.getByRole('button', { name: /update all/i }));

      await waitFor(() => {
        expect(mocks.showWarning).toHaveBeenCalledWith(expect.stringContaining('Updated 1 tickets, but 1 failed'));
      });
    });

    it('shows warning toast when update action value is empty for status action', async () => {
      await findAndShowTickets();

      // Switch to "status" action via the MUI Select combobox
      const select = screen.getByRole('combobox', { hidden: true });
      fireEvent.mouseDown(select);
      const statusOption = await screen.findByRole('option', { name: /change status/i });
      fireEvent.click(statusOption);

      // Don't fill in a transition ID, just click Update All
      fireEvent.click(screen.getByRole('button', { name: /update all/i }));

      await waitFor(() => {
        expect(mocks.showWarning).toHaveBeenCalledWith(expect.stringContaining('Please provide a value for the "status" action'));
      });
    });
  });

  // ── 4. Error Handling ─────────────────────────────────────────────
  describe('Error Handling', () => {
    beforeEach(() => {
      mocks.getCredential.mockResolvedValue(SAVED_CRED);
    });

    it('shows error toast when findStaleJiraTickets returns failure', async () => {
      mocks.findStaleJiraTickets.mockResolvedValue({
        success: false,
        error: 'Invalid credentials – 401 Unauthorized',
      });
      renderJira();
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /find stale tickets/i })).not.toBeDisabled();
      });
      fireEvent.click(screen.getByRole('button', { name: /find stale tickets/i }));

      await waitFor(() => {
        expect(mocks.showError).toHaveBeenCalledWith('Invalid credentials – 401 Unauthorized');
      });
    });

    it('shows error toast when findStaleJiraTickets throws an exception', async () => {
      mocks.findStaleJiraTickets.mockRejectedValue(new Error('Network error'));
      renderJira();
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /find stale tickets/i })).not.toBeDisabled();
      });
      fireEvent.click(screen.getByRole('button', { name: /find stale tickets/i }));

      await waitFor(() => {
        expect(mocks.showError).toHaveBeenCalledWith('Network error');
      });
    });

    it('shows error toast when bulkUpdateJiraTickets returns failure', async () => {
      mocks.findStaleJiraTickets.mockResolvedValue({ success: true, tickets: MOCK_TICKETS });
      mocks.bulkUpdateJiraTickets.mockResolvedValue({
        success: false,
        error: 'RBAC: permission denied',
      });
      renderJira();
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /find stale tickets/i })).not.toBeDisabled();
      });
      fireEvent.click(screen.getByRole('button', { name: /find stale tickets/i }));
      await waitFor(() => {
        expect(screen.getByText('PROJ-101')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: /update all/i }));

      await waitFor(() => {
        expect(mocks.showError).toHaveBeenCalledWith('RBAC: permission denied');
      });
    });

    it('shows error toast when bulkUpdateJiraTickets throws an exception', async () => {
      mocks.findStaleJiraTickets.mockResolvedValue({ success: true, tickets: MOCK_TICKETS });
      mocks.bulkUpdateJiraTickets.mockRejectedValue(new Error('Timeout'));
      renderJira();
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /find stale tickets/i })).not.toBeDisabled();
      });
      fireEvent.click(screen.getByRole('button', { name: /find stale tickets/i }));
      await waitFor(() => {
        expect(screen.getByText('PROJ-101')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: /update all/i }));

      await waitFor(() => {
        expect(mocks.showError).toHaveBeenCalledWith('Timeout');
      });
    });

    it('handles credential loading failure gracefully', async () => {
      mocks.getCredential.mockRejectedValue(new Error('Credential store unavailable'));
      // Should render without crashing
      renderJira();
      await waitFor(() => {
        expect(screen.getByText('Jira 48h Updater')).toBeInTheDocument();
      });
      expect(mocks.showInfo).not.toHaveBeenCalledWith('Credentials loaded from Settings');
    });
  });

  // ── 5. IPC Integration ────────────────────────────────────────────
  describe('IPC Integration', () => {
    it('calls electronAPI.getCredential on mount', () => {
      renderJira();
      expect(mocks.getCredential).toHaveBeenCalledWith('ADHelper_Jira');
    });

    it('calls electronAPI.findStaleJiraTickets with correct args', async () => {
      mocks.getCredential.mockResolvedValue(SAVED_CRED);
      mocks.findStaleJiraTickets.mockResolvedValue({ success: true, tickets: [] });
      renderJira();
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /find stale tickets/i })).not.toBeDisabled();
      });
      fireEvent.click(screen.getByRole('button', { name: /find stale tickets/i }));

      await waitFor(() => {
        expect(mocks.findStaleJiraTickets).toHaveBeenCalledTimes(1);
        expect(mocks.findStaleJiraTickets).toHaveBeenCalledWith(
          { url: 'https://test.atlassian.net', email: 'user@test.com', apiToken: TEST_JIRA_TOKEN },
          48,
        );
      });
    });

    it('calls electronAPI.bulkUpdateJiraTickets with correct args', async () => {
      mocks.getCredential.mockResolvedValue(SAVED_CRED);
      mocks.findStaleJiraTickets.mockResolvedValue({ success: true, tickets: MOCK_TICKETS });
      mocks.bulkUpdateJiraTickets.mockResolvedValue({
        success: true,
        results: { success: 2, failed: 0, errors: [] },
      });
      renderJira();
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /find stale tickets/i })).not.toBeDisabled();
      });
      fireEvent.click(screen.getByRole('button', { name: /find stale tickets/i }));
      await waitFor(() => {
        expect(screen.getByText('PROJ-101')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: /update all/i }));

      await waitFor(() => {
        expect(mocks.bulkUpdateJiraTickets).toHaveBeenCalledTimes(1);
        expect(mocks.bulkUpdateJiraTickets).toHaveBeenCalledWith(
          { url: 'https://test.atlassian.net', email: 'user@test.com', apiToken: TEST_JIRA_TOKEN },
          MOCK_TICKETS,
          'comment',
          expect.any(String),
        );
      });
    });

    it('clears tickets after successful bulk update', async () => {
      mocks.getCredential.mockResolvedValue(SAVED_CRED);
      mocks.findStaleJiraTickets.mockResolvedValue({ success: true, tickets: MOCK_TICKETS });
      mocks.bulkUpdateJiraTickets.mockResolvedValue({
        success: true,
        results: { success: 2, failed: 0, errors: [] },
      });
      renderJira();
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /find stale tickets/i })).not.toBeDisabled();
      });
      fireEvent.click(screen.getByRole('button', { name: /find stale tickets/i }));
      await waitFor(() => {
        expect(screen.getByText('PROJ-101')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: /update all/i }));

      await waitFor(() => {
        expect(screen.queryByText('PROJ-101')).not.toBeInTheDocument();
        expect(screen.queryByText('PROJ-202')).not.toBeInTheDocument();
      });
    });
  });
});

