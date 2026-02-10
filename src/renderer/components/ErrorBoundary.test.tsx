import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

// Suppress console.error from React's error boundary logging during tests
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

/** A component that throws on render */
function ThrowingComponent({ message }: { message: string }): React.ReactNode {
  throw new Error(message);
}

/** A component that renders normally */
function GoodComponent() {
  return <div data-testid="good">All good</div>;
}

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <GoodComponent />
      </ErrorBoundary>,
    );

    expect(screen.getByTestId('good')).toBeInTheDocument();
    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('renders error UI when a child throws', () => {
    render(
      <ErrorBoundary sectionName="Test Section">
        <ThrowingComponent message="Test crash" />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Test Section encountered an error')).toBeInTheDocument();
    expect(screen.getByText('Test crash')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('shows generic message when no sectionName is provided', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent message="Oops" />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('recovers when "Try Again" is clicked and child no longer throws', () => {
    let shouldThrow = true;

    function ConditionalThrower() {
      if (shouldThrow) throw new Error('Conditional crash');
      return <div data-testid="recovered">Recovered</div>;
    }

    render(
      <ErrorBoundary sectionName="Conditional">
        <ConditionalThrower />
      </ErrorBoundary>,
    );

    // Should show error UI
    expect(screen.getByText('Conditional encountered an error')).toBeInTheDocument();

    // Fix the component and click Try Again
    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    // Should now render the recovered component
    expect(screen.getByTestId('recovered')).toBeInTheDocument();
    expect(screen.getByText('Recovered')).toBeInTheDocument();
  });
});

