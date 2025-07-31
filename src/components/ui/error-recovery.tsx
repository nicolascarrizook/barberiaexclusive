import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Home, ArrowLeft, Clock } from 'lucide-react';

interface ErrorRecoveryProps {
  error: Error | string;
  onRetry?: () => void;
  onGoBack?: () => void;
  onGoHome?: () => void;
  className?: string;
  title?: string;
  showDetails?: boolean;
}

export const ErrorRecovery: React.FC<ErrorRecoveryProps> = ({
  error,
  onRetry,
  onGoBack,
  onGoHome,
  className,
  title = 'Se produjo un error',
  showDetails = true
}) => {
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  return (
    <div className={cn('flex flex-col items-center justify-center p-8 space-y-6', className)}>
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="relative">
            <AlertCircle className="h-16 w-16 text-destructive" />
            <div className="absolute inset-0 animate-ping">
              <AlertCircle className="h-16 w-16 text-destructive opacity-30" />
            </div>
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        
        {showDetails && (
          <p className="text-gray-600 max-w-md mx-auto">
            {errorMessage || 'Algo salió mal. Por favor, intenta nuevamente.'}
          </p>
        )}
      </div>
      
      <div className="flex flex-wrap gap-3 justify-center">
        {onRetry && (
          <Button onClick={onRetry} variant="default">
            <RefreshCw className="mr-2 h-4 w-4" />
            Reintentar
          </Button>
        )}
        
        {onGoBack && (
          <Button onClick={onGoBack} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        )}
        
        {onGoHome && (
          <Button onClick={onGoHome} variant="outline">
            <Home className="mr-2 h-4 w-4" />
            Ir al inicio
          </Button>
        )}
      </div>
      
      {showDetails && error instanceof Error && error.stack && (
        <details className="mt-4 text-xs text-gray-500 max-w-2xl">
          <summary className="cursor-pointer hover:text-gray-700">
            Detalles técnicos
          </summary>
          <pre className="mt-2 p-4 bg-gray-100 rounded overflow-auto">
            {error.stack}
          </pre>
        </details>
      )}
    </div>
  );
};

interface AuthErrorRecoveryProps {
  error: Error | string;
  onRetry?: () => void;
  onGoToLogin?: () => void;
  className?: string;
}

export const AuthErrorRecovery: React.FC<AuthErrorRecoveryProps> = ({
  error,
  onRetry,
  onGoToLogin,
  className
}) => {
  const isPermissionError = 
    typeof error === 'string' 
      ? error.toLowerCase().includes('permiso') || error.toLowerCase().includes('autorización')
      : error.message?.toLowerCase().includes('permiso') || error.message?.toLowerCase().includes('autorización');
  
  const isTimeoutError = 
    typeof error === 'string'
      ? error.toLowerCase().includes('tiempo') || error.toLowerCase().includes('timeout')
      : error.message?.toLowerCase().includes('tiempo') || error.message?.toLowerCase().includes('timeout');
  
  return (
    <div className={cn(
      'min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100',
      className
    )}>
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full space-y-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="h-10 w-10 text-red-600" />
              </div>
              {isTimeoutError && (
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Clock className="h-4 w-4 text-yellow-600" />
                </div>
              )}
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900">
            {isPermissionError 
              ? 'Error de permisos'
              : isTimeoutError
              ? 'Tiempo de espera agotado'
              : 'Error de autenticación'
            }
          </h2>
          
          <p className="text-gray-600">
            {isPermissionError 
              ? 'No tienes los permisos necesarios para acceder a esta sección.'
              : isTimeoutError
              ? 'La operación tardó demasiado tiempo. Por favor, verifica tu conexión.'
              : 'Hubo un problema al verificar tu identidad. Por favor, intenta nuevamente.'
            }
          </p>
        </div>
        
        <div className="space-y-3">
          {onRetry && (
            <Button onClick={onRetry} className="w-full" size="lg">
              <RefreshCw className="mr-2 h-4 w-4" />
              Intentar nuevamente
            </Button>
          )}
          
          {onGoToLogin && (
            <Button 
              onClick={onGoToLogin} 
              variant="outline" 
              className="w-full"
              size="lg"
            >
              Ir a iniciar sesión
            </Button>
          )}
        </div>
        
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Si el problema persiste, contacta con soporte
          </p>
        </div>
      </div>
    </div>
  );
};