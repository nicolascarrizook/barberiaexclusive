import { useAuth as useAuthContext } from '@/contexts/AuthContext'
import { useEffect, useState } from 'react'

export function useAuth() {
  const auth = useAuthContext();
  const [roleFromToken, setRoleFromToken] = useState<string | null>(null);

  // Extract role from JWT token as fallback
  useEffect(() => {
    if (auth.session?.user) {
      const user = auth.session.user;
      let role = null;
      
      // Check user_metadata first (custom claims)
      if (user.user_metadata?.role) {
        role = user.user_metadata.role;
      }
      // Check app_metadata (admin claims)
      else if (user.app_metadata?.role) {
        role = user.app_metadata.role;
      }
      // Check if role is in the JWT payload itself
      else if (user.role) {
        role = user.role;
      }
      
      setRoleFromToken(role);
    } else {
      setRoleFromToken(null);
    }
  }, [auth.session]);

  // Determine effective role with fallback logic
  const effectiveRole = auth.profile?.role || roleFromToken || 'customer';
  
  // Helpers adicionales
  const isAuthenticated = !!auth.user;
  const isAdmin = effectiveRole === 'admin';
  const isBarber = effectiveRole === 'barber';
  const isCustomer = effectiveRole === 'customer';
  const isOwner = effectiveRole === 'owner';

  // Create a simplified user object with role and profile info
  const user = auth.user
    ? {
        id: auth.user.id,
        email: auth.user.email || '',
        name: auth.profile?.full_name || auth.user.email?.split('@')[0] || '',
        avatar: auth.profile?.avatar_url || undefined,
        role: effectiveRole, // Use effective role with fallback
        profile: auth.profile, // Include full profile
      }
    : null;

  // Enhanced loading state that accounts for role determination
  const isLoadingProfile = auth.loading || (isAuthenticated && !auth.profile && !roleFromToken);

  return {
    ...auth,
    user, // This will override the auth.user with our simplified version
    loading: isLoadingProfile, // Enhanced loading state
    isAuthenticated,
    isAdmin,
    isBarber,
    isCustomer,
    isOwner,
    effectiveRole,
    hasProfileLoaded: !!auth.profile,
    hasTokenRole: !!roleFromToken,
  };
}
