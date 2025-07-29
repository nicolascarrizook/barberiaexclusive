import { Component, ReactNode } from 'react';
import { errorLogger } from '@/utils/errorLogger';
import { ErrorMessage } from './ErrorMessage';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
  onError?: (error: Error) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AsyncErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    errorLogger.logError(error, errorInfo, {
      errorBoundary: 'AsyncErrorBoundary',
      retryCount: this.retryCount,
    });

    if (this.props.onError) {
      this.props.onError(error);
    }
  }

  handleRetry = () => {
    this.retryCount++;
    
    if (this.retryCount <= this.maxRetries) {
      this.setState({
        hasError: false,
        error: null,
      });
    } else {
      errorLogger.logWarning('Max retry attempts reached', {
        retryCount: this.retryCount,
        maxRetries: this.maxRetries,
      });
    }
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      if (fallback) {
        return fallback(error, this.handleRetry);
      }

      return (
        <div className="p-4">
          <ErrorMessage
            title="Error en operación asíncrona"
            message={error.message || 'Ha ocurrido un error al cargar los datos.'}
            severity="error"
            onRetry={this.retryCount < this.maxRetries ? this.handleRetry : undefined}
            details={import.meta.env.DEV ? error.stack : undefined}
            showDetails={import.meta.env.DEV}
          />
          {this.retryCount >= this.maxRetries && (
            <p className="mt-2 text-sm text-muted-foreground">
              Se alcanzó el número máximo de reintentos.
            </p>
          )}
        </div>
      );
    }

    return children;
  }
}