interface ErrorInfo {
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
  url: string;
  userAgent: string;
  errorBoundary?: string;
  errorBoundaryProps?: Record<string, unknown>;
  additionalInfo?: Record<string, unknown>;
}

class ErrorLogger {
  private isDevelopment = import.meta.env.DEV;

  /**
   * Logs an error to the console and prepares it for external logging services
   * In production, this would send to Sentry or similar service
   */
  logError(
    error: Error,
    errorInfo?: React.ErrorInfo,
    additionalContext?: Record<string, unknown>
  ) {
    const errorData: ErrorInfo = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      ...additionalContext,
    };

    // Always log to console in development
    if (this.isDevelopment) {
      console.group('🚨 Error Boundary Caught Error');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Additional Context:', additionalContext);
      console.table(errorData);
      console.groupEnd();
    }

    // In production, send to error tracking service
    if (!this.isDevelopment) {
      // TODO: Integrate with Sentry or similar service
      // Example:
      // Sentry.captureException(error, {
      //   contexts: {
      //     react: {
      //       componentStack: errorInfo?.componentStack,
      //     },
      //   },
      //   extra: errorData,
      // });

      // For now, just log to console
      console.error('Production error:', errorData);
    }

    // Store error in session storage for debugging
    this.storeErrorInSession(errorData);
  }

  /**
   * Stores recent errors in session storage for debugging
   */
  private storeErrorInSession(errorData: ErrorInfo) {
    try {
      const existingErrors = this.getStoredErrors();
      const updatedErrors = [errorData, ...existingErrors].slice(0, 10); // Keep last 10 errors
      sessionStorage.setItem(
        'barbershop_errors',
        JSON.stringify(updatedErrors)
      );
    } catch (e) {
      // Fail silently if storage is full or unavailable
      console.warn('Failed to store error in session storage:', e);
    }
  }

  /**
   * Retrieves stored errors from session storage
   */
  getStoredErrors(): ErrorInfo[] {
    try {
      const stored = sessionStorage.getItem('barbershop_errors');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Clears stored errors from session storage
   */
  clearStoredErrors() {
    try {
      sessionStorage.removeItem('barbershop_errors');
    } catch {
      // Fail silently
    }
  }

  /**
   * Logs a warning (non-fatal error)
   */
  logWarning(message: string, context?: Record<string, unknown>) {
    const warningData = {
      message,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      ...context,
    };

    if (this.isDevelopment) {
      console.warn('⚠️ Warning:', message, context);
    }

    // In production, you might want to send warnings to a different channel
    // or with a different severity level
  }
}

export const errorLogger = new ErrorLogger();
