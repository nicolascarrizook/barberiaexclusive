import { vi } from 'vitest'
import { Barber, Service, TimeSlot } from '@/types'

// Mock data para tests
export const mockServices: Service[] = [
  {
    id: '1',
    name: 'Corte de Cabello',
    description: 'Corte profesional de cabello',
    price: 150,
    duration: 30,
    category: 'Cabello',
    barbershop_id: '1',
    is_active: true,
  },
  {
    id: '2',
    name: 'Barba',
    description: 'Arreglo y diseño de barba',
    price: 100,
    duration: 20,
    category: 'Barba',
    barbershop_id: '1',
    is_active: true,
  },
  {
    id: '3',
    name: 'Corte + Barba',
    description: 'Servicio completo de corte y barba',
    price: 220,
    duration: 45,
    category: 'Combos',
    barbershop_id: '1',
    is_active: true,
  },
]

export const mockBarbers: Barber[] = [
  {
    id: '1',
    user_id: 'user1',
    barbershop_id: '1',
    bio: 'Barbero profesional con 5 años de experiencia',
    specialties: ['Cortes modernos', 'Diseño de barba'],
    rating: 4.8,
    is_active: true,
    user: {
      id: 'user1',
      email: 'juan@barbershop.com',
      full_name: 'Juan Pérez',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Juan',
      role: 'barber',
    },
  },
  {
    id: '2',
    user_id: 'user2',
    barbershop_id: '1',
    bio: 'Especialista en cortes clásicos',
    specialties: ['Cortes clásicos', 'Afeitado tradicional'],
    rating: 4.9,
    is_active: true,
    user: {
      id: 'user2',
      email: 'carlos@barbershop.com',
      full_name: 'Carlos García',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos',
      role: 'barber',
    },
  },
]

export const mockTimeSlots: TimeSlot[] = [
  { time: '09:00', available: true },
  { time: '09:30', available: true },
  { time: '10:00', available: false },
  { time: '10:30', available: true },
  { time: '11:00', available: true },
  { time: '11:30', available: false },
  { time: '12:00', available: true },
]

export const mockAuthUser = {
  id: 'user123',
  email: 'test@example.com',
  user_metadata: {},
  app_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00.000Z',
}

export const mockUserProfile = {
  id: 'profile123',
  user_id: 'user123',
  full_name: 'Test User',
  phone: '+1234567890',
  email: 'test@example.com',
  avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Test',
  role: 'client' as const,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
}

// Mock de hooks
export const createMockUseToast = () => {
  const toast = vi.fn()
  return {
    toast,
    useToast: () => ({ toast }),
  }
}

// Mock de useNavigate
export const createMockNavigate = () => vi.fn()

// Mock de AuthContext
export const createMockAuthContext = (overrides?: any) => ({
  user: mockAuthUser,
  profile: mockUserProfile,
  loading: false,
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
  ...overrides,
})