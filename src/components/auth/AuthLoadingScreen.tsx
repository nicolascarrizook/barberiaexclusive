import React from 'react';
import { cn } from '@/lib/utils';
import { 
  BarberShopLogo, 
  ProgressBar, 
  StageProgress,
  LoadingDots 
} from '@/components/ui/premium-loader';
import { AuthLoadingStage } from '@/hooks/useAuthLoadingState';

interface AuthLoadingScreenProps {
  stage: AuthLoadingStage;
  progress: number;
  message: string;
  error?: Error;
  className?: string;
}

export const AuthLoadingScreen: React.FC<AuthLoadingScreenProps> = ({
  stage,
  progress,
  message,
  error,
  className
}) => {
  const stages = [
    'Conectando',
    'Autenticando',
    'Cargando perfil',
    'Verificando permisos',
    'Preparando'
  ];

  const stageIndex = {
    connecting: 0,
    authenticating: 1,
    loading_profile: 2,
    verifying_permissions: 3,
    finalizing: 4,
    complete: 5,
    error: -1
  }[stage];

  return (
    <div className={cn(
      'fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100',
      className
    )}>
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-md p-8">
        <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-8">
          {/* Logo and title */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <BarberShopLogo size="xl" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Barbería Exclusive
            </h1>
            <p className="text-sm text-gray-500">
              Experiencia premium en corte y estilo
            </p>
          </div>

          {/* Progress section */}
          <div className="space-y-6">
            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Progreso</span>
                <span className="text-primary font-medium">{progress}%</span>
              </div>
              <ProgressBar progress={progress} className="h-3" />
            </div>

            {/* Stage progress */}
            {stageIndex >= 0 && (
              <StageProgress 
                stages={stages} 
                currentStage={stageIndex}
                className="mt-6" 
              />
            )}

            {/* Current status message */}
            <div className="text-center space-y-2 pt-4">
              <p className="text-gray-700 font-medium flex items-center justify-center gap-2">
                {message}
                {stage !== 'error' && stage !== 'complete' && (
                  <LoadingDots className="ml-2" />
                )}
              </p>
              
              {/* Error display */}
              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">
                    {error.message || 'Se produjo un error inesperado'}
                  </p>
                </div>
              )}

              {/* Additional info based on stage */}
              {stage === 'verifying_permissions' && (
                <p className="text-xs text-gray-500 mt-2">
                  Configurando tu experiencia personalizada...
                </p>
              )}
              
              {stage === 'finalizing' && (
                <p className="text-xs text-gray-500 mt-2">
                  ¡Casi listo! Preparando tu panel de control...
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-400 pt-4 border-t">
            <p>Cargando de forma segura</p>
            <p className="flex items-center justify-center gap-1 mt-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              Conexión encriptada
            </p>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -top-4 -left-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl animate-pulse" />
        <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-secondary/10 rounded-full blur-2xl animate-pulse animation-delay-1000" />
      </div>
    </div>
  );
};

// Compact loader for inline loading states
interface CompactAuthLoaderProps {
  message?: string;
  className?: string;
}

export const CompactAuthLoader: React.FC<CompactAuthLoaderProps> = ({
  message = 'Cargando...',
  className
}) => {
  return (
    <div className={cn(
      'flex items-center justify-center min-h-screen bg-gray-50',
      className
    )}>
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full">
        <div className="flex flex-col items-center space-y-4">
          <BarberShopLogo size="lg" />
          <p className="text-gray-700 font-medium text-center flex items-center gap-2">
            {message}
            <LoadingDots />
          </p>
        </div>
      </div>
    </div>
  );
};