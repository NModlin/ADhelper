import { useState, useEffect, useCallback } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { useTheme } from '@mui/material/styles';

const TOUR_STORAGE_KEY = 'adhelper_tour_completed';

const tourSteps: Step[] = [
  {
    target: '.sidebar-nav',
    content:
      'Use the sidebar to navigate between tools — Dashboard, AD Helper, Jira Updater, and Settings.',
    disableBeacon: true,
    placement: 'right',
    title: 'Navigation',
  },
  {
    target: '.theme-toggle',
    content:
      'Toggle between dark and light themes to suit your preference.',
    title: 'Theme',
  },
  {
    target: 'body',
    content:
      'Press Ctrl+K at any time to open the Command Palette for quick navigation and actions.',
    placement: 'center',
    title: 'Command Palette',
  },
  {
    target: 'body',
    content:
      'Head to Settings first to configure your Active Directory and Jira credentials before using the tools.',
    placement: 'center',
    title: 'Get Started',
  },
];

/**
 * AppOnboarding — guided tour for first-time users using react-joyride.
 * Automatically runs once; progress is persisted in localStorage.
 */
export const AppOnboarding: React.FC = () => {
  const theme = useTheme();
  const [run, setRun] = useState(false);

  useEffect(() => {
    try {
      const completed = localStorage.getItem(TOUR_STORAGE_KEY);
      if (!completed) {
        // Small delay so the DOM mounts before joyride queries selectors
        const timer = setTimeout(() => setRun(true), 800);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage unavailable — skip tour silently
    }
  }, []);

  const handleCallback = useCallback((data: CallBackProps) => {
    const { status } = data;
    const finished = ([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(
      status,
    );
    if (finished) {
      setRun(false);
      try {
        localStorage.setItem(TOUR_STORAGE_KEY, 'true');
      } catch {
        // ignore
      }
    }
  }, []);

  return (
    <Joyride
      steps={tourSteps}
      run={run}
      continuous
      showProgress
      showSkipButton
      disableScrolling
      callback={handleCallback}
      styles={{
        options: {
          primaryColor: theme.palette.primary.main,
          textColor: theme.palette.text.primary,
          backgroundColor: theme.palette.background.paper,
          arrowColor: theme.palette.background.paper,
          zIndex: 1600,
        },
        tooltipTitle: {
          fontSize: 16,
          fontWeight: 600,
        },
        tooltipContent: {
          fontSize: 14,
        },
        buttonNext: {
          borderRadius: 8,
          fontSize: 13,
        },
        buttonBack: {
          color: theme.palette.text.secondary,
          fontSize: 13,
        },
        buttonSkip: {
          color: theme.palette.text.disabled,
          fontSize: 13,
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Done',
        next: 'Next',
        skip: 'Skip tour',
      }}
    />
  );
};

export default AppOnboarding;

