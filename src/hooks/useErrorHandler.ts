import { useCallback, useState } from 'react';
import { errorLogger } from '@/utils/errorLogger';
import { useToast } from '@/hooks/use-toast';

interface UseErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
  onError?: (error: Error) => void;
}

export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const { showToast = true, logError = true, onError } = options;
  const { toast } = useToast();
  const [error, setError] = useState<Error | null>(null);
  const [isError, setIsError] = useState(false);

  const resetError = useCallback(() => {
    setError(null);
    setIsError(false);
  }, []);

  const handleError = useCallback(
    (error: Error, context?: Record<string, unknown>) => {
      setError(error);
      setIsError(true);

      if (logError) {
        errorLogger.logError(error, undefined, {
          ...context,
          source: 'useErrorHandler',
        });
      }

      if (showToast) {
        toast({
          title: 'Error',
          description: error.message || 'Ha ocurrido un error inesperado.',
          variant: 'destructive',
        });
      }

      if (onError) {
        onError(error);
      }
    },
    [logError, showToast, toast, onError]
  );

  const captureError = useCallback(
    (error: unknown, context?: Record<string, unknown>): void => {
      if (error instanceof Error) {
        handleError(error, context);
      } else {
        const syntheticError = new Error(
          typeof error === 'string' ? error : 'Unknown error occurred'
        );
        handleError(syntheticError, { ...context, originalError: error });
      }
    },
    [handleError]
  );

  const executeAsync = useCallback(
    async <T>(
      asyncFn: () => Promise<T>,
      context?: Record<string, unknown>
    ): Promise<T | null> => {
      try {
        resetError();
        return await asyncFn();
      } catch (error) {
        captureError(error, context);
        return null;
      }
    },
    [captureError, resetError]
  );

  const execute = useCallback(
    <T>(fn: () => T, context?: Record<string, unknown>): T | null => {
      try {
        resetError();
        return fn();
      } catch (error) {
        captureError(error, context);
        return null;
      }
    },
    [captureError, resetError]
  );

  return {
    error,
    isError,
    resetError,
    handleError,
    captureError,
    executeAsync,
    execute,
  };
}
