import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { errorLogger } from '../errorLogger';

describe('ErrorLogger', () => {
  // Mock console methods
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  const originalConsoleGroup = console.group;
  const originalConsoleGroupEnd = console.groupEnd;
  const originalConsoleTable = console.table;

  beforeEach(() => {
    // Clear session storage
    sessionStorage.clear();

    // Mock console methods
    console.error = vi.fn();
    console.warn = vi.fn();
    console.group = vi.fn();
    console.groupEnd = vi.fn();
    console.table = vi.fn();

    // Mock environment
    vi.stubEnv('DEV', true);
  });

  afterEach(() => {
    // Restore console methods
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    console.group = originalConsoleGroup;
    console.groupEnd = originalConsoleGroupEnd;
    console.table = originalConsoleTable;

    vi.unstubAllEnvs();
  });

  describe('logError', () => {
    it('logs error to console in development', () => {
      const error = new Error('Test error');
      const errorInfo = { componentStack: 'Component stack trace' };
      const additionalContext = { userId: '123' };

      errorLogger.logError(error, errorInfo, additionalContext);

      expect(console.group).toHaveBeenCalledWith(
        '🚨 Error Boundary Caught Error'
      );
      expect(console.error).toHaveBeenCalledWith('Error:', error);
      expect(console.error).toHaveBeenCalledWith('Error Info:', errorInfo);
      expect(console.error).toHaveBeenCalledWith(
        'Additional Context:',
        additionalContext
      );
      expect(console.table).toHaveBeenCalled();
      expect(console.groupEnd).toHaveBeenCalled();
    });

    it('stores error in session storage', () => {
      const error = new Error('Test error');

      errorLogger.logError(error);

      const storedErrors = errorLogger.getStoredErrors();
      expect(storedErrors).toHaveLength(1);
      expect(storedErrors[0].message).toBe('Test error');
      expect(storedErrors[0].timestamp).toBeDefined();
      expect(storedErrors[0].url).toBe(window.location.href);
      expect(storedErrors[0].userAgent).toBe(navigator.userAgent);
    });

    it('limits stored errors to 10 most recent', () => {
      // Add 15 errors
      for (let i = 0; i < 15; i++) {
        errorLogger.logError(new Error(`Error ${i}`));
      }

      const storedErrors = errorLogger.getStoredErrors();
      expect(storedErrors).toHaveLength(10);
      expect(storedErrors[0].message).toBe('Error 14'); // Most recent
      expect(storedErrors[9].message).toBe('Error 5'); // 10th most recent
    });

    it('handles session storage errors gracefully', () => {
      // Mock sessionStorage to throw error
      const originalSetItem = sessionStorage.setItem;
      sessionStorage.setItem = vi.fn().mockImplementation(() => {
        throw new Error('Storage full');
      });

      // Should not throw
      expect(() => {
        errorLogger.logError(new Error('Test error'));
      }).not.toThrow();

      expect(console.warn).toHaveBeenCalledWith(
        'Failed to store error in session storage:',
        expect.any(Error)
      );

      sessionStorage.setItem = originalSetItem;
    });

    it('logs to console in production mode', () => {
      vi.stubEnv('DEV', false);

      const error = new Error('Production error');
      errorLogger.logError(error);

      expect(console.error).toHaveBeenCalledWith(
        'Production error:',
        expect.objectContaining({
          message: 'Production error',
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('logWarning', () => {
    it('logs warning in development', () => {
      const message = 'Test warning';
      const context = { code: 'WARN001' };

      errorLogger.logWarning(message, context);

      expect(console.warn).toHaveBeenCalledWith(
        '⚠️ Warning:',
        message,
        context
      );
    });

    it('does not log warning in production', () => {
      vi.stubEnv('DEV', false);

      errorLogger.logWarning('Test warning');

      expect(console.warn).not.toHaveBeenCalled();
    });
  });

  describe('getStoredErrors', () => {
    it('returns empty array when no errors stored', () => {
      const errors = errorLogger.getStoredErrors();
      expect(errors).toEqual([]);
    });

    it('returns stored errors', () => {
      errorLogger.logError(new Error('Error 1'));
      errorLogger.logError(new Error('Error 2'));

      const errors = errorLogger.getStoredErrors();
      expect(errors).toHaveLength(2);
      expect(errors[0].message).toBe('Error 2'); // Most recent first
      expect(errors[1].message).toBe('Error 1');
    });

    it('handles corrupted storage data', () => {
      sessionStorage.setItem('barbershop_errors', 'invalid json');

      const errors = errorLogger.getStoredErrors();
      expect(errors).toEqual([]);
    });
  });

  describe('clearStoredErrors', () => {
    it('clears all stored errors', () => {
      errorLogger.logError(new Error('Error 1'));
      errorLogger.logError(new Error('Error 2'));

      expect(errorLogger.getStoredErrors()).toHaveLength(2);

      errorLogger.clearStoredErrors();

      expect(errorLogger.getStoredErrors()).toHaveLength(0);
    });

    it('handles storage errors gracefully', () => {
      const originalRemoveItem = sessionStorage.removeItem;
      sessionStorage.removeItem = vi.fn().mockImplementation(() => {
        throw new Error('Storage error');
      });

      // Should not throw
      expect(() => {
        errorLogger.clearStoredErrors();
      }).not.toThrow();

      sessionStorage.removeItem = originalRemoveItem;
    });
  });
});
