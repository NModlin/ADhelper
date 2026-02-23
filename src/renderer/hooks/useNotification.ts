import { useSnackbar, VariantType, SnackbarKey } from 'notistack';
import { useCallback } from 'react';

/**
 * Custom hook wrapping notistack for consistent toast notifications.
 *
 * Usage:
 *   const { showSuccess, showError, showWarning, showInfo } = useNotification();
 *   showSuccess('User processed successfully!');
 *   showError('Failed to connect', handleRetry);
 */
export const useNotification = () => {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  /** Generic notification helper */
  const showNotification = useCallback(
    (
      message: string,
      variant: VariantType = 'default',
      options?: { persist?: boolean; autoHideDuration?: number },
    ): SnackbarKey => {
      return enqueueSnackbar(message, {
        variant,
        ...options,
      });
    },
    [enqueueSnackbar],
  );

  /** Show a green success toast (auto-dismiss 5 s) */
  const showSuccess = useCallback(
    (message: string): SnackbarKey => {
      return enqueueSnackbar(message, { variant: 'success' });
    },
    [enqueueSnackbar],
  );

  /** Show a red error toast – persists until dismissed. Optional retry callback. */
  const showError = useCallback(
    (message: string): SnackbarKey => {
      return enqueueSnackbar(message, {
        variant: 'error',
        autoHideDuration: 8000,
      });
    },
    [enqueueSnackbar],
  );

  /** Show an orange warning toast */
  const showWarning = useCallback(
    (message: string): SnackbarKey => {
      return enqueueSnackbar(message, { variant: 'warning' });
    },
    [enqueueSnackbar],
  );

  /** Show a blue info toast */
  const showInfo = useCallback(
    (message: string): SnackbarKey => {
      return enqueueSnackbar(message, { variant: 'info' });
    },
    [enqueueSnackbar],
  );

  /** Programmatically close a specific toast */
  const dismiss = useCallback(
    (key?: SnackbarKey) => {
      closeSnackbar(key);
    },
    [closeSnackbar],
  );

  return {
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    dismiss,
  } as const;
};

