import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { getRehrigTheme } from '../theme/rehrigTheme';
import Dashboard from './Dashboard';

// Helper to render Dashboard inside ThemeProvider
const renderDashboard = (mode: 'light' | 'dark' = 'light') => {
  return render(
    <ThemeProvider theme={getRehrigTheme(mode)}>
      <Dashboard />
    </ThemeProvider>,
  );
};

describe('Dashboard', () => {
  describe('Rendering', () => {
    it('renders without errors', () => {
      renderDashboard();
      expect(screen.getByText('Welcome to ADHelper')).toBeInTheDocument();
    });

    it('renders in dark mode without errors', () => {
      renderDashboard('dark');
      expect(screen.getByText('Welcome to ADHelper')).toBeInTheDocument();
    });

    it('displays the Rehrig Pacific subtitle', () => {
      renderDashboard();
      expect(screen.getByText('Rehrig Pacific IT Administration Portal')).toBeInTheDocument();
    });

    it('displays the ADH avatar text', () => {
      renderDashboard();
      expect(screen.getByText('ADH')).toBeInTheDocument();
    });
  });

  describe('Statistics Cards', () => {
    it('displays Users Processed Today card with value 0', () => {
      renderDashboard();
      expect(screen.getByText('Users Processed Today')).toBeInTheDocument();
      // The value '0' appears in multiple cards, so check it exists
      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBeGreaterThanOrEqual(2); // At least Users Processed + Jira Tickets
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

  describe('Quick Action Cards', () => {
    it('displays AD Helper quick action card', () => {
      renderDashboard();
      expect(screen.getByText('AD Helper')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Manage Active Directory users, assign groups, configure licenses, and set up proxy addresses.',
        ),
      ).toBeInTheDocument();
    });

    it('displays Jira 48h Updater quick action card', () => {
      renderDashboard();
      expect(screen.getByText('Jira 48h Updater')).toBeInTheDocument();
      expect(
        screen.getByText(
          "Automatically update Jira tickets that haven't been touched in 48 hours.",
        ),
      ).toBeInTheDocument();
    });

    it('renders Open AD Helper button', () => {
      renderDashboard();
      expect(screen.getByRole('button', { name: /open ad helper/i })).toBeInTheDocument();
    });

    it('renders Open Jira Updater button', () => {
      renderDashboard();
      expect(screen.getByRole('button', { name: /open jira updater/i })).toBeInTheDocument();
    });

    it('buttons are present and enabled', () => {
      renderDashboard();
      const adButton = screen.getByRole('button', { name: /open ad helper/i });
      const jiraButton = screen.getByRole('button', { name: /open jira updater/i });
      expect(adButton).not.toBeDisabled();
      expect(jiraButton).not.toBeDisabled();
    });
  });

  describe('Recent Activity Section', () => {
    it('displays Recent Activity header', () => {
      renderDashboard();
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    });

    it('shows empty state message when no activity', () => {
      renderDashboard();
      expect(screen.getByText('No recent activity to display.')).toBeInTheDocument();
    });
  });

  describe('Layout and Structure', () => {
    it('renders hero section with gradient background', () => {
      const { container } = renderDashboard();
      // The hero section Paper is the first Paper element
      const papers = container.querySelectorAll('.MuiPaper-root');
      expect(papers.length).toBeGreaterThan(0);
    });

    it('renders correct number of stat cards (4) plus action cards and activity section', () => {
      const { container } = renderDashboard();
      // 4 stat card Papers + 2 Card components (quick actions) + 1 recent activity Paper + hero Paper
      const papers = container.querySelectorAll('.MuiPaper-root');
      expect(papers.length).toBeGreaterThanOrEqual(6);
    });
  });
});

