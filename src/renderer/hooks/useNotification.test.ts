import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// ── Hoisted mocks ──────────────────────────────────────────────────────
const mocks = vi.hoisted(() => ({
  enqueueSnackbar: vi.fn().mockReturnValue('snackbar-key-1'),
  closeSnackbar: vi.fn(),
}));

vi.mock('notistack', () => ({
  useSnackbar: () => ({
    enqueueSnackbar: mocks.enqueueSnackbar,
    closeSnackbar: mocks.closeSnackbar,
  }),
}));

import { useNotification } from './useNotification';

describe('useNotification hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('showSuccess calls enqueueSnackbar with variant "success"', () => {
    const { result } = renderHook(() => useNotification());
    const key = result.current.showSuccess('User saved!');

    expect(mocks.enqueueSnackbar).toHaveBeenCalledWith('User saved!', { variant: 'success' });
    expect(key).toBe('snackbar-key-1');
  });

  it('showError calls enqueueSnackbar with variant "error" and 8000ms autoHide', () => {
    const { result } = renderHook(() => useNotification());
    const key = result.current.showError('Something went wrong');

    expect(mocks.enqueueSnackbar).toHaveBeenCalledWith('Something went wrong', {
      variant: 'error',
      autoHideDuration: 8000,
    });
    expect(key).toBe('snackbar-key-1');
  });

  it('showWarning calls enqueueSnackbar with variant "warning"', () => {
    const { result } = renderHook(() => useNotification());
    const key = result.current.showWarning('Careful!');

    expect(mocks.enqueueSnackbar).toHaveBeenCalledWith('Careful!', { variant: 'warning' });
    expect(key).toBe('snackbar-key-1');
  });

  it('showInfo calls enqueueSnackbar with variant "info"', () => {
    const { result } = renderHook(() => useNotification());
    const key = result.current.showInfo('FYI');

    expect(mocks.enqueueSnackbar).toHaveBeenCalledWith('FYI', { variant: 'info' });
    expect(key).toBe('snackbar-key-1');
  });

  it('showNotification accepts custom variant and options', () => {
    const { result } = renderHook(() => useNotification());
    const key = result.current.showNotification('Custom', 'default', { persist: true });

    expect(mocks.enqueueSnackbar).toHaveBeenCalledWith('Custom', {
      variant: 'default',
      persist: true,
    });
    expect(key).toBe('snackbar-key-1');
  });

  it('dismiss calls closeSnackbar with a specific key', () => {
    const { result } = renderHook(() => useNotification());
    result.current.dismiss('some-key');

    expect(mocks.closeSnackbar).toHaveBeenCalledWith('some-key');
  });

  it('dismiss calls closeSnackbar with no args when key is omitted', () => {
    const { result } = renderHook(() => useNotification());
    result.current.dismiss();

    expect(mocks.closeSnackbar).toHaveBeenCalledWith(undefined);
  });

  it('returns stable function references across re-renders', () => {
    const { result, rerender } = renderHook(() => useNotification());
    const first = result.current;
    rerender();
    const second = result.current;

    expect(first.showSuccess).toBe(second.showSuccess);
    expect(first.showError).toBe(second.showError);
    expect(first.showWarning).toBe(second.showWarning);
    expect(first.showInfo).toBe(second.showInfo);
    expect(first.dismiss).toBe(second.dismiss);
  });
});

