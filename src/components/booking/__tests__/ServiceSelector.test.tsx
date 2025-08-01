import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ServiceSelector } from '../ServiceSelector';
import { TestWrapper } from '@/test/test-utils';
import { supabase } from '@/lib/supabase';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              order: vi.fn(() => ({
                data: [],
                error: null,
              })),
            })),
          })),
        })),
      })),
    })),
  },
}));

const mockServices = [
  {
    id: '1',
    name: 'Corte clásico',
    duration_minutes: 30,
    price: 1500,
    description: 'Corte tradicional con máquina y tijera',
    category: 'Cortes',
    is_active: true,
  },
  {
    id: '2',
    name: 'Barba completa',
    duration_minutes: 20,
    price: 1000,
    description: 'Afeitado y arreglo de barba',
    category: 'Barba',
    is_active: true,
  },
  {
    id: '3',
    name: 'Corte + Barba',
    duration_minutes: 45,
    price: 2200,
    description: 'Servicio completo',
    category: 'Combo',
    is_active: true,
  },
];

describe('ServiceSelector', () => {
  const mockOnNext = vi.fn();
  const barbershopId = 'test-barbershop';

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful services fetch
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({
                data: mockServices,
                error: null,
              })),
            })),
          })),
        })),
      })),
    } as any);
  });

  it('renders loading state initially', () => {
    render(
      <TestWrapper>
        <ServiceSelector
          barbershopId={barbershopId}
          selectedServices={[]}
          onNext={mockOnNext}
        />
      </TestWrapper>
    );

    expect(screen.getByText('animate-pulse')).toBeInTheDocument();
  });

  it('loads and displays services by category', async () => {
    render(
      <TestWrapper>
        <ServiceSelector
          barbershopId={barbershopId}
          selectedServices={[]}
          onNext={mockOnNext}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('¿Qué servicios necesitas?')).toBeInTheDocument();
    });

    // Should show categories
    expect(screen.getByText('Cortes')).toBeInTheDocument();
    expect(screen.getByText('Barba')).toBeInTheDocument();
    expect(screen.getByText('Combo')).toBeInTheDocument();

    // Should show services
    expect(screen.getByText('Corte clásico')).toBeInTheDocument();
    expect(screen.getByText('Barba completa')).toBeInTheDocument();
    expect(screen.getByText('Corte + Barba')).toBeInTheDocument();
  });

  it('displays service details correctly', async () => {
    render(
      <TestWrapper>
        <ServiceSelector
          barbershopId={barbershopId}
          selectedServices={[]}
          onNext={mockOnNext}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Corte clásico')).toBeInTheDocument();
    });

    // Should show service details
    expect(screen.getByText('Corte tradicional con máquina y tijera')).toBeInTheDocument();
    expect(screen.getByText('30m')).toBeInTheDocument();
    expect(screen.getByText('$1.500')).toBeInTheDocument();
  });

  it('allows service selection and deselection', async () => {
    render(
      <TestWrapper>
        <ServiceSelector
          barbershopId={barbershopId}
          selectedServices={[]}
          onNext={mockOnNext}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Corte clásico')).toBeInTheDocument();
    });

    // Select a service
    fireEvent.click(screen.getByText('Corte clásico'));

    // Should show selected service summary
    await waitFor(() => {
      expect(screen.getByText('Servicios seleccionados:')).toBeInTheDocument();
      expect(screen.getByText('Total: 30m')).toBeInTheDocument();
      expect(screen.getByText('$1.500')).toBeInTheDocument();
    });

    // Should show continue button with badge
    expect(screen.getByText('Continuar')).toBeEnabled();
    expect(screen.getByText('1')).toBeInTheDocument(); // Badge count

    // Deselect service by clicking X
    const removeButton = screen.getByRole('button', { name: /remove/i });
    fireEvent.click(removeButton);

    // Should hide summary
    await waitFor(() => {
      expect(screen.queryByText('Servicios seleccionados:')).not.toBeInTheDocument();
    });
  });

  it('shows correct totals for multiple services', async () => {
    render(
      <TestWrapper>
        <ServiceSelector
          barbershopId={barbershopId}
          selectedServices={[]}
          onNext={mockOnNext}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Corte clásico')).toBeInTheDocument();
    });

    // Select multiple services
    fireEvent.click(screen.getByText('Corte clásico'));
    fireEvent.click(screen.getByText('Barba completa'));

    await waitFor(() => {
      expect(screen.getByText('Total: 50m')).toBeInTheDocument(); // 30m + 20m
      expect(screen.getByText('$2.500')).toBeInTheDocument(); // 1500 + 1000
      expect(screen.getByText('2')).toBeInTheDocument(); // Badge count
    });
  });

  it('displays pre-selected services', async () => {
    const selectedServices = [mockServices[0]]; // Pre-select first service

    render(
      <TestWrapper>
        <ServiceSelector
          barbershopId={barbershopId}
          selectedServices={selectedServices}
          onNext={mockOnNext}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Servicios seleccionados:')).toBeInTheDocument();
      expect(screen.getByText('Corte clásico')).toBeInTheDocument();
    });
  });

  it('prevents continuing without selecting services', async () => {
    render(
      <TestWrapper>
        <ServiceSelector
          barbershopId={barbershopId}
          selectedServices={[]}
          onNext={mockOnNext}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Continuar')).toBeInTheDocument();
    });

    // Continue button should be disabled
    expect(screen.getByText('Continuar')).toBeDisabled();

    // Try to click continue
    fireEvent.click(screen.getByText('Continuar'));

    // Should show toast error (mocked)
    expect(mockOnNext).not.toHaveBeenCalled();
  });

  it('calls onNext with selected services', async () => {
    render(
      <TestWrapper>
        <ServiceSelector
          barbershopId={barbershopId}
          selectedServices={[]}
          onNext={mockOnNext}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Corte clásico')).toBeInTheDocument();
    });

    // Select a service
    fireEvent.click(screen.getByText('Corte clásico'));

    await waitFor(() => {
      expect(screen.getByText('Continuar')).toBeEnabled();
    });

    // Click continue
    fireEvent.click(screen.getByText('Continuar'));

    // Should call onNext with selected services
    expect(mockOnNext).toHaveBeenCalledWith([
      expect.objectContaining({
        id: '1',
        name: 'Corte clásico',
        duration_minutes: 30,
        price: 1500,
      }),
    ]);
  });

  it('handles service loading error', async () => {
    // Mock error response
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({
                data: null,
                error: { message: 'Database error' },
              })),
            })),
          })),
        })),
      })),
    } as any);

    render(
      <TestWrapper>
        <ServiceSelector
          barbershopId={barbershopId}
          selectedServices={[]}
          onNext={mockOnNext}
        />
      </TestWrapper>
    );

    // Should show error toast (mocked)
    await waitFor(() => {
      // Loading should complete
      expect(screen.queryByText('animate-pulse')).not.toBeInTheDocument();
    });
  });

  it('formats duration and price correctly', async () => {
    const longService = {
      ...mockServices[0],
      duration_minutes: 90, // 1h 30m
      price: 3500,
    };

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({
                data: [longService],
                error: null,
              })),
            })),
          })),
        })),
      })),
    } as any);

    render(
      <TestWrapper>
        <ServiceSelector
          barbershopId={barbershopId}
          selectedServices={[]}
          onNext={mockOnNext}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('1h 30m')).toBeInTheDocument();
      expect(screen.getByText('$3.500')).toBeInTheDocument();
    });
  });
});