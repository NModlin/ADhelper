import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { getRehrigTheme } from '../theme/rehrigTheme';

// ── Hoisted mocks ──────────────────────────────────────────────────────
const mocks = vi.hoisted(() => ({
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
  saveCredential: vi.fn(),
  getCredential: vi.fn(),
  deleteCredential: vi.fn(),
  getSiteConfigs: vi.fn(),
  saveSiteConfig: vi.fn(),
  deleteSiteConfig: vi.fn(),
  testADConnection: vi.fn(),
  saveJobProfiles: vi.fn(),
  getJobProfiles: vi.fn(),
  getUserRole: vi.fn(),
  setUserRole: vi.fn(),
  findStaleJiraTickets: vi.fn(),
  bulkUpdateJiraTickets: vi.fn(),
  // Toast
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
    runADHelperScript: mocks.runADHelperScript,
    onADHelperProgress: mocks.onADHelperProgress,
    removeADHelperProgressListener: mocks.removeADHelperProgressListener,
    removeMFABlocking: mocks.removeMFABlocking,
    onMFARemovalProgress: mocks.onMFARemovalProgress,
    removeMFARemovalProgressListener: mocks.removeMFARemovalProgressListener,
    createNewUser: mocks.createNewUser,
    onUserCreationProgress: mocks.onUserCreationProgress,
    removeUserCreationProgressListener: mocks.removeUserCreationProgressListener,
    processContractorAccount: mocks.processContractorAccount,
    onContractorProcessingProgress: mocks.onContractorProcessingProgress,
    removeContractorProcessingProgressListener: mocks.removeContractorProcessingProgressListener,
    processBulkUsers: mocks.processBulkUsers,
    onBulkProcessingProgress: mocks.onBulkProcessingProgress,
    removeBulkProcessingProgressListener: mocks.removeBulkProcessingProgressListener,
    saveCredential: mocks.saveCredential,
    getCredential: mocks.getCredential,
    deleteCredential: mocks.deleteCredential,
    getSiteConfigs: mocks.getSiteConfigs,
    saveSiteConfig: mocks.saveSiteConfig,
    deleteSiteConfig: mocks.deleteSiteConfig,
    testADConnection: mocks.testADConnection,
    saveJobProfiles: mocks.saveJobProfiles,
    getJobProfiles: mocks.getJobProfiles,
    getUserRole: mocks.getUserRole,
    setUserRole: mocks.setUserRole,
    findStaleJiraTickets: mocks.findStaleJiraTickets,
    bulkUpdateJiraTickets: mocks.bulkUpdateJiraTickets,
  },
  isElectron: true,
}));

import ADHelper from './ADHelper';

const renderADHelper = () =>
  render(
    <ThemeProvider theme={getRehrigTheme('light')}>
      <ADHelper />
    </ThemeProvider>,
  );

