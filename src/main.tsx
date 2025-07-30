import React from 'react';
import ReactDOM from 'react-dom/client';
// // // // // import { RouterProvider } from 'react-router-dom'
// // // // // import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
// // // // // import { AuthProvider } from '@/contexts/AuthContext'
// // // // // import { router } from '@/routes'
// // // // // import { ErrorBoundary } from '@/components/errors'
import './index.css';

const _queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos
      retry: 1,
      refetchOnWindowFocus: false,
    },
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
