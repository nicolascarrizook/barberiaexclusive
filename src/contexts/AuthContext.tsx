import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { authService, SignUpData, SignInData, ProfileWithBarber } from '@/services/auth.service'
import { Database } from '@/types/database'

type Profile = ProfileWithBarber;

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signUp: (data: SignUpData) => Promise<void>;
  signIn: (data: SignInData) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileAttempted, setProfileAttempted] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Cache key for profile storage
  const getProfileCacheKey = (userId: string) => `barber_profile_${userId}`;
  
  // Load profile from cache as fallback
  const loadProfileFromCache = (userId: string): Profile | null => {
    try {
      const cached = localStorage.getItem(getProfileCacheKey(userId));
      if (cached) {
        const parsed = JSON.parse(cached);
        // Check if cache is not too old (1 hour)
        if (Date.now() - parsed.timestamp < 3600000) {
          return parsed.profile;
        }
      }
    } catch (error) {
      console.warn('[AuthContext] Error loading cached profile:', error);
    }
    return null;
  };
  
  // Save profile to cache
  const saveProfileToCache = (userId: string, profile: Profile) => {
    try {
      localStorage.setItem(getProfileCacheKey(userId), JSON.stringify({
        profile,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.warn('[AuthContext] Error caching profile:', error);
    }
  };
  
  // Clear profile cache
  const clearProfileCache = (userId?: string) => {
    try {
      if (userId) {
        localStorage.removeItem(getProfileCacheKey(userId));
      } else {
        // Clear all profile caches
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('barber_profile_')) {
            localStorage.removeItem(key);
          }
        });
      }
    } catch (error) {
      console.warn('[AuthContext] Error clearing profile cache:', error);
    }
  };

  // Efecto para actualizar loading cuando el perfil se ha intentado cargar
  useEffect(() => {
    if (user && profileAttempted && loading) {
      setLoading(false);
    } else if (!user && loading) {
      setLoading(false);
    }
  }, [user, profileAttempted, loading]);

  // Cargar usuario al iniciar y escuchar cambios de autenticación
  useEffect(() => {
    let mounted = true;

    // Enhanced function to load user profile with fallback mechanisms
    const loadUserProfile = async (userId: string, useCache = true): Promise<Profile | null> => {
      try {
        // First, try to load from cache if enabled
        if (useCache) {
          const cachedProfile = loadProfileFromCache(userId);
          if (cachedProfile && mounted) {
            console.log('[AuthContext] Using cached profile');
            setProfile(cachedProfile);
            setProfileAttempted(true);
            // Still try to refresh from server in background
            loadUserProfile(userId, false).catch(() => {});
            return cachedProfile;
          }
        }

        const profile = await authService.getProfile(userId);
        if (mounted) {
          setProfile(profile);
          setProfileAttempted(true);
          // Cache the successful result
          if (profile) {
            saveProfileToCache(userId, profile);
          }
          setRetryCount(0); // Reset retry count on success
        }
        return profile;
      } catch (error) {
        console.error('[AuthContext] Error loading profile:', error);
        
        if (mounted) {
          // Try cache as fallback
          if (useCache) {
            const cachedProfile = loadProfileFromCache(userId);
            if (cachedProfile) {
              console.log('[AuthContext] Using cached profile as fallback');
              setProfile(cachedProfile);
              setProfileAttempted(true);
              return cachedProfile;
            }
          }
          
          // If no cache and this is the first few retries, try again
          if (retryCount < 2) {
            console.log(`[AuthContext] Retrying profile load (${retryCount + 1}/2)`);
            setRetryCount(prev => prev + 1);
            setTimeout(() => {
              if (mounted) {
                loadUserProfile(userId, false);
              }
            }, 1000 * (retryCount + 1)); // Exponential backoff
          } else {
            // Final fallback - set to null but mark as attempted
            setProfile(null);
            setProfileAttempted(true);
          }
        }
        return null;
      }
    };

    const initializeAuth = async () => {
      try {
        // Primero probar la conexión con Supabase
        const isConnected = await authService.testConnection();
        if (!isConnected) {
          console.error('[AuthContext] No se pudo conectar con Supabase');
          // Aún así, intentamos continuar
        }

        // Obtener la sesión actual
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error('[AuthContext] Error obteniendo sesión:', error);
          throw error;
        }

        if (!mounted) {
          return;
        }

        // Establecer sesión y usuario
        setSession(session);
        setUser(session?.user ?? null);

        // Load profile if user exists
        if (session?.user) {
          await loadUserProfile(session.user.id);
        } else {
          setProfile(null);
          setProfileAttempted(true);
          // Clear any cached profiles when no user
          clearProfileCache();
        }
      } catch (error) {
        console.error('[AuthContext] Error durante inicialización:', error);
        // En caso de error, establecer estados por defecto
        setSession(null);
        setUser(null);
        setProfile(null);
        setProfileAttempted(true);
      } finally {
        if (mounted) {
          // El loading se manejará en el useEffect que monitorea user y profileAttempted
        }
      }
    };

    // Escuchar cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) {
        return;
      }

      // Actualizar sesión y usuario
      setSession(session);
      setUser(session?.user ?? null);

      // Load/update profile
      if (session?.user) {
        await loadUserProfile(session.user.id);
      } else {
        setProfile(null);
        setProfileAttempted(true);
        // Clear cached profiles on sign out
        clearProfileCache();
      }

      // El loading se manejará en el useEffect que monitorea user y profileAttempted
      // No actualizamos loading aquí para evitar parpadeos
    });

    // Inicializar autenticación
    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (data: SignUpData) => {
    setLoading(true);
    try {
      const result = await authService.signUp(data);
      setUser(result.user);
      setProfile(result.profile);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (data: SignInData) => {
    setLoading(true);
    try {
      const result = await authService.signIn(data);
      setUser(result.user);
      setSession(result.session);
      setProfile(result.profile);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await authService.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error('No hay usuario autenticado');

    const updatedProfile = await authService.updateProfile(user.id, updates);
    setProfile(updatedProfile);
    // Update cache with new profile
    if (updatedProfile) {
      saveProfileToCache(user.id, updatedProfile);
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    await loadUserProfile(user.id, false); // Force refresh from server
  };

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}
