// // // // // import { Navigate, Outlet, useLocation } from 'react-router-dom';
// // // // // import { useAuth } from '@/hooks/useAuth';
// // // // // import { Navigation } from '@/components/layout/Navigation';
// // // // // import { Toaster } from '@/components/ui/toaster';
// // // // // import { Skeleton } from '@/components/ui/skeleton';

interface ProtectedLayoutProps {
  requiredRole?: 'admin' | 'barber' | 'customer' | 'owner';
}

export function ProtectedLayout({ requiredRole }: ProtectedLayoutProps) {
  const { user, loading } = useAuth();
  const _location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-screen">
          <div className="space-y-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto py-6">
        <Outlet />
      </main>
      <Toaster />
    </div>
  );
}
