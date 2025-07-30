// // // // // import { Outlet } from 'react-router-dom';
// // // // // import { Navigation } from '@/components/layout/Navigation';
// // // // // import { Toaster } from '@/components/ui/toaster';

export function RootLayout() {
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
