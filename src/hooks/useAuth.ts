// // // // // import { useAuth as useAuthContext } from '@/contexts/AuthContext'

export function useAuth() {
  const _auth = useAuthContext();

  // Helpers adicionales
  const _isAuthenticated = !!auth.user;
  const _isAdmin = auth.profile?.role === 'admin';
  const _isBarber = auth.profile?.role === 'barber';
  const _isCustomer = auth.profile?.role === 'customer';
  const _isOwner = auth.profile?.role === 'owner';

  // Create a simplified user object with role
  const _user = auth.user
    ? {
        id: auth.user.id,
        email: auth.user.email || '',
        name: auth.profile?.full_name || auth.user.email?.split('@')[0] || '',
        avatar: auth.profile?.avatar_url || undefined,
        role: auth.profile?.role, // No default role - wait for profile to load
      }
    : null;

  return {
    ...auth,
    user, // This will override the auth.user with our simplified version
    isAuthenticated,
    isAdmin,
    isBarber,
    isCustomer,
    isOwner,
  };
}
