import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { authService, SignUpData, SignInData } from '@/services/auth.service'
import { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signUp: (data: SignUpData) => Promise<void>
  signIn: (data: SignInData) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileAttempted, setProfileAttempted] = useState(false)

  // Efecto para actualizar loading cuando el perfil se ha intentado cargar
  useEffect(() => {
    if (user && profileAttempted && loading) {
      setLoading(false)
    } else if (!user && loading) {
      setLoading(false)
    }
  }, [user, profileAttempted, loading])

  // Cargar usuario al iniciar y escuchar cambios de autenticación
  useEffect(() => {
    let mounted = true

    // Función para cargar el perfil de usuario
    const loadUserProfile = async (userId: string) => {
      try {
        const profile = await authService.getProfile(userId)
        if (mounted) {
          setProfile(profile)
          setProfileAttempted(true)
        }
        return profile
      } catch (error) {
        console.error('[AuthContext] Error cargando perfil:', error)
        if (mounted) {
          setProfile(null)
          setProfileAttempted(true)
        }
        return null
      }
    }

    const initializeAuth = async () => {
      try {
        // Primero probar la conexión con Supabase
        const isConnected = await authService.testConnection()
        if (!isConnected) {
          console.error('[AuthContext] No se pudo conectar con Supabase')
          // Aún así, intentamos continuar
        }

        // Obtener la sesión actual
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('[AuthContext] Error obteniendo sesión:', error)
          throw error
        }
        
        if (!mounted) {
          return
        }

        // Establecer sesión y usuario
        setSession(session)
        setUser(session?.user ?? null)
        
        // Cargar perfil si hay usuario
        if (session?.user) {
          // Intentar cargar el perfil, pero no dejar que un fallo bloquee todo
          try {
            await loadUserProfile(session.user.id)
          } catch (profileError) {
            console.error('[AuthContext] Error cargando perfil, continuando sin perfil:', profileError)
            setProfile(null)
          }
        } else {
          setProfile(null)
          setProfileAttempted(true)
        }
      } catch (error) {
        console.error('[AuthContext] Error durante inicialización:', error)
        // En caso de error, establecer estados por defecto
        setSession(null)
        setUser(null)
        setProfile(null)
        setProfileAttempted(true)
      } finally {
        if (mounted) {
          // El loading se manejará en el useEffect que monitorea user y profileAttempted
        }
      }
    }

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        
        if (!mounted) {
          return
        }
        
        // Actualizar sesión y usuario
        setSession(session)
        setUser(session?.user ?? null)
        
        // Cargar/actualizar perfil
        if (session?.user) {
          await loadUserProfile(session.user.id)
        } else {
          setProfile(null)
        }
        
        // El loading se manejará en el useEffect que monitorea user y profileAttempted
        // No actualizamos loading aquí para evitar parpadeos
      }
    )

    // Inicializar autenticación
    initializeAuth()

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signUp = async (data: SignUpData) => {
    setLoading(true)
    try {
      const result = await authService.signUp(data)
      setUser(result.user)
      setProfile(result.profile)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (data: SignInData) => {
    setLoading(true)
    try {
      const result = await authService.signIn(data)
      setUser(result.user)
      setSession(result.session)
      setProfile(result.profile)
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    setLoading(true)
    try {
      await authService.signOut()
      setUser(null)
      setSession(null)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error('No hay usuario autenticado')
    
    const updatedProfile = await authService.updateProfile(user.id, updates)
    setProfile(updatedProfile)
  }

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider')
  }
  return context
}