import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

export interface SignUpData {
  email: string
  password: string
  fullName: string
  phone: string
  role?: Database['public']['Enums']['user_role']
}

export interface SignInData {
  email: string
  password: string
}

class AuthService {
  async signUp({ email, password, fullName, phone, role = 'customer' }: SignUpData) {
    try {
      // 1. Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('No se pudo crear el usuario')

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
        .single()

      if (profileError) {
        // Si falla la creación del perfil, log el error
        // No podemos eliminar el usuario desde el cliente
        console.error('Error creando perfil, usuario de auth puede quedar huérfano:', authData.user.id)
        throw profileError
      }

      return { user: authData.user, profile }
    } catch (error) {
      console.error('Error en registro:', error)
      throw error
    }
  }

  async signIn({ email, password }: SignInData) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // Obtener el perfil del usuario
      const profile = await this.getProfile(data.user.id)

      return { user: data.user, session: data.session, profile }
    } catch (error) {
      console.error('Error en login:', error)
      throw error
    }
  }

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  async getProfile(userId: string): Promise<Profile | null> {
    try {
      
      // Crear una promesa con timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout al obtener perfil')), 5000)
      })
      
      // Intentar obtener el perfil con timeout
      const queryPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      
      const { data, error } = await Promise.race([queryPromise, timeoutPromise])

      
      if (error) {
        console.error('[AuthService] Error en query de perfil:', error)
        // Log adicional para debug
        console.error('[AuthService] Detalles del error:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })
        throw error
      }
      
      if (!data) {
        console.warn('[AuthService] No se encontró perfil para userId:', userId)
      }
      
      return data
    } catch (error: any) {
      console.error('[AuthService] Error obteniendo perfil:', error)
      console.error('[AuthService] Stack trace:', error.stack)
      
      // Si es un error de timeout, lo indicamos claramente
      if (error.message === 'Timeout al obtener perfil') {
        console.error('[AuthService] La consulta a Supabase excedió el tiempo límite de 5 segundos')
      }
      
      return null
    }
  }

  async updateProfile(userId: string, updates: Partial<Profile>) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error actualizando perfil:', error)
      throw error
    }
  }

  async resetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error
    } catch (error) {
      console.error('Error enviando email de recuperación:', error)
      throw error
    }
  }

  async updatePassword(newPassword: string) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error
    } catch (error) {
      console.error('Error actualizando contraseña:', error)
      throw error
    }
  }

  // Verificar si hay una sesión activa
  async getCurrentSession() {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  }

  // Obtener el usuario actual con su perfil
  async getCurrentUser() {
    try {
      const session = await this.getCurrentSession()
      if (!session?.user) return null

      const profile = await this.getProfile(session.user.id)
      return { user: session.user, profile }
    } catch (error) {
      console.error('Error obteniendo usuario actual:', error)
      return null
    }
  }

  // Función de prueba de conexión con Supabase
  async testConnection() {
    try {
      
      // Intentar una consulta simple para verificar la conexión
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1)
        
      if (error) {
        console.error('[AuthService] Error en prueba de conexión:', error)
        return false
      }
      
      return true
    } catch (error) {
      console.error('[AuthService] Fallo en prueba de conexión:', error)
      return false
    }
  }
}

export const authService = new AuthService()