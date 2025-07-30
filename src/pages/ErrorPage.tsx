// // // // // import { AlertCircle, Home, RefreshCw, Mail, Phone } from 'lucide-react';
// // // // // import { Button } from '@/components/ui/button';
// // // // // import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
// // // // // import { Alert, AlertDescription } from '@/components/ui/alert';
// // // // // import { Separator } from '@/components/ui/separator';
// // // // // import { useNavigate, useSearchParams } from 'react-router-dom';

interface ErrorPageProps {
  title?: string;
  message?: string;
  showContact?: boolean;
}

export function ErrorPage({
  title = 'Ha ocurrido un error',
  message = 'Lo sentimos, algo salió mal. Por favor, intenta de nuevo más tarde.',
  showContact = true,
}: ErrorPageProps) {
  const _navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Get error details from URL params if available
  const _errorCode = searchParams.get('code');
  const _errorType = searchParams.get('type');

  const _getErrorMessage = () => {
    if (errorCode) {
      switch (errorCode) {
        case '500':
          return 'Error interno del servidor. Estamos trabajando para solucionarlo.';
        case '503':
          return 'Servicio temporalmente no disponible. Por favor, intenta más tarde.';
        case '403':
          return 'No tienes permisos para acceder a este recurso.';
        case '401':
          return 'Necesitas iniciar sesión para acceder a esta página.';
        default:
          return message;
      }
    }
    return message;
  };

  const _handleReload = () => {
    window.location.reload();
  };

  const _handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center space-y-6">
          <div className="mx-auto h-24 w-24 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl">{title}</CardTitle>
            {errorCode && (
              <p className="text-4xl font-bold text-muted-foreground">
                {errorCode}
              </p>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{getErrorMessage()}</AlertDescription>
          </Alert>

          <div className="space-y-4 text-center text-sm text-muted-foreground">
            <p>
              Si el problema persiste, por favor intenta las siguientes
              opciones:
            </p>
            <ul className="space-y-2 text-left max-w-sm mx-auto">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Recarga la página para intentar nuevamente</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Verifica tu conexión a internet</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Intenta acceder más tarde</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Limpia la caché de tu navegador</span>
              </li>
            </ul>
          </div>

          {showContact && (
            <>
              <Separator />
              <div className="space-y-3">
                <p className="text-sm font-medium text-center">
                  ¿Necesitas ayuda?
                </p>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    soporte@barbershop.com
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                  >
                    <Phone className="mr-2 h-4 w-4" />
                    +1 (555) 123-4567
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>

        <CardFooter className="flex gap-2">
          <Button onClick={handleReload} variant="default" className="flex-1">
            <RefreshCw className="mr-2 h-4 w-4" />
            Reintentar
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
