import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { getRehrigTheme } from '../theme/rehrigTheme';

// ── Hoisted mocks ──────────────────────────────────────────────────────
const mocks = vi.hoisted(() => ({
  getCredential: vi.fn(),
  saveCredential: vi.fn(),
  deleteCredential: vi.fn(),
  getSiteConfigs: vi.fn().mockResolvedValue({ success: true, sites: [] }),
  saveSiteConfig: vi.fn(),
  deleteSiteConfig: vi.fn(),
  saveJobProfiles: vi.fn(),
  getJobProfiles: vi.fn(),
  showSuccess: vi.fn(),
  showError: vi.fn(),
  showWarning: vi.fn(),
  showInfo: vi.fn(),
  dismiss: vi.fn(),
  isElectron: true,
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
    saveCredential: mocks.saveCredential,
    deleteCredential: mocks.deleteCredential,
    getSiteConfigs: mocks.getSiteConfigs,
    saveSiteConfig: mocks.saveSiteConfig,
    deleteSiteConfig: mocks.deleteSiteConfig,
    saveJobProfiles: mocks.saveJobProfiles,
    getJobProfiles: mocks.getJobProfiles,
    // Stubs
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
    testADConnection: vi.fn(),
    getUserRole: vi.fn(),
    setUserRole: vi.fn(),
    findStaleJiraTickets: vi.fn(),
    bulkUpdateJiraTickets: vi.fn(),
  },
  get isElectron() { return mocks.isElectron; },
}));

import Settings from './Settings';

const renderSettings = () =>
  render(
    <ThemeProvider theme={getRehrigTheme('light')}>
      <Settings />
    </ThemeProvider>,
  );

