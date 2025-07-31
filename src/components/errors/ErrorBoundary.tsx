import React, { Component, ReactNode } from 'react';
import { errorLogger } from '@/utils/errorLogger';
import { ErrorFallback } from './ErrorFallback';

interface Props {
  children: ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  isolate?: boolean;
  level?: 'page' | 'section' | 'component';
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorBoundaryKey: number;
}

export interface ErrorFallbackProps {
  error: Error;
  errorInfo: React.ErrorInfo | null;
  resetError: () => void;
  level?: 'page' | 'section' | 'component';
}

export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;
  private previousResetKeys: Array<string | number> = [];

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorBoundaryKey: 0,
    };

    if (props.resetKeys) {
      this.previousResetKeys = props.resetKeys;
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { onError, level = 'component' } = this.props;

    // Log the error
    errorLogger.logError(error, errorInfo, {
      errorBoundary: this.constructor.name,
      errorBoundaryProps: {
        level,
        isolate: this.props.isolate,
      },
    });

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }

    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Auto-reset after 10 seconds for component-level errors
    if (level === 'component' && this.props.isolate) {
      this.resetTimeoutId = window.setTimeout(() => {
        this.resetError();
      }, 10000);
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    // Reset error if resetKeys have changed
    if (hasError && resetKeys && prevProps.resetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        (key, idx) => key !== this.previousResetKeys[idx]
      );

      if (hasResetKeyChanged) {
        this.resetError();
        this.previousResetKeys = resetKeys;
      }
    }

    // Reset error if props have changed and resetOnPropsChange is true
    if (
      hasError &&
      resetOnPropsChange &&
      prevProps.children !== this.props.children
    ) {
      this.resetError();
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  resetError = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }

    this.setState((prevState) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      errorBoundaryKey: prevState.errorBoundaryKey + 1,
    }));
  };

  render() {
    const { hasError, error, errorInfo } = this.state;
    const {
      children,
      fallback: FallbackComponent,
      level = 'component',
    } = this.props;

    if (hasError && error) {
      const errorProps: ErrorFallbackProps = {
        error,
        errorInfo,
        resetError: this.resetError,
        level,
      };

      if (FallbackComponent) {
        return <FallbackComponent {...errorProps} />;
      }

      return <ErrorFallback {...errorProps} />;
    }

    return (
      <React.Fragment key={this.state.errorBoundaryKey}>
        {children}
      </React.Fragment>
    );
  }
}
