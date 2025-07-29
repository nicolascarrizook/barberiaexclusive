import { useAuth as useAuthContext } from '@/contexts/AuthContext'

export function useAuth() {
  const auth = useAuthContext()
  
  // Helpers adicionales
  const isAuthenticated = !!auth.user
  const isAdmin = auth.profile?.role === 'admin'
  const isBarber = auth.profile?.role === 'barber'
  const isCustomer = auth.profile?.role === 'customer'
  const isOwner = auth.profile?.role === 'owner'
  
  // Log para debug
  if (auth.user && !auth.loading) {
    console.log('[useAuth] Estado actual:', {
      userId: auth.user.id,
      email: auth.user.email,
      profile: auth.profile,
      role: auth.profile?.role,
      isAdmin,
      isBarber,
      isCustomer,
      isOwner
    })
  }
  
  // Create a simplified user object with role
  const user = auth.user ? {
    id: auth.user.id,
    email: auth.user.email || '',
    name: auth.profile?.full_name || auth.user.email?.split('@')[0] || '',
    avatar: auth.profile?.avatar_url || undefined,
    role: auth.profile?.role // No default role - wait for profile to load
  } : null
  
  return {
    ...auth,
    user, // This will override the auth.user with our simplified version
    isAuthenticated,
    isAdmin,
    isBarber,
    isCustomer,
    isOwner,
  }
}