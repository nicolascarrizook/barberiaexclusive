import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTimeOff } from '../useTimeOff'
import { addDays, isWeekend } from 'date-fns'

// Mock de los servicios
vi.mock('@/services/time-off.service', () => ({
  timeOffService: {
    requestTimeOff: vi.fn(),
    getTimeOffRequests: vi.fn(),
    cancelTimeOff: vi.fn(),
    approveTimeOff: vi.fn(),
    rejectTimeOff: vi.fn(),
    checkTimeOffConflict: vi.fn(),
  },
}));

vi.mock('@/services/appointments.service', () => ({
  appointmentsService: {
    getAppointmentsByDateRange: vi.fn(),
  },
}));

// Mock del hook useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
    },
  }),
}));

// Mock del hook useToast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('useTimeOff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => useTimeOff());

    expect(result.current.loading).toBe(false);
    expect(result.current.submitting).toBe(false);
    expect(result.current.requests).toEqual([]);
  });

  it('should calculate working days correctly', () => {
    const { result } = renderHook(() => useTimeOff());

    // Probar con un rango que incluye fin de semana
    const startDate = new Date('2024-01-15'); // Lunes
    const endDate = new Date('2024-01-19'); // Viernes

    const workingDays = result.current.calculateWorkingDays(
      startDate,
      endDate
    );

    // Debe contar solo los días laborables (Lunes a Viernes = 5 días)
    expect(workingDays).toBe(5);
  });

  it('should exclude weekends from working days calculation', () => {
    const { result } = renderHook(() => useTimeOff());

    // Probar con un rango que incluye un fin de semana completo
    const startDate = new Date('2024-01-15'); // Lunes
    const endDate = new Date('2024-01-21'); // Domingo

    const workingDays = result.current.calculateWorkingDays(
      startDate,
      endDate
    );

    // Debe contar solo los días laborables (5 días de la semana)
    expect(workingDays).toBe(5);
  });

  it('should handle single day request', () => {
    const { result } = renderHook(() => useTimeOff());

    const singleDay = new Date('2024-01-15'); // Lunes

    const workingDays = result.current.calculateWorkingDays(
      singleDay,
      singleDay
    );

    // Un solo día laborable debe contar como 1
    expect(workingDays).toBe(1);
  });

  it('should handle weekend single day request', () => {
    const { result } = renderHook(() => useTimeOff());

    const weekendDay = new Date('2024-01-13'); // Sábado

    const workingDays = result.current.calculateWorkingDays(
      weekendDay,
      weekendDay
    );

    // Un día de fin de semana debe contar como 0
    expect(workingDays).toBe(0);
  });
});

// Funciones de utilidad para pruebas adicionales
export const createMockTimeOffRequest = (overrides = {}) => ({
  barber_id: 'test-barber-id',
  start_date: '2024-02-01',
  end_date: '2024-02-05',
  reason: 'Vacaciones familiares',
  notes: 'Notas adicionales',
  ...overrides,
});

export const createMockTimeOffResponse = (overrides = {}) => ({
  id: 'test-request-id',
  barber_id: 'test-barber-id',
  start_date: '2024-02-01',
  end_date: '2024-02-05',
  reason: 'Vacaciones familiares',
  notes: 'Notas adicionales',
  status: 'pending' as const,
  created_at: '2024-01-15T10:00:00Z',
  approved_by: null,
  approved_at: null,
  approval_notes: null,
  barber: {
    id: 'test-barber-id',
    display_name: 'Test Barber',
    profile: {
      full_name: 'Test Barber',
      avatar_url: null,
    },
  },
  ...overrides,
});
