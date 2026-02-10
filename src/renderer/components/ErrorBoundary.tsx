import { Component, ErrorInfo, ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Name shown in error UI so user knows which section crashed */
  sectionName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * React Error Boundary — catches render/lifecycle errors in child components
 * and shows a recovery UI instead of a white screen crash.
 *
 * Usage:
 *   <ErrorBoundary sectionName="AD Helper">
 *     <ADHelper />
 *   </ErrorBoundary>
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    // Log to console (will be replaced by proper logger in future)
    console.error(
      `[ErrorBoundary] ${this.props.sectionName || 'Component'} crashed:`,
      error,
      errorInfo.componentStack,
    );
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { sectionName } = this.props;
    const { error } = this.state;

    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 300,
          p: 3,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            maxWidth: 520,
            textAlign: 'center',
            borderTop: '4px solid #f44336',
          }}
        >
          <ErrorOutlineIcon sx={{ fontSize: 56, color: '#f44336', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            {sectionName ? `${sectionName} encountered an error` : 'Something went wrong'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {error?.message || 'An unexpected error occurred while rendering this section.'}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mb: 3 }}
          >
            Try clicking the button below to recover. If the problem persists, restart the app.
          </Typography>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={this.handleReset}
            sx={{ bgcolor: '#0536B6', '&:hover': { bgcolor: '#003063' } }}
          >
            Try Again
          </Button>
        </Paper>
      </Box>
    );
  }
}

export default ErrorBoundary;

