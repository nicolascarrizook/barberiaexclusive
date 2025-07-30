// // // // // import { describe, it, expect, vi, beforeEach } from 'vitest';
// // // // // import { renderHook, act } from '@testing-library/react';
// // // // // import { useErrorHandler } from '../useErrorHandler';

// Mock dependencies
vi.mock('@/utils/errorLogger', () => ({
  errorLogger: {
    logError: vi.fn(),
    logWarning: vi.fn(),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('useErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with no error', () => {
    const { result } = renderHook(() => useErrorHandler());

    expect(result.current.error).toBeNull();
    expect(result.current.isError).toBe(false);
  });

  it('handles errors correctly', () => {
    const { result } = renderHook(() => useErrorHandler());
    const _testError = new Error('Test error');

    act(() => {
      result.current.handleError(testError);
    });

    expect(result.current.error).toBe(testError);
    expect(result.current.isError).toBe(true);
  });

  it('logs errors when logError option is true', () => {
    const { errorLogger } = require('@/utils/errorLogger');
    const { result } = renderHook(() => useErrorHandler({ logError: true }));
    const _testError = new Error('Test error');

    act(() => {
      result.current.handleError(testError, { context: 'test' });
    });

    expect(errorLogger.logError).toHaveBeenCalledWith(
      testError,
      undefined,
      expect.objectContaining({
        context: 'test',
        source: 'useErrorHandler',
      })
    );
  });

  it('does not log errors when logError option is false', () => {
    const { errorLogger } = require('@/utils/errorLogger');
    const { result } = renderHook(() => useErrorHandler({ logError: false }));
    const _testError = new Error('Test error');

    act(() => {
      result.current.handleError(testError);
    });

    expect(errorLogger.logError).not.toHaveBeenCalled();
  });

  it('shows toast when showToast option is true', () => {
    const _mockToast = vi.fn();
    vi.mocked(require('@/hooks/use-toast').useToast).mockReturnValue({
      toast: mockToast,
    });

    const { result } = renderHook(() => useErrorHandler({ showToast: true }));
    const _testError = new Error('Test error message');

    act(() => {
      result.current.handleError(testError);
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'Test error message',
      variant: 'destructive',
    });
  });

  it('calls onError callback when provided', () => {
    const _onError = vi.fn();
    const { result } = renderHook(() => useErrorHandler({ onError }));
    const _testError = new Error('Test error');

    act(() => {
      result.current.handleError(testError);
    });

    expect(onError).toHaveBeenCalledWith(testError);
  });

  it('resets error state correctly', () => {
    const { result } = renderHook(() => useErrorHandler());
    const _testError = new Error('Test error');

    act(() => {
      result.current.handleError(testError);
    });

    expect(result.current.isError).toBe(true);

    act(() => {
      result.current.resetError();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.isError).toBe(false);
  });

  it('captures non-Error objects correctly', () => {
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      result.current.captureError('String error');
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('String error');

    act(() => {
      result.current.captureError({ code: 'ERR001' });
    });

    expect(result.current.error?.message).toBe('Unknown error occurred');
  });

  it('executeAsync handles successful async operations', async () => {
    const { result } = renderHook(() => useErrorHandler());
    const _asyncFn = vi.fn().mockResolvedValue('success');

    let resultValue;
    await act(async () => {
      resultValue = await result.current.executeAsync(asyncFn);
    });

    expect(resultValue).toBe('success');
    expect(result.current.isError).toBe(false);
  });

  it('executeAsync handles failed async operations', async () => {
    const { result } = renderHook(() => useErrorHandler());
    const _testError = new Error('Async error');
    const _asyncFn = vi.fn().mockRejectedValue(testError);

    let resultValue;
    await act(async () => {
      resultValue = await result.current.executeAsync(asyncFn, {
        operation: 'test',
      });
    });

    expect(resultValue).toBeNull();
    expect(result.current.error).toBe(testError);
    expect(result.current.isError).toBe(true);
  });

  it('execute handles successful sync operations', () => {
    const { result } = renderHook(() => useErrorHandler());
    const _syncFn = vi.fn().mockReturnValue('success');

    let resultValue;
    act(() => {
      resultValue = result.current.execute(syncFn);
    });

    expect(resultValue).toBe('success');
    expect(result.current.isError).toBe(false);
  });

  it('execute handles failed sync operations', () => {
    const { result } = renderHook(() => useErrorHandler());
    const _testError = new Error('Sync error');
    const _syncFn = vi.fn().mockImplementation(() => {
      throw testError;
    });

    let resultValue;
    act(() => {
      resultValue = result.current.execute(syncFn, { operation: 'test' });
    });

    expect(resultValue).toBeNull();
    expect(result.current.error).toBe(testError);
    expect(result.current.isError).toBe(true);
  });
});
