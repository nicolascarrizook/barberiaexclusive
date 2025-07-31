import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row'];
type Barber = Database['public']['Tables']['barbers']['Row'];

export interface ProfileWithBarber extends Profile {
  barber?: Barber | null;
}

export interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  role?: Database['public']['Enums']['user_role'];
}

export interface SignInData {
  email: string;
  password: string;
}

class AuthService {
  async signUp({
    email,
    password,
    fullName,
    phone,
    role = 'customer',
  }: SignUpData) {
    try {
      // 1. Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No se pudo crear el usuario');

      // 2. Crear perfil en la tabla profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email,
          full_name: fullName,
          phone,
          role: role,
        })
        .select()
        .single();

      if (profileError) {
        // Si falla la creación del perfil, log el error
        // No podemos eliminar el usuario desde el cliente
        console.error(
          'Error creando perfil, usuario de auth puede quedar huérfano:',
          authData.user.id
        );
        throw profileError;
      }

      return { user: authData.user, profile };
    } catch (error) {
      console.error('Error en registro:', error);
      throw error;
    }
  }

  async signIn({ email, password }: SignInData) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Obtener el perfil del usuario
      const profile = await this.getProfile(data.user.id);

      return { user: data.user, session: data.session, profile };
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async getProfile(userId: string): Promise<ProfileWithBarber | null> {
    try {
      // First check if we can get the role from JWT claims
      const session = await this.getCurrentSession();
      let roleFromJWT: string | null = null;
      
      if (session?.user?.user_metadata?.role) {
        roleFromJWT = session.user.user_metadata.role;
      } else if (session?.user?.app_metadata?.role) {
        roleFromJWT = session.user.app_metadata.role;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          barber:barbers!barbers_profile_id_fkey (
            id,
            display_name,
            barbershop_id,
            bio
          )
        `)
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('[AuthService] Error en query de perfil:', error);
        // Log adicional para debug
        console.error('[AuthService] Detalles del error:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        
        // If we have a role from JWT, create a minimal profile as fallback
        if (roleFromJWT && session?.user) {
          console.warn('[AuthService] Using JWT role as fallback:', roleFromJWT);
          return {
            id: userId,
            email: session.user.email || '',
            full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '',
            phone: session.user.user_metadata?.phone || '',
            role: roleFromJWT as Profile['role'],
            avatar_url: null,
            created_at: session.user.created_at,
            updated_at: new Date().toISOString(),
            barbershop_id: null
          };
        }
        
        throw error;
      }

      if (!data) {
        console.warn(
          '[AuthService] No se encontró perfil para userId:',
          userId
        );
        
        // If no profile found but we have JWT role, create minimal profile
        if (roleFromJWT && session?.user) {
          console.warn('[AuthService] Creating minimal profile from JWT');
          return {
            id: userId,
            email: session.user.email || '',
            full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '',
            phone: session.user.user_metadata?.phone || '',
            role: roleFromJWT as Profile['role'],
            avatar_url: null,
            created_at: session.user.created_at,
            updated_at: new Date().toISOString(),
            barbershop_id: null
          };
        }
      }

      return data;
    } catch (error: unknown) {
      console.error('[AuthService] Error obteniendo perfil:', error);
      if (error instanceof Error) {
        console.error('[AuthService] Stack trace:', error.stack);
      }
      return null;
    }
  }

  async updateProfile(userId: string, updates: Partial<Profile>) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      throw error;
    }
  }

  async resetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error enviando email de recuperación:', error);
      throw error;
    }
  }

  async updatePassword(newPassword: string) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error actualizando contraseña:', error);
      throw error;
    }
  }

  // Verify if there's an active session with enhanced error handling
  async getCurrentSession() {
    try {
      const {
        data: { session },
        error
      } = await supabase.auth.getSession();
      
      if (error) {
        console.error('[AuthService] Error getting session:', error);
        return null;
      }
      
      return session;
    } catch (error) {
      console.error('[AuthService] Failed to get session:', error);
      return null;
    }
  }

  // Get current user with profile and enhanced error handling
  async getCurrentUser() {
    try {
      const session = await this.getCurrentSession();
      if (!session?.user) return null;

      const profile = await this.getProfile(session.user.id);
      return { user: session.user, session, profile };
    } catch (error) {
      console.error('Error obteniendo usuario actual:', error);
      return null;
    }
  }

  // Enhanced connection test function
  async testConnection() {
    try {
      // Test basic database connection
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);

      if (error) {
        console.error('[AuthService] Error en prueba de conexión:', error);
        return false;
      }

      // Test auth service
      const session = await this.getCurrentSession();
      console.log('[AuthService] Connection test successful, session:', !!session);
      
      return true;
    } catch (error) {
      console.error('[AuthService] Fallo en prueba de conexión:', error);
      return false;
    }
  }

  // Clear all cached authentication data
  async clearAuthCache() {
    try {
      // Clear localStorage items related to Supabase auth
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.startsWith('barber_profile_'))) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log('[AuthService] Cleared auth cache');
    } catch (error) {
      console.warn('[AuthService] Error clearing auth cache:', error);
    }
  }
}

export const authService = new AuthService();

// Initialize session recovery on app start
if (typeof window !== 'undefined') {
  // Listen for storage events to sync auth state across tabs
  window.addEventListener('storage', (e) => {
    if (e.key?.startsWith('sb-') && e.key.includes('auth-token')) {
      console.log('[AuthService] Auth state changed in another tab');
      // The auth state change listener in AuthContext will handle this
    }
  });
}
