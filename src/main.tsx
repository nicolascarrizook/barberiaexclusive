import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { router } from '@/routes'
import { ErrorBoundary } from '@/components/errors'
import './index.css';
import './styles/animations.css';

// Initialize auth debugging in development
if (import.meta.env.DEV) {
  import('@/utils/authDebugger').then(({ authDebugger }) => {
    // Log auth state on app start in development
    setTimeout(() => {
      authDebugger.logAuthState();
    }, 2000);
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// Enhanced error handling for query client
queryClient.setMutationDefaults(['auth'], {
  retry: (failureCount, error: any) => {
    // Don't retry auth errors
    if (error?.message?.includes('Invalid login credentials')) {
      return false;
    }
    return failureCount < 2;
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary level="page">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
