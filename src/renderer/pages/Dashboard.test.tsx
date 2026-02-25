import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { getRehrigTheme } from '../theme/rehrigTheme';
import Dashboard from './Dashboard';

// Helper to render Dashboard inside ThemeProvider
const renderDashboard = (
  mode: 'light' | 'dark' = 'light',
  onNavigate?: (pageId: string) => void,
) => {
  return render(
    <ThemeProvider theme={getRehrigTheme(mode)}>
      <Dashboard onNavigate={onNavigate} />
    </ThemeProvider>,
  );
};

describe('Dashboard', () => {
  describe('Rendering', () => {
    it('renders without errors', () => {
      renderDashboard();
      // Hero section shows a time-based greeting
      expect(
        screen.getByText(/Good (morning|afternoon|evening)/),
      ).toBeInTheDocument();
    });

    it('renders in dark mode without errors', () => {
      renderDashboard('dark');
      expect(
        screen.getByText(/Good (morning|afternoon|evening)/),
      ).toBeInTheDocument();
    });

    it('displays the Rehrig Pacific subtitle', () => {
      renderDashboard();
      expect(
        screen.getByText(/Rehrig Pacific IT Administration Portal/),
      ).toBeInTheDocument();
    });

    it('displays the Rehrig Pacific avatar image', () => {
      renderDashboard();
      expect(screen.getByAltText('Rehrig Pacific')).toBeInTheDocument();
    });
  });

  describe('Statistics Cards', () => {
    it('displays Users Processed Today card with value 0', () => {
      renderDashboard();
      expect(screen.getByText('Users Processed Today')).toBeInTheDocument();
      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBeGreaterThanOrEqual(2);
    });

    it('displays Jira Tickets Updated card', () => {
      renderDashboard();
      expect(screen.getByText('Jira Tickets Updated')).toBeInTheDocument();
    });

    it('displays Success Rate card with value 100%', () => {
      renderDashboard();
      expect(screen.getByText('Success Rate')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('displays Active Sessions card with value 1', () => {
      renderDashboard();
      expect(screen.getByText('Active Sessions')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('renders all 4 statistics cards', () => {
      renderDashboard();
      const titles = [
        'Users Processed Today',
        'Jira Tickets Updated',
        'Success Rate',
        'Active Sessions',
      ];
      titles.forEach((title) => {
        expect(screen.getByText(title)).toBeInTheDocument();
      });
    });
  });

  describe('Quick Actions Panel', () => {
    it('displays AD Helper quick action', () => {
      renderDashboard();
      expect(screen.getByText('AD Helper')).toBeInTheDocument();
      expect(screen.getByText('Manage users, groups & licenses')).toBeInTheDocument();
    });

    it('displays Jira Updater quick action', () => {
      renderDashboard();
      expect(screen.getByText('Jira Updater')).toBeInTheDocument();
      expect(screen.getByText('Update stale Jira tickets')).toBeInTheDocument();
    });

    it('displays Settings quick action', () => {
      renderDashboard();
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Credentials & configuration')).toBeInTheDocument();
    });

    it('renders quick action buttons that are clickable', () => {
      renderDashboard();
      const adAction = screen.getByText('AD Helper').closest('[role="button"]');
      const jiraAction = screen.getByText('Jira Updater').closest('[role="button"]');
      expect(adAction).toBeInTheDocument();
      expect(jiraAction).toBeInTheDocument();
    });

    it('calls onNavigate when quick action is clicked', () => {
      const onNavigate = vi.fn();
      renderDashboard('light', onNavigate);
      const adAction = screen.getByText('AD Helper').closest('[role="button"]');
      if (adAction) fireEvent.click(adAction);
      expect(onNavigate).toHaveBeenCalledWith('adhelper');
    });
  });

  describe('Recent Activity Section', () => {
    it('displays Recent Activity header', () => {
      renderDashboard();
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    });

    it('shows empty state message when no activity', () => {
      renderDashboard();
      expect(screen.getByText('No recent activity')).toBeInTheDocument();
    });
  });

  describe('Layout and Structure', () => {
    it('renders hero section with gradient background', () => {
      const { container } = renderDashboard();
      const papers = container.querySelectorAll('.MuiPaper-root');
      expect(papers.length).toBeGreaterThan(0);
    });

    it('renders stat cards, activity timeline, and quick actions panels', () => {
      const { container } = renderDashboard();
      // hero Paper + 4 stat Card + activity Paper + quick actions Paper = 7
      const papers = container.querySelectorAll('.MuiPaper-root');
      expect(papers.length).toBeGreaterThanOrEqual(7);
    });
  });
});
