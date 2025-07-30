// // // // // import { AlertCircle, Home, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
// // // // // import { Button } from '@/components/ui/button';
// // // // // import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
// // // // // import { Alert, AlertDescription } from '@/components/ui/alert';
// // // // // import { useState } from 'react';
// // // // // import { useNavigate } from 'react-router-dom';
// // // // // import { ErrorFallbackProps } from './ErrorBoundary';

export function ErrorFallback({
  error,
  errorInfo,
  resetError,
  level = 'component',
}: ErrorFallbackProps) {
  const _navigate = useNavigate();
  const [showDetails, setShowDetails] = useState(false);
  const _isDevelopment = import.meta.env.DEV;

  const _handleGoHome = () => {
    navigate('/');
    resetError();
  };

  const _getErrorMessage = () => {
    switch (level) {
      case 'page':
        return 'Ha ocurrido un error al cargar esta página.';
      case 'section':
        return 'Ha ocurrido un error en esta sección.';
      default:
        return 'Ha ocurrido un error inesperado.';
    }
  };

  const _getErrorTitle = () => {
    switch (level) {
      case 'page':
        return 'Error en la página';
      case 'section':
        return 'Error en la sección';
      default:
        return 'Algo salió mal';
    }
  };

  return (
    <div
      className={`flex items-center justify-center ${level === 'page' ? 'min-h-screen' : 'min-h-[400px]'} p-4`}
    >
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <CardTitle>{getErrorTitle()}</CardTitle>
          </div>
          <CardDescription>{getErrorMessage()}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error.message || 'Se ha producido un error desconocido.'}
            </AlertDescription>
          </Alert>

          {isDevelopment && (
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between"
                onClick={() => setShowDetails(!showDetails)}
              >
                <span>Detalles del error</span>
                {showDetails ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>

              {showDetails && (
                <div className="space-y-2 text-xs">
                  {error.stack && (
                    <details className="rounded-md border p-3">
                      <summary className="cursor-pointer font-medium">
                        Stack trace
                      </summary>
                      <pre className="mt-2 whitespace-pre-wrap break-words text-muted-foreground">
                        {error.stack}
                      </pre>
                    </details>
                  )}

                  {errorInfo?.componentStack && (
                    <details className="rounded-md border p-3">
                      <summary className="cursor-pointer font-medium">
                        Component stack
                      </summary>
                      <pre className="mt-2 whitespace-pre-wrap break-words text-muted-foreground">
                        {errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex gap-2">
          <Button onClick={resetError} variant="default" className="flex-1">
            <RefreshCw className="mr-2 h-4 w-4" />
            Intentar de nuevo
          </Button>
          {level === 'page' && (
            <Button onClick={handleGoHome} variant="outline" className="flex-1">
              <Home className="mr-2 h-4 w-4" />
              Ir al inicio
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
