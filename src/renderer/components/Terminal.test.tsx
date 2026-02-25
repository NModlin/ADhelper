import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Terminal from './Terminal';

// Provide clipboard API (jsdom does not implement it)
Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});

const SAMPLE_OUTPUT = ['Line 1', 'Line 2', 'Line 3'];

describe('Terminal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Visibility ────────────────────────────────────────────────────────
  describe('Visibility', () => {
    it('renders null when not loading and output is empty', () => {
      const { container } = render(<Terminal output={[]} loading={false} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders when loading is true even with empty output', () => {
      render(<Terminal output={[]} loading={true} />);
      expect(screen.getByTestId('terminal')).toBeInTheDocument();
    });

    it('renders when output has lines and not loading', () => {
      render(<Terminal output={SAMPLE_OUTPUT} loading={false} />);
      expect(screen.getByTestId('terminal')).toBeInTheDocument();
    });
  });

  // ── Header ────────────────────────────────────────────────────────────
  describe('Header', () => {
    it('renders macOS traffic light dots', () => {
      render(<Terminal output={SAMPLE_OUTPUT} />);
      expect(screen.getByTestId('dot-red')).toBeInTheDocument();
      expect(screen.getByTestId('dot-yellow')).toBeInTheDocument();
      expect(screen.getByTestId('dot-green')).toBeInTheDocument();
    });

    it('shows the default title', () => {
      render(<Terminal output={SAMPLE_OUTPUT} />);
      expect(screen.getByText('PowerShell Terminal Output')).toBeInTheDocument();
    });

    it('shows a custom title when provided', () => {
      render(<Terminal output={SAMPLE_OUTPUT} title="MFA Removal Output" />);
      expect(screen.getByText('MFA Removal Output')).toBeInTheDocument();
    });

    it('shows Running chip when loading', () => {
      render(<Terminal output={[]} loading={true} />);
      expect(screen.getByTestId('chip-running')).toBeInTheDocument();
      expect(screen.queryByTestId('chip-completed')).not.toBeInTheDocument();
    });

    it('shows Completed chip when not loading and output exists', () => {
      render(<Terminal output={SAMPLE_OUTPUT} loading={false} />);
      expect(screen.getByTestId('chip-completed')).toBeInTheDocument();
      expect(screen.queryByTestId('chip-running')).not.toBeInTheDocument();
    });
  });

  // ── Loading States ────────────────────────────────────────────────────
  describe('Loading States', () => {
    it('shows "Initializing" message when loading with no output', () => {
      render(<Terminal output={[]} loading={true} />);
      expect(screen.getByText('Initializing PowerShell script...')).toBeInTheDocument();
    });

    it('shows "Processing" message when loading with existing output', () => {
      render(<Terminal output={SAMPLE_OUTPUT} loading={true} />);
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('does not show loading messages when not loading', () => {
      render(<Terminal output={SAMPLE_OUTPUT} loading={false} />);
      expect(screen.queryByText('Initializing PowerShell script...')).not.toBeInTheDocument();
      expect(screen.queryByText('Processing...')).not.toBeInTheDocument();
    });
  });

  // ── Output Lines ──────────────────────────────────────────────────────
  describe('Output Lines', () => {
    it('renders all output lines', () => {
      render(<Terminal output={SAMPLE_OUTPUT} />);
      SAMPLE_OUTPUT.forEach(line => {
        expect(screen.getByText(line)).toBeInTheDocument();
      });
    });

    it('renders the output container with expected testid', () => {
      render(<Terminal output={SAMPLE_OUTPUT} />);
      expect(screen.getByTestId('terminal-output')).toBeInTheDocument();
    });
  });

  // ── Line Numbers ──────────────────────────────────────────────────────
  describe('Line Numbers', () => {
    it('shows line numbers when showLineNumbers is true', () => {
      render(<Terminal output={['Alpha', 'Beta', 'Gamma']} showLineNumbers={true} />);
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('does not show line numbers when showLineNumbers is false', () => {
      render(<Terminal output={['Alpha', 'Beta']} showLineNumbers={false} />);
      expect(screen.queryByText('1')).not.toBeInTheDocument();
      expect(screen.queryByText('2')).not.toBeInTheDocument();
    });
  });

  // ── Copy Functionality ────────────────────────────────────────────────
  describe('Copy Functionality', () => {
    it('renders the copy button', () => {
      render(<Terminal output={SAMPLE_OUTPUT} />);
      expect(screen.getByRole('button', { name: /copy output/i })).toBeInTheDocument();
    });

    it('calls clipboard.writeText with newline-joined output on click', async () => {
      render(<Terminal output={SAMPLE_OUTPUT} />);
      fireEvent.click(screen.getByRole('button', { name: /copy output/i }));
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(SAMPLE_OUTPUT.join('\n'));
      });
    });

    it('copy button is disabled when output is empty', () => {
      render(<Terminal output={[]} loading={true} />);
      expect(screen.getByRole('button', { name: /copy output/i })).toBeDisabled();
    });
  });

  // ── Clear Functionality ───────────────────────────────────────────────
  describe('Clear Functionality', () => {
    it('renders clear button when onClear prop is provided', () => {
      render(<Terminal output={SAMPLE_OUTPUT} onClear={vi.fn()} />);
      expect(screen.getByRole('button', { name: /clear terminal/i })).toBeInTheDocument();
    });

    it('does not render clear button when onClear is not provided', () => {
      render(<Terminal output={SAMPLE_OUTPUT} />);
      expect(screen.queryByRole('button', { name: /clear terminal/i })).not.toBeInTheDocument();
    });

    it('calls onClear when clear button is clicked', () => {
      const onClear = vi.fn();
      render(<Terminal output={SAMPLE_OUTPUT} onClear={onClear} />);
      fireEvent.click(screen.getByRole('button', { name: /clear terminal/i }));
      expect(onClear).toHaveBeenCalledTimes(1);
    });

    it('clear button is disabled while loading', () => {
      render(<Terminal output={SAMPLE_OUTPUT} onClear={vi.fn()} loading={true} />);
      expect(screen.getByRole('button', { name: /clear terminal/i })).toBeDisabled();
    });

    it('clear button is disabled when output is empty', () => {
      render(<Terminal output={[]} onClear={vi.fn()} loading={true} />);
      expect(screen.getByRole('button', { name: /clear terminal/i })).toBeDisabled();
    });
  });

  // ── Collapsible ───────────────────────────────────────────────────────
  describe('Collapsible', () => {
    it('shows collapse button when collapsible is true', () => {
      render(<Terminal output={SAMPLE_OUTPUT} collapsible={true} />);
      expect(screen.getByRole('button', { name: /collapse terminal/i })).toBeInTheDocument();
    });

    it('does not show collapse/expand button when collapsible is false', () => {
      render(<Terminal output={SAMPLE_OUTPUT} collapsible={false} />);
      expect(screen.queryByRole('button', { name: /collapse terminal/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /expand terminal/i })).not.toBeInTheDocument();
    });

    it('toggles from Collapse to Expand on click', () => {
      render(<Terminal output={SAMPLE_OUTPUT} collapsible={true} />);
      fireEvent.click(screen.getByRole('button', { name: /collapse terminal/i }));
      expect(screen.getByRole('button', { name: /expand terminal/i })).toBeInTheDocument();
    });

    it('toggles back from Expand to Collapse on second click', () => {
      render(<Terminal output={SAMPLE_OUTPUT} collapsible={true} />);
      const collapseBtn = screen.getByRole('button', { name: /collapse terminal/i });
      fireEvent.click(collapseBtn);
      fireEvent.click(screen.getByRole('button', { name: /expand terminal/i }));
      expect(screen.getByRole('button', { name: /collapse terminal/i })).toBeInTheDocument();
    });

    it('starts in collapsed state when defaultCollapsed is true', () => {
      render(<Terminal output={SAMPLE_OUTPUT} collapsible={true} defaultCollapsed={true} />);
      expect(screen.getByRole('button', { name: /expand terminal/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /collapse terminal/i })).not.toBeInTheDocument();
    });
  });

  // ── Progress Bar ──────────────────────────────────────────────────────
  describe('Progress Bar', () => {
    it('shows percentage text when loading and progressPercent is set', () => {
      render(<Terminal output={SAMPLE_OUTPUT} loading={true} progressPercent={42} />);
      expect(screen.getByText('42%')).toBeInTheDocument();
    });

    it('does not show progress bar when not loading', () => {
      render(<Terminal output={SAMPLE_OUTPUT} loading={false} progressPercent={50} />);
      expect(screen.queryByText('50%')).not.toBeInTheDocument();
    });

    it('does not show progress bar when progressPercent is null', () => {
      render(<Terminal output={SAMPLE_OUTPUT} loading={true} progressPercent={null} />);
      expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    });

    it('does not show progress bar when progressPercent is 0 but loading', () => {
      render(<Terminal output={SAMPLE_OUTPUT} loading={true} progressPercent={0} />);
      expect(screen.getByText('0%')).toBeInTheDocument();
    });
  });
});

