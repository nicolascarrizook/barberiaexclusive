import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAuth } from '../useAuth'
import { AuthProvider } from '@/contexts/AuthContext'
import { createMockAuthContext } from '@/test/mocks/handlers'
import React from 'react';

// Mock del contexto de autenticación
vi.mock('@/contexts/AuthContext', async () => {
  const actual = await vi.importActual('@/contexts/AuthContext');
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna null cuando no hay usuario autenticado', () => {
    const mockAuthContext = createMockAuthContext({
      user: null,
      profile: null,
    });

    vi.mocked(useAuth).mockReturnValue(mockAuthContext);

    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isBarber).toBe(false);
    expect(result.current.isClient).toBe(false);
  });

  it('identifica correctamente un usuario cliente', () => {
    const mockAuthContext = createMockAuthContext({
      profile: {
        ...createMockAuthContext().profile,
        role: 'client',
      },
    });

    vi.mocked(useAuth).mockReturnValue(mockAuthContext);

    const { result } = renderHook(() => useAuth());

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isClient).toBe(true);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isBarber).toBe(false);
    expect(result.current.user?.role).toBe('client');
  });

  it('identifica correctamente un usuario barbero', () => {
    const mockAuthContext = createMockAuthContext({
      profile: {
        ...createMockAuthContext().profile,
        role: 'barber',
      },
    });

    vi.mocked(useAuth).mockReturnValue(mockAuthContext);

    const { result } = renderHook(() => useAuth());

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isBarber).toBe(true);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isClient).toBe(false);
    expect(result.current.user?.role).toBe('barber');
  });

  it('identifica correctamente un usuario admin', () => {
    const mockAuthContext = createMockAuthContext({
      profile: {
        ...createMockAuthContext().profile,
        role: 'admin',
      },
    });

    vi.mocked(useAuth).mockReturnValue(mockAuthContext);

    const { result } = renderHook(() => useAuth());

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isBarber).toBe(false);
    expect(result.current.isClient).toBe(false);
    expect(result.current.user?.role).toBe('admin');
  });

  it('crea un objeto de usuario simplificado con los datos correctos', () => {
    const mockAuthContext = createMockAuthContext();

    vi.mocked(useAuth).mockReturnValue(mockAuthContext);

    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toEqual({
      id: mockAuthContext.user.id,
      email: mockAuthContext.user.email || '',
      name: mockAuthContext.profile?.full_name || 'test',
      avatar: mockAuthContext.profile?.avatar_url,
      role: mockAuthContext.profile?.role || 'client',
    });
  });

  it('usa el email como nombre cuando no hay full_name', () => {
    const mockAuthContext = createMockAuthContext({
      profile: {
        ...createMockAuthContext().profile,
        full_name: null,
      },
      user: {
        ...createMockAuthContext().user,
        email: 'user@example.com',
      },
    });

    vi.mocked(useAuth).mockReturnValue(mockAuthContext);

    const { result } = renderHook(() => useAuth());

    expect(result.current.user?.name).toBe('user');
  });

  it('expone todas las funciones del contexto de autenticación', () => {
    const mockAuthContext = createMockAuthContext();

    vi.mocked(useAuth).mockReturnValue(mockAuthContext);

    const { result } = renderHook(() => useAuth());

    expect(result.current.signIn).toBeDefined();
    expect(result.current.signUp).toBeDefined();
    expect(result.current.signOut).toBeDefined();
    expect(result.current.updateProfile).toBeDefined();
    expect(result.current.loading).toBe(false);
  });

  it('maneja correctamente el estado de carga', () => {
    const mockAuthContext = createMockAuthContext({
      loading: true,
    });

    vi.mocked(useAuth).mockReturnValue(mockAuthContext);

    const { result } = renderHook(() => useAuth());

    expect(result.current.loading).toBe(true);
  });

  it('retorna undefined para avatar cuando no está presente', () => {
    const mockAuthContext = createMockAuthContext({
      profile: {
        ...createMockAuthContext().profile,
        avatar_url: null,
      },
    });

    vi.mocked(useAuth).mockReturnValue(mockAuthContext);

    const { result } = renderHook(() => useAuth());

    expect(result.current.user?.avatar).toBeUndefined();
  });
});
