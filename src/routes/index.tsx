// // // // // import { createBrowserRouter } from 'react-router-dom';
// // // // // import { RootLayout } from '@/layouts/RootLayout';
// // // // // import { AuthLayout } from '@/layouts/AuthLayout';
// // // // // import { ProtectedLayout } from '@/layouts/ProtectedLayout';
// // // // // import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
// // // // // import { RouteErrorBoundary } from '@/components/errors';

// Pages
// // // // // import { HomePage } from '@/pages/HomePage';
// // // // // import { BookingPage } from '@/pages/BookingPage';
// // // // // import { LoginPage } from '@/pages/LoginPage';
// // // // // import { RegisterPage } from '@/pages/RegisterPage';
// // // // // import { AdminDashboard } from '@/pages/admin/Dashboard';
// // // // // import { AdminAppointments } from '@/pages/admin/Appointments';
// // // // // import { BarberDashboard } from '@/pages/barber/Dashboard';
// // // // // import { BarberSchedule } from '@/pages/barber/Schedule';
// // // // // import { BarberOnboarding } from '@/pages/barber/Onboarding';
// // // // // import { OwnerDashboard } from '@/pages/owner/Dashboard';
// // // // // import { OwnerSettings } from '@/pages/owner/Settings';
// // // // // import { CreateBarbershop } from '@/pages/owner/CreateBarbershop';
// // // // // import { Services } from '@/pages/owner/Services';
// // // // // import { Barbers } from '@/pages/owner/Barbers';
// // // // // import { OwnerHours } from '@/pages/owner/Hours';
// // // // // import { ProfilePage } from '@/pages/ProfilePage';
// // // // // import { NotFoundPage } from '@/pages/NotFoundPage';
// // // // // import { ErrorPage } from '@/pages/ErrorPage';

export const _router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'booking',
        element: <BookingPage />,
      },
      {
        path: 'profile',
        element: (
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'error',
        element: <ErrorPage />,
      },
    ],
  },
  {
    path: '/auth',
    element: <AuthLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'register',
        element: <RegisterPage />,
      },
    ],
  },
  {
    path: '/admin',
    element: <ProtectedLayout requiredRole="admin" />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        element: <AdminDashboard />,
      },
      {
        path: 'appointments',
        element: <AdminAppointments />,
      },
    ],
  },
  {
    path: '/barber',
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        path: 'onboarding',
        element: <BarberOnboarding />,
      },
      {
        element: <ProtectedLayout requiredRole="barber" />,
        children: [
          {
            index: true,
            element: <BarberDashboard />,
          },
          {
            path: 'schedule',
            element: <BarberSchedule />,
          },
        ],
      },
    ],
  },
  {
    path: '/owner',
    element: <ProtectedLayout requiredRole="owner" />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        element: <OwnerDashboard />,
      },
      {
        path: 'settings',
        element: <OwnerSettings />,
      },
      {
        path: 'barbershop/new',
        element: <CreateBarbershop />,
      },
      {
        path: 'services',
        element: <Services />,
      },
      {
        path: 'barbers',
        element: <Barbers />,
      },
      {
        path: 'hours',
        element: <OwnerHours />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
