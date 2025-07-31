import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@/test/test-utils'
import { renderHook, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event';
import React from 'react';
import { AuthProvider, useAuth } from '../AuthContext'
import { supabase } from '@/lib/supabase'
import { Session, User } from '@supabase/supabase-js'

// Mock de Supabase ya está configurado en setup.ts

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provee el contexto de autenticación a los componentes hijos', () => {
    const TestComponent = () => {
      const auth = useAuth();
      return <div>{auth.loading ? 'Loading' : 'Loaded'}</div>;
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByText('Loaded')).toBeInTheDocument();
  });

  it('lanza error cuando se usa fuera del provider', () => {
    // Capturar el error de la consola
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const TestComponent = () => {
      useAuth();
      return null;
    };

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });

  it('inicia con estado de carga', () => {
    const TestComponent = () => {
      const { loading } = useAuth();
      return <div>{loading ? 'Loading' : 'Ready'}</div>;
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Inicialmente debería estar cargando
    expect(screen.getByText('Loading')).toBeInTheDocument();
  });

  it('maneja el login exitoso', async () => {
    const mockUser = {
      id: 'user123',
      email: 'test@example.com',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };

    const mockProfile = {
      id: 'profile123',
      user_id: 'user123',
      full_name: 'Test User',
      phone: '+1234567890',
      email: 'test@example.com',
      role: 'client' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Mock de las respuestas de Supabase
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: {
        user: mockUser,
        session: {} as Session,
      },
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValueOnce({
            data: mockProfile,
            error: null,
          }),
        }),
      }),
    } as ReturnType<typeof supabase.from>);

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await act(async () => {
      await result.current.signIn('test@example.com', 'password123');
    });

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.profile).toEqual(mockProfile);
      expect(result.current.loading).toBe(false);
    });
  });

  it('maneja errores de login', async () => {
    const loginError = new Error('Invalid credentials');

    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: { user: null, session: null },
      error: loginError,
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await expect(
      act(async () => {
        await result.current.signIn('test@example.com', 'wrong-password');
      })
    ).rejects.toThrow('Invalid credentials');

    expect(result.current.user).toBeNull();
  });

  it('maneja el registro exitoso', async () => {
    const mockUser = {
      id: 'newuser123',
      email: 'newuser@example.com',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };

    vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
      data: {
        user: mockUser,
        session: {} as Session,
      },
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockResolvedValueOnce({
        data: null,
        error: null,
      }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValueOnce({
            data: {
              id: 'profile123',
              user_id: 'newuser123',
              full_name: 'New User',
              phone: '+1234567890',
              email: 'newuser@example.com',
              role: 'client',
            },
            error: null,
          }),
        }),
      }),
    } as ReturnType<typeof supabase.from>);

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await act(async () => {
      await result.current.signUp({
        email: 'newuser@example.com',
        password: 'password123',
        fullName: 'New User',
        phone: '+1234567890',
      });
    });

    expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('user_profiles');
  });

  it('maneja el logout', async () => {
    vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({
      error: null,
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.profile).toBeNull();
  });

  it('actualiza el perfil del usuario', async () => {
    const updatedProfile = {
      full_name: 'Updated Name',
      phone: '+9876543210',
    };

    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValueOnce({
              data: {
                ...updatedProfile,
                id: 'profile123',
                user_id: 'user123',
                email: 'test@example.com',
                role: 'client',
              },
              error: null,
            }),
          }),
        }),
      }),
    } as ReturnType<typeof supabase.from>);

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    // Simular que hay un usuario autenticado
    await act(async () => {
      result.current.profile = {
        id: 'profile123',
        user_id: 'user123',
        full_name: 'Test User',
        phone: '+1234567890',
        email: 'test@example.com',
        role: 'client',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    await act(async () => {
      await result.current.updateProfile(updatedProfile);
    });

    expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('user_profiles');
  });

  it('escucha cambios en el estado de autenticación', async () => {
    const unsubscribe = vi.fn();
    const onAuthStateChange = vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe } },
    });

    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation(
      onAuthStateChange
    );

    render(
      <AuthProvider>
        <div>Test</div>
      </AuthProvider>
    );

    expect(onAuthStateChange).toHaveBeenCalled();

    // Cleanup debería llamar unsubscribe
    // Este test verificaría que el useEffect cleanup funciona correctamente
  });
});
