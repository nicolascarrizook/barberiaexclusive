import { useState, useEffect, useCallback, useMemo } from 'react';

export type AuthLoadingStage = 
  | 'connecting'
  | 'authenticating'
  | 'loading_profile'
  | 'verifying_permissions'
  | 'finalizing'
  | 'complete'
  | 'error';

interface AuthLoadingState {
  stage: AuthLoadingStage;
  progress: number;
  message: string;
  error?: Error;
}

interface UseAuthLoadingStateOptions {
  onTimeout?: () => void;
  timeoutMs?: number;
}

export const useAuthLoadingState = (options?: UseAuthLoadingStateOptions) => {
  const { onTimeout, timeoutMs = 15000 } = options || {};
  
  const [state, setState] = useState<AuthLoadingState>({
    stage: 'connecting',
    progress: 0,
    message: 'Conectando con el servidor...'
  });

  const [startTime] = useState(Date.now());

  // Stage progression with associated progress and messages - moved outside component to prevent recreation
  const stageConfig = useMemo(() => ({
    connecting: { progress: 10, message: 'Conectando con el servidor...' },
    authenticating: { progress: 30, message: 'Verificando credenciales...' },
    loading_profile: { progress: 50, message: 'Cargando tu perfil...' },
    verifying_permissions: { progress: 70, message: 'Verificando permisos de acceso...' },
    finalizing: { progress: 90, message: 'Preparando tu experiencia...' },
    complete: { progress: 100, message: '¡Listo!' },
    error: { progress: 0, message: 'Se produjo un error' }
  }), []);

  const setStage = useCallback((stage: AuthLoadingStage, error?: Error) => {
    const config = stageConfig[stage];
    setState({
      stage,
      progress: config.progress,
      message: config.message,
      error
    });
  }, [stageConfig]);

  // Removed animateProgress to prevent loops - progress is now set directly with setStage

  // Handle timeout
  useEffect(() => {
    if (state.stage === 'complete' || state.stage === 'error') return;

    const timer = setTimeout(() => {
      setStage('error', new Error('La operación tardó demasiado tiempo'));
      onTimeout?.();
    }, timeoutMs);

    return () => clearTimeout(timer);
  }, [state.stage, timeoutMs, onTimeout, setStage]);

  // Removed natural progress increments to prevent state updates conflicts

  return {
    ...state,
    setStage,
    isLoading: state.stage !== 'complete' && state.stage !== 'error',
    isError: state.stage === 'error',
    isComplete: state.stage === 'complete'
  };
};

// Hook for progressive messages based on loading duration
export const useProgressiveMessage = (baseMessage: string, isLoading: boolean) => {
  const [message, setMessage] = useState(baseMessage);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    if (!isLoading) {
      setMessage(baseMessage);
      return;
    }

    const messages = [
      { after: 0, text: baseMessage },
      { after: 3000, text: `${baseMessage} Esto puede tomar unos segundos...` },
      { after: 6000, text: `${baseMessage} Casi listo...` },
      { after: 10000, text: `${baseMessage} Un momento más por favor...` }
    ];

    const timers = messages.map(({ after, text }) => {
      return setTimeout(() => {
        const elapsed = Date.now() - startTime;
        if (elapsed >= after) {
          setMessage(text);
        }
      }, after);
    });

    return () => timers.forEach(clearTimeout);
  }, [baseMessage, isLoading, startTime]);

  return message;
};