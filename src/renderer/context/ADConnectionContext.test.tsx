import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ── Hoisted mocks ──────────────────────────────────────────────────────
const mocks = vi.hoisted(() => ({
  testADConnection: vi.fn(),
}));

vi.mock('../electronAPI', () => ({
  electronAPI: {
    testADConnection: mocks.testADConnection,
    // Stubs for other methods
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
    saveSiteConfig: vi.fn(),
    getSiteConfigs: vi.fn(),
    deleteSiteConfig: vi.fn(),
    saveJobProfiles: vi.fn(),
    getJobProfiles: vi.fn(),
    getUserRole: vi.fn(),
    setUserRole: vi.fn(),
    findStaleJiraTickets: vi.fn(),
    bulkUpdateJiraTickets: vi.fn(),
  },
  isElectron: true,
}));

import { ADConnectionProvider, useADConnection } from './ADConnectionContext';

// Consumer component to read context values
const TestConsumer: React.FC<{ onRender?: (ctx: any) => void }> = ({ onRender }) => {
  const ctx = useADConnection();
  if (onRender) onRender(ctx);
  return (
    <div>
      <span data-testid="connected">{String(ctx.status.connected)}</span>
      <span data-testid="checking">{String(ctx.status.checking)}</span>
      <span data-testid="domain">{ctx.status.domain || 'none'}</span>
      <span data-testid="error">{ctx.status.error || 'none'}</span>
      <button onClick={() => ctx.checkConnection()}>Refresh</button>
    </div>
  );
};

describe('ADConnectionContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides initial checking state', async () => {
    mocks.testADConnection.mockResolvedValue({
      connected: true,
      domain: 'RPL.Local',
      domainController: 'DC01',
      responseTime: 15,
      timestamp: new Date().toISOString(),
    });

    render(
      <ADConnectionProvider>
        <TestConsumer />
      </ADConnectionProvider>,
    );

    // Initially checking
    expect(screen.getByTestId('checking').textContent).toBe('true');

    // After connection resolves
    await waitFor(() => {
      expect(screen.getByTestId('connected').textContent).toBe('true');
      expect(screen.getByTestId('domain').textContent).toBe('RPL.Local');
      expect(screen.getByTestId('checking').textContent).toBe('false');
    });
  });

  it('handles connection failure gracefully', async () => {
    mocks.testADConnection.mockRejectedValue(new Error('Network unreachable'));

    render(
      <ADConnectionProvider>
        <TestConsumer />
      </ADConnectionProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('connected').textContent).toBe('false');
      expect(screen.getByTestId('error').textContent).toBe('Network unreachable');
      expect(screen.getByTestId('checking').textContent).toBe('false');
    });
  });

  it('manual checkConnection re-fetches status', async () => {
    mocks.testADConnection.mockResolvedValue({
      connected: false,
      error: 'Offline',
      timestamp: new Date().toISOString(),
    });

    render(
      <ADConnectionProvider>
        <TestConsumer />
      </ADConnectionProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('connected').textContent).toBe('false');
    });

    // Update the mock and trigger manual refresh
    mocks.testADConnection.mockResolvedValue({
      connected: true,
      domain: 'RPL.Local',
      timestamp: new Date().toISOString(),
    });

    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /refresh/i }));
    });

    await waitFor(() => {
      expect(screen.getByTestId('connected').textContent).toBe('true');
    });
    expect(mocks.testADConnection).toHaveBeenCalledTimes(2);
  });

  it('useADConnection throws if used outside provider', () => {
    // Suppress console.error from React error boundary
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow(
      'useADConnection must be used within ADConnectionProvider',
    );
    spy.mockRestore();
  });

  it('polls every 45 seconds', async () => {
    vi.useFakeTimers();

    mocks.testADConnection.mockResolvedValue({
      connected: true,
      domain: 'RPL.Local',
      timestamp: new Date().toISOString(),
    });

    render(
      <ADConnectionProvider>
        <TestConsumer />
      </ADConnectionProvider>,
    );

    // Wait for initial check to resolve with async timer advancement
    await vi.advanceTimersByTimeAsync(10);
    expect(mocks.testADConnection).toHaveBeenCalledTimes(1);

    // Advance timer by 45 seconds to trigger the interval
    await vi.advanceTimersByTimeAsync(45000);
    expect(mocks.testADConnection).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });
});

