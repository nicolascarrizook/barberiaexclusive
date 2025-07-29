# Error Boundary System

Este proyecto implementa un sistema completo de manejo de errores utilizando Error Boundaries de React.

## Componentes

### ErrorBoundary
Componente principal para capturar errores en el árbol de componentes.

```tsx
import { ErrorBoundary } from '@/components/errors';

// Uso básico
<ErrorBoundary>
  <MyComponent />
</ErrorBoundary>

// Con fallback personalizado
<ErrorBoundary
  fallback={(props) => <CustomErrorComponent {...props} />}
  level="section"
>
  <MyComponent />
</ErrorBoundary>

// Con manejo de errores personalizado
<ErrorBoundary
  onError={(error, errorInfo) => {
    // Enviar a servicio de monitoreo
    console.log('Error capturado:', error);
  }}
>
  <MyComponent />
</ErrorBoundary>
```

### RouteErrorBoundary
Maneja errores específicos de rutas, incluyendo errores 404.

```tsx
// Se configura automáticamente en las rutas
{
  path: '/',
  element: <RootLayout />,
  errorElement: <RouteErrorBoundary />,
}
```

### ErrorMessage
Componente para mostrar mensajes de error de forma amigable.

```tsx
import { ErrorMessage } from '@/components/errors';

<ErrorMessage
  title="Error al cargar datos"
  message="No pudimos cargar la información solicitada."
  severity="error"
  onRetry={() => refetch()}
  onDismiss={() => setError(null)}
/>
```

### AsyncErrorBoundary
Maneja errores en operaciones asíncronas con reintentos automáticos.

```tsx
import { AsyncErrorBoundary } from '@/components/errors';

<AsyncErrorBoundary
  fallback={(error, retry) => (
    <ErrorMessage
      message={error.message}
      onRetry={retry}
    />
  )}
>
  <AsyncDataComponent />
</AsyncErrorBoundary>
```

## Hooks

### useErrorHandler
Hook para manejar errores de forma programática.

```tsx
import { useErrorHandler } from '@/hooks/useErrorHandler';

function MyComponent() {
  const { error, isError, handleError, executeAsync, resetError } = useErrorHandler({
    showToast: true,
    logError: true,
    onError: (error) => {
      // Manejo personalizado
    }
  });

  const fetchData = async () => {
    const data = await executeAsync(
      () => api.getData(),
      { operation: 'fetchData' }
    );
    
    if (data) {
      // Procesar datos
    }
  };

  if (isError) {
    return <ErrorMessage message={error.message} onRetry={resetError} />;
  }

  // Render normal
}
```

## Utilidades

### errorLogger
Sistema de logging de errores preparado para integración con servicios externos.

```tsx
import { errorLogger } from '@/utils/errorLogger';

// Log de error
errorLogger.logError(error, errorInfo, {
  userId: currentUser.id,
  action: 'booking_submit'
});

// Log de advertencia
errorLogger.logWarning('API rate limit approaching', {
  currentRate: 95,
  limit: 100
});

// Obtener errores almacenados (útil para debugging)
const recentErrors = errorLogger.getStoredErrors();
```

## Mejores Prácticas

### 1. Niveles de Error Boundary
Usa diferentes niveles según el contexto:
- `page`: Para errores que afectan toda la página
- `section`: Para errores en secciones específicas
- `component`: Para errores en componentes individuales

### 2. Fallbacks Personalizados
Proporciona fallbacks específicos para cada contexto:

```tsx
<ErrorBoundary
  level="component"
  fallback={(props) => (
    <div className="p-4 border border-destructive rounded">
      <p>Error al cargar el calendario</p>
      <Button onClick={props.resetError}>Reintentar</Button>
    </div>
  )}
>
  <Calendar />
</ErrorBoundary>
```

### 3. Integración con React Query
Para manejar errores en queries:

```tsx
const { data, error, refetch } = useQuery({
  queryKey: ['appointments'],
  queryFn: fetchAppointments,
  throwOnError: false, // Manejar errores manualmente
});

if (error) {
  return (
    <ErrorMessage
      title="Error al cargar citas"
      message={error.message}
      onRetry={() => refetch()}
    />
  );
}
```

### 4. Testing
Siempre prueba tus error boundaries:

```tsx
it('handles errors gracefully', () => {
  render(
    <ErrorBoundary>
      <ComponentThatThrows />
    </ErrorBoundary>
  );
  
  expect(screen.getByText(/algo salió mal/i)).toBeInTheDocument();
});
```

## Configuración para Producción

Para integrar con Sentry u otro servicio de monitoreo:

1. Instala el SDK de Sentry
2. Actualiza `errorLogger.ts`:

```tsx
import * as Sentry from '@sentry/react';

// En el método logError
if (!this.isDevelopment) {
  Sentry.captureException(error, {
    contexts: {
      react: {
        componentStack: errorInfo?.componentStack,
      },
    },
    extra: errorData,
  });
}
```

3. Configura Sentry en `main.tsx`:

```tsx
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay(),
  ],
});
```