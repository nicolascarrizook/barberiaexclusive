import { AlertCircle, XCircle, Info, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ErrorSeverity = 'error' | 'warning' | 'info';

interface ErrorMessageProps {
  title?: string;
  message: string;
  severity?: ErrorSeverity;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
  details?: string;
  showDetails?: boolean;
}

export function ErrorMessage({
  title,
  message,
  severity = 'error',
  onRetry,
  onDismiss,
  className,
  details,
  showDetails = false,
}: ErrorMessageProps) {
  const getIcon = () => {
    switch (severity) {
      case 'error':
        return XCircle;
      case 'warning':
        return AlertTriangle;
      case 'info':
        return Info;
      default:
        return AlertCircle;
    }
  };

  const getVariant = () => {
    switch (severity) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'default';
      case 'info':
        return 'default';
      default:
        return 'destructive';
    }
  };

  const Icon = getIcon();

  return (
    <Alert variant={getVariant()} className={cn('relative', className)}>
      <Icon className="h-4 w-4" />
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription className="pr-8">
        {message}
        {showDetails && details && (
          <details className="mt-2">
            <summary className="cursor-pointer text-sm font-medium">
              Ver detalles
            </summary>
            <pre className="mt-2 whitespace-pre-wrap text-xs opacity-80">
              {details}
            </pre>
          </details>
        )}
      </AlertDescription>
      
      {(onRetry || onDismiss) && (
        <div className="absolute right-2 top-2 flex gap-1">
          {onRetry && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRetry}
              className="h-auto p-1"
            >
              Reintentar
            </Button>
          )}
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-auto p-1"
            >
              ✕
            </Button>
          )}
        </div>
      )}
    </Alert>
  );
}