describe('Settings Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isElectron = true;
    // Default: no saved credentials
    mocks.getCredential.mockResolvedValue({ success: true });
    mocks.getSiteConfigs.mockResolvedValue({ success: true, sites: [] });
  });

  // ── Rendering ──────────────────────────────────────────────────────
  describe('Rendering', () => {
    it('renders the page title and description', () => {
      renderSettings();
      expect(screen.getByText('Secure Credentials')).toBeInTheDocument();
      expect(screen.getByText(/Manage your credentials securely/)).toBeInTheDocument();
    });

    it('renders Jira and AD credential sections', () => {
      renderSettings();
      expect(screen.getByText('Jira API Credentials')).toBeInTheDocument();
      expect(screen.getByText('Active Directory Credentials')).toBeInTheDocument();
    });

    it('renders About section with version', () => {
      renderSettings();
      expect(screen.getByText('About')).toBeInTheDocument();
      expect(screen.getByText(/1\.0\.0/)).toBeInTheDocument();
    });

    it('shows Secure Storage alert when in Electron mode', () => {
      renderSettings();
      expect(screen.getByText(/Secure Storage/)).toBeInTheDocument();
    });

    it('shows Browser Mode warning when not in Electron', async () => {
      mocks.isElectron = false;
      vi.resetModules();
      // Re-import with updated isElectron - but since vi.mock is hoisted, the getter reads mocks.isElectron
      renderSettings();
      expect(screen.getByText(/Browser Mode/)).toBeInTheDocument();
    });
  });

  // ── Credential Loading ─────────────────────────────────────────────
  describe('Credential Loading', () => {
    it('loads Jira credentials on mount and shows Saved chip', async () => {
      mocks.getCredential.mockImplementation(async (target: string) => {
        if (target === 'ADHelper_Jira') {
          return { success: true, username: 'https://test.atlassian.net|user@test.com', password: 'tok123' };
        }
        return { success: true };
      });

      renderSettings();

      await waitFor(() => {
        const chips = screen.getAllByText('Saved');
        expect(chips.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('loads AD credentials on mount and shows Saved chip', async () => {
      mocks.getCredential.mockImplementation(async (target: string) => {
        if (target === 'ADHelper_ActiveDirectory') {
          return { success: true, username: 'admin', password: 'pass' };
        }
        return { success: true };
      });

      renderSettings();

      await waitFor(() => {
        const chips = screen.getAllByText('Saved');
        expect(chips.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('handles credential load failure gracefully', async () => {
      mocks.getCredential.mockRejectedValue(new Error('Store unavailable'));
      renderSettings();
      // Should render without crashing
      await waitFor(() => {
        expect(screen.getByText('Jira API Credentials')).toBeInTheDocument();
      });
    });
  });

  // ── Jira Credential Save ──────────────────────────────────────────
  describe('Jira Credential Save', () => {
    it('shows warning when saving with empty fields', async () => {
      renderSettings();
      fireEvent.click(screen.getByRole('button', { name: /save jira credentials/i }));

      expect(mocks.showWarning).toHaveBeenCalledWith('Please fill in all Jira fields');
    });

    it('saves Jira credentials successfully', async () => {
      mocks.saveCredential.mockResolvedValue({ success: true });
      renderSettings();

      fireEvent.change(screen.getByLabelText(/jira url/i), { target: { value: 'https://test.atlassian.net' } });
      fireEvent.change(screen.getByLabelText(/jira email/i), { target: { value: 'user@test.com' } });
      fireEvent.change(screen.getByLabelText(/jira api token/i), { target: { value: 'tok123' } });
      fireEvent.click(screen.getByRole('button', { name: /save jira credentials/i }));

      await waitFor(() => {
        expect(mocks.saveCredential).toHaveBeenCalledWith(
          'ADHelper_Jira',
          'https://test.atlassian.net|user@test.com',
          'tok123',
        );
        expect(mocks.showSuccess).toHaveBeenCalledWith('Jira credentials saved successfully!');
      });
    });

    it('shows error when Jira save fails', async () => {
      mocks.saveCredential.mockResolvedValue({ success: false, error: 'Access denied' });
      renderSettings();

      fireEvent.change(screen.getByLabelText(/jira url/i), { target: { value: 'https://x.com' } });
      fireEvent.change(screen.getByLabelText(/jira email/i), { target: { value: 'u@x.com' } });
      fireEvent.change(screen.getByLabelText(/jira api token/i), { target: { value: 't' } });
      fireEvent.click(screen.getByRole('button', { name: /save jira credentials/i }));

      await waitFor(() => {
        expect(mocks.showError).toHaveBeenCalledWith('Access denied');
      });
    });
  });

  // ── AD Credential Save ────────────────────────────────────────────
  describe('AD Credential Save', () => {
    it('shows warning when saving with empty fields', async () => {
      renderSettings();
      fireEvent.click(screen.getByRole('button', { name: /save ad credentials/i }));

      expect(mocks.showWarning).toHaveBeenCalledWith('Please fill in all AD fields');
    });

    it('saves AD credentials successfully', async () => {
      mocks.saveCredential.mockResolvedValue({ success: true });
      renderSettings();

      fireEvent.change(screen.getByLabelText(/ad username/i), { target: { value: 'admin' } });
      fireEvent.change(screen.getByLabelText(/ad password/i), { target: { value: 'pass123' } });
      fireEvent.click(screen.getByRole('button', { name: /save ad credentials/i }));

      await waitFor(() => {
        expect(mocks.saveCredential).toHaveBeenCalledWith('ADHelper_ActiveDirectory', 'admin', 'pass123');
        expect(mocks.showSuccess).toHaveBeenCalledWith('AD credentials saved successfully!');
      });
    });
  });

  // ── Credential Delete ─────────────────────────────────────────────
  describe('Credential Delete', () => {
    it('deletes Jira credentials and shows success toast', async () => {
      mocks.getCredential.mockImplementation(async (target: string) => {
        if (target === 'ADHelper_Jira') {
          return { success: true, username: 'url|email', password: 'tok' };
        }
        return { success: true };
      });
      mocks.deleteCredential.mockResolvedValue({ success: true });

      renderSettings();

      // Wait for "Saved" chip (Delete button only shows when loaded)
      await waitFor(() => {
        expect(screen.getAllByText('Saved').length).toBeGreaterThanOrEqual(1);
      });

      // Find the Jira Delete button (first one)
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mocks.deleteCredential).toHaveBeenCalledWith('ADHelper_Jira');
        expect(mocks.showSuccess).toHaveBeenCalledWith('Jira credentials deleted');
      });
    });

    it('shows error when delete fails', async () => {
      mocks.getCredential.mockImplementation(async (target: string) => {
        if (target === 'ADHelper_Jira') {
          return { success: true, username: 'url|email', password: 'tok' };
        }
        return { success: true };
      });
      mocks.deleteCredential.mockRejectedValue(new Error('fail'));

      renderSettings();
      await waitFor(() => {
        expect(screen.getAllByText('Saved').length).toBeGreaterThanOrEqual(1);
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mocks.showError).toHaveBeenCalledWith('Failed to delete Jira credentials');
      });
    });
  });

  // ── Password Visibility Toggle ────────────────────────────────────
  describe('Password Visibility Toggle', () => {
    it('toggles Jira API token visibility', () => {
      renderSettings();
      const tokenField = screen.getByLabelText(/jira api token/i);
      expect(tokenField).toHaveAttribute('type', 'password');

      // Click the visibility toggle (first one in Jira section)
      const toggleButtons = screen.getAllByRole('button').filter(
        btn => btn.querySelector('[data-testid="VisibilityIcon"]') || btn.querySelector('[data-testid="VisibilityOffIcon"]')
      );
      // The toggle buttons include SVG icons - use a broader approach
      // Find buttons inside InputAdornment wrappers
      const jiraTokenInput = tokenField.closest('.MuiTextField-root');
      const toggleBtn = jiraTokenInput?.querySelector('button');
      if (toggleBtn) {
        fireEvent.click(toggleBtn);
        expect(tokenField).toHaveAttribute('type', 'text');
      }
    });
  });

  // ── Site Management Section ────────────────────────────────────────
  describe('Site Management Section', () => {
    it('renders Site Location Management section', () => {
      renderSettings();
      expect(screen.getByText('Site Location Management')).toBeInTheDocument();
    });
  });
});