describe('ADHelper Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSiteConfigs.mockResolvedValue({ success: true, sites: [] });
    mocks.getUserRole.mockResolvedValue({ success: true, role: 'admin', config: {}, adminOnlyOperations: [] });
    mocks.getJobProfiles.mockResolvedValue({ success: true, jobProfiles: [] });
  });

  // ── Rendering ──────────────────────────────────────────────────────
  describe('Rendering', () => {
    it('renders the page title and description', async () => {
      renderADHelper();
      expect(screen.getByText('Active Directory Helper')).toBeInTheDocument();
      expect(screen.getByText('Manage user groups and proxy addresses')).toBeInTheDocument();
    });

    it('renders the search field and Process User button', () => {
      renderADHelper();
      expect(screen.getByLabelText(/username or email/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /process user/i })).toBeInTheDocument();
    });

    it('renders quick action buttons', () => {
      renderADHelper();
      expect(screen.getByRole('button', { name: /remove from mfa blocking group/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create new user account/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /process contractor accounts/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /bulk user processing/i })).toBeInTheDocument();
    });

    it('shows Admin role chip', async () => {
      renderADHelper();
      await waitFor(() => {
        expect(screen.getByText('Admin')).toBeInTheDocument();
      });
    });
  });

  // ── User Search / Process ──────────────────────────────────────────
  describe('User Search', () => {
    it('shows warning when searching with empty username', async () => {
      renderADHelper();
      fireEvent.click(screen.getByRole('button', { name: /process user/i }));
      expect(mocks.showWarning).toHaveBeenCalledWith('Please enter a username or email');
    });

    it('shows warning for invalid username format', async () => {
      renderADHelper();
      fireEvent.change(screen.getByLabelText(/username or email/i), { target: { value: '"; DROP TABLE;--' } });
      fireEvent.click(screen.getByRole('button', { name: /process user/i }));
      expect(mocks.showWarning).toHaveBeenCalledWith(expect.stringContaining('Invalid username'));
    });

    it('calls runADHelperScript with valid username', async () => {
      mocks.runADHelperScript.mockResolvedValue({ success: true, output: 'Done' });
      renderADHelper();
      fireEvent.change(screen.getByLabelText(/username or email/i), { target: { value: 'jsmith' } });
      fireEvent.click(screen.getByRole('button', { name: /process user/i }));

      await waitFor(() => {
        expect(mocks.runADHelperScript).toHaveBeenCalledWith('jsmith', 'process');
      });
    });

    it('shows error toast when search fails', async () => {
      mocks.runADHelperScript.mockRejectedValue({ error: 'AD unreachable' });
      renderADHelper();
      fireEvent.change(screen.getByLabelText(/username or email/i), { target: { value: 'jsmith' } });
      fireEvent.click(screen.getByRole('button', { name: /process user/i }));

      await waitFor(() => {
        expect(mocks.showError).toHaveBeenCalledWith('AD unreachable');
      });
    });

    it('registers and cleans up progress listener', async () => {
      mocks.runADHelperScript.mockResolvedValue({ success: true, output: 'Done' });
      renderADHelper();
      fireEvent.change(screen.getByLabelText(/username or email/i), { target: { value: 'jsmith' } });
      fireEvent.click(screen.getByRole('button', { name: /process user/i }));

      await waitFor(() => {
        expect(mocks.onADHelperProgress).toHaveBeenCalled();
        expect(mocks.removeADHelperProgressListener).toHaveBeenCalled();
      });
    });
  });

  // ── MFA Removal Dialog ─────────────────────────────────────────────
  describe('MFA Removal Dialog', () => {
    it('opens MFA dialog when button is clicked', async () => {
      renderADHelper();
      fireEvent.click(screen.getByRole('button', { name: /remove from mfa blocking group/i }));
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('calls removeMFABlocking with entered username', async () => {
      mocks.removeMFABlocking.mockResolvedValue({
        success: true,
        result: { Success: true, WasInGroup: true, Message: 'Removed' },
      });
      renderADHelper();
      fireEvent.click(screen.getByRole('button', { name: /remove from mfa blocking group/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Find the MFA username input inside the dialog
      const dialog = screen.getByRole('dialog');
      const input = dialog.querySelector('input');
      if (input) {
        fireEvent.change(input, { target: { value: 'testuser' } });
      }

      // Click Remove from Group button (actual button text in the dialog)
      fireEvent.click(screen.getByRole('button', { name: /remove from group/i }));

      await waitFor(() => {
        expect(mocks.removeMFABlocking).toHaveBeenCalledWith('testuser');
      });
    });
  });

  // ── RBAC ──────────────────────────────────────────────────────────
  describe('RBAC', () => {
    it('disables admin-only buttons when role is operator', async () => {
      mocks.getUserRole.mockResolvedValue({
        success: true,
        role: 'operator',
        config: {},
        adminOnlyOperations: ['create-user', 'process-contractor', 'process-bulk'],
      });

      renderADHelper();

      await waitFor(() => {
        expect(screen.getByText('Operator')).toBeInTheDocument();
      });

      // Create New User should be disabled for operator
      expect(screen.getByRole('button', { name: /create new user account/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /process contractor accounts/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /bulk user processing/i })).toBeDisabled();
    });

    it('MFA removal is available for operator role', async () => {
      mocks.getUserRole.mockResolvedValue({
        success: true,
        role: 'operator',
        config: {},
        adminOnlyOperations: [],
      });

      renderADHelper();

      await waitFor(() => {
        expect(screen.getByText('Operator')).toBeInTheDocument();
      });

      // MFA removal should always be available
      expect(screen.getByRole('button', { name: /remove from mfa blocking group/i })).not.toBeDisabled();
    });

    it('loads user role on mount', async () => {
      renderADHelper();
      await waitFor(() => {
        expect(mocks.getUserRole).toHaveBeenCalled();
      });
    });
  });

  // ── Contractor Processing ─────────────────────────────────────────
  describe('Contractor Processing', () => {
    it('opens contractor dialog when button is clicked', async () => {
      renderADHelper();
      fireEvent.click(screen.getByRole('button', { name: /process contractor accounts/i }));
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });

  // ── Bulk Processing ───────────────────────────────────────────────
  describe('Bulk Processing', () => {
    it('opens bulk processing dialog when button is clicked', async () => {
      renderADHelper();
      fireEvent.click(screen.getByRole('button', { name: /bulk user processing/i }));
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });

  // ── parseProgressPercent (exported function) ──────────────────────
  describe('Progress Parsing', () => {
    it('search triggers progress listener registration', async () => {
      mocks.runADHelperScript.mockResolvedValue({ success: true, output: 'Done' });
      renderADHelper();
      fireEvent.change(screen.getByLabelText(/username or email/i), { target: { value: 'jsmith' } });
      fireEvent.click(screen.getByRole('button', { name: /process user/i }));

      await waitFor(() => {
        expect(mocks.onADHelperProgress).toHaveBeenCalledTimes(1);
        expect(typeof mocks.onADHelperProgress.mock.calls[0][0]).toBe('function');
      });
    });
  });

  // ── Site Configs ──────────────────────────────────────────────────
  describe('Site Configuration', () => {
    it('loads site configs on mount', async () => {
      renderADHelper();
      await waitFor(() => {
        expect(mocks.getSiteConfigs).toHaveBeenCalled();
      });
    });
  });
});

