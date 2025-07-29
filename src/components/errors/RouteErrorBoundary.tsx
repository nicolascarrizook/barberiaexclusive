import { useRouteError, useNavigate, isRouteErrorResponse } from 'react-router-dom';
import { AlertCircle, Home, RefreshCw, FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { errorLogger } from '@/utils/errorLogger';
import { useEffect } from 'react';

export function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();
  const isDevelopment = import.meta.env.DEV;

  useEffect(() => {
    // Log route errors
    if (error instanceof Error) {
      errorLogger.logError(error, undefined, {
        errorBoundary: 'RouteErrorBoundary',
        errorType: 'route',
      });
    } else if (isRouteErrorResponse(error)) {
      errorLogger.logWarning('Route error response', {
        status: error.status,
        statusText: error.statusText,
        data: error.data,
      });
    }
  }, [error]);

  const handleGoHome = () => {
    navigate('/');
  };

  const handleReload = () => {
    window.location.reload();
  };

  // Handle 404 errors
  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-muted flex items-center justify-center">
              <FileQuestion className="h-10 w-10 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">Página no encontrada</CardTitle>
            <CardDescription>
              Lo sentimos, la página que buscas no existe o ha sido movida.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                URL solicitada: <code className="text-sm">{window.location.pathname}</code>
              </AlertDescription>
            </Alert>
          </CardContent>

          <CardFooter className="flex gap-2">
            <Button onClick={handleGoHome} variant="default" className="flex-1">
              <Home className="mr-2 h-4 w-4" />
              Ir al inicio
            </Button>
            <Button onClick={() => navigate(-1)} variant="outline" className="flex-1">
              Volver atrás
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Handle other route errors
  const errorMessage = error instanceof Error 
    ? error.message 
    : isRouteErrorResponse(error) 
      ? `${error.status} - ${error.statusText}`
      : 'Error desconocido';

  const errorDetails = error instanceof Error
    ? error.stack
    : isRouteErrorResponse(error)
      ? JSON.stringify(error.data, null, 2)
      : null;

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <CardTitle>Error de navegación</CardTitle>
          </div>
          <CardDescription>
            Ha ocurrido un error al cargar esta ruta.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>

          {isDevelopment && errorDetails && (
            <details className="rounded-md border p-3">
              <summary className="cursor-pointer text-sm font-medium">
                Detalles del error (solo desarrollo)
              </summary>
              <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-muted-foreground">
                {errorDetails}
              </pre>
            </details>
          )}
        </CardContent>

        <CardFooter className="flex gap-2">
          <Button onClick={handleReload} variant="default" className="flex-1">
            <RefreshCw className="mr-2 h-4 w-4" />
            Recargar página
          </Button>
          <Button onClick={handleGoHome} variant="outline" className="flex-1">
            <Home className="mr-2 h-4 w-4" />
            Ir al inicio
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}