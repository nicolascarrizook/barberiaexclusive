import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Navigation } from '@/components/layout/Navigation';
import { Toaster } from '@/components/ui/toaster';
import { SimpleAuthLoader } from '@/components/ui/minimalist-scissors-loader';

interface ProtectedLayoutProps {
  requiredRole?: 'admin' | 'barber' | 'customer' | 'owner';
}

export function ProtectedLayout({ requiredRole }: ProtectedLayoutProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <SimpleAuthLoader />;
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
