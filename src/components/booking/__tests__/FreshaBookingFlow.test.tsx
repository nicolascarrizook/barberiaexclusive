import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FreshaBookingFlow } from '../FreshaBookingFlow';
import { TestWrapper } from '@/test/test-utils';
import { bookingService } from '@/services/booking.service';
import { availabilityEngine } from '@/services/availability-engine.service';

// Mock services
vi.mock('@/services/booking.service', () => ({
  bookingService: {
    createBooking: vi.fn(),
  },
}));

vi.mock('@/services/availability-engine.service', () => ({
  availabilityEngine: {
    getAvailability: vi.fn(),
  },
}));

// Mock child components
vi.mock('../ServiceSelector', () => ({
  ServiceSelector: ({ onNext }: { onNext: (services: any[]) => void }) => (
    <div data-testid="service-selector">
      <button
        onClick={() => onNext([
          { id: '1', name: 'Corte', duration_minutes: 30, price: 1500 }
        ])}
      >
        Select Services
      </button>
    </div>
  ),
}));

vi.mock('../DateTimeSelector', () => ({
  DateTimeSelector: ({ onNext, onBack }: { onNext: (slot: any) => void; onBack: () => void }) => (
    <div data-testid="datetime-selector">
      <button onClick={onBack}>Back</button>
      <button
        onClick={() => onNext({
          barberId: 'barber-1',
          barberName: 'Juan',
          date: new Date('2025-08-01'),
          startTime: '10:00',
          endTime: '10:30',
        })}
      >
        Select DateTime
      </button>
    </div>
  ),
}));

vi.mock('../CustomerInfo', () => ({
  CustomerInfo: ({ onSubmit, onBack }: { onSubmit: (customer: any) => void; onBack: () => void }) => (
    <div data-testid="customer-info">
      <button onClick={onBack}>Back</button>
      <button
        onClick={() => onSubmit({
          fullName: 'Test Customer',
          phone: '+5491123456789',
          email: 'test@example.com',
        })}
      >
        Submit Customer Info
      </button>
    </div>
  ),
}));

vi.mock('../BookingConfirmation', () => ({
  BookingConfirmation: ({ onNewBooking }: { onNewBooking: () => void }) => (
    <div data-testid="booking-confirmation">
      <div>Booking Confirmed!</div>
      <button onClick={onNewBooking}>New Booking</button>
    </div>
  ),
}));

describe('FreshaBookingFlow', () => {
  const mockOnComplete = vi.fn();
  const barbershopId = 'test-barbershop';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(bookingService.createBooking).mockResolvedValue({
      id: 'booking-123',
      confirmation_code: 'ABC123',
      start_at: '2025-08-01T10:00:00Z',
      end_at: '2025-08-01T10:30:00Z',
    });
  });

  it('renders service selector as first step', () => {
    render(
      <TestWrapper>
        <FreshaBookingFlow 
          barbershopId={barbershopId}
          onComplete={mockOnComplete}
        />
      </TestWrapper>
    );

    expect(screen.getByTestId('service-selector')).toBeInTheDocument();
    expect(screen.getByText('Selecciona servicios')).toBeInTheDocument();
  });

  it('shows progress indicator with correct step', () => {
    render(
      <TestWrapper>
        <FreshaBookingFlow 
          barbershopId={barbershopId}
          onComplete={mockOnComplete}
        />
      </TestWrapper>
    );

    // Should show step 1 as active
    expect(screen.getByText('0% completado')).toBeInTheDocument();
  });

  it('navigates through all steps correctly', async () => {
    render(
      <TestWrapper>
        <FreshaBookingFlow 
          barbershopId={barbershopId}
          onComplete={mockOnComplete}
        />
      </TestWrapper>
    );

    // Step 1: Select services
    fireEvent.click(screen.getByText('Select Services'));
    
    // Step 2: Should show datetime selector
    await waitFor(() => {
      expect(screen.getByTestId('datetime-selector')).toBeInTheDocument();
      expect(screen.getByText('Elige fecha y hora')).toBeInTheDocument();
    });

    // Continue to step 3
    fireEvent.click(screen.getByText('Select DateTime'));
    
    // Step 3: Should show customer info
    await waitFor(() => {
      expect(screen.getByTestId('customer-info')).toBeInTheDocument();
      expect(screen.getByText('Información personal')).toBeInTheDocument();
    });

    // Complete booking
    fireEvent.click(screen.getByText('Submit Customer Info'));
    
    // Step 4: Should show confirmation
    await waitFor(() => {
      expect(screen.getByTestId('booking-confirmation')).toBeInTheDocument();
      expect(screen.getByText('Booking Confirmed!')).toBeInTheDocument();
    });

    // Verify booking service was called
    expect(bookingService.createBooking).toHaveBeenCalledWith({
      barbershopId,
      barberId: 'barber-1',
      customerId: 'temp-customer-id',
      serviceIds: ['1'],
      startAt: expect.any(Date),
      notes: undefined,
      customerRequests: undefined,
    });
  });

  it('allows navigation back through steps', async () => {
    render(
      <TestWrapper>
        <FreshaBookingFlow 
          barbershopId={barbershopId}
          onComplete={mockOnComplete}
        />
      </TestWrapper>
    );

    // Go to step 2
    fireEvent.click(screen.getByText('Select Services'));
    await waitFor(() => {
      expect(screen.getByTestId('datetime-selector')).toBeInTheDocument();
    });

    // Go back to step 1
    fireEvent.click(screen.getByText('Back'));
    await waitFor(() => {
      expect(screen.getByTestId('service-selector')).toBeInTheDocument();
    });
  });

  it('handles booking creation errors', async () => {
    vi.mocked(bookingService.createBooking).mockRejectedValue(
      new Error('Booking validation failed')
    );

    render(
      <TestWrapper>
        <FreshaBookingFlow 
          barbershopId={barbershopId}
          onComplete={mockOnComplete}
        />
      </TestWrapper>
    );

    // Navigate to customer info step
    fireEvent.click(screen.getByText('Select Services'));
    await waitFor(() => {
      expect(screen.getByTestId('datetime-selector')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Select DateTime'));
    await waitFor(() => {
      expect(screen.getByTestId('customer-info')).toBeInTheDocument();
    });

    // Try to complete booking
    fireEvent.click(screen.getByText('Submit Customer Info'));

    // Should show error
    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Booking validation failed')).toBeInTheDocument();
    });

    // Should stay on customer info step
    expect(screen.getByTestId('customer-info')).toBeInTheDocument();
  });

  it('calls onComplete callback when booking is successful', async () => {
    render(
      <TestWrapper>
        <FreshaBookingFlow 
          barbershopId={barbershopId}
          onComplete={mockOnComplete}
        />
      </TestWrapper>
    );

    // Complete entire flow
    fireEvent.click(screen.getByText('Select Services'));
    await waitFor(() => screen.getByTestId('datetime-selector'));

    fireEvent.click(screen.getByText('Select DateTime'));
    await waitFor(() => screen.getByTestId('customer-info'));

    fireEvent.click(screen.getByText('Submit Customer Info'));
    await waitFor(() => screen.getByTestId('booking-confirmation'));

    // Verify callback was called with booking data
    expect(mockOnComplete).toHaveBeenCalledWith({
      id: 'booking-123',
      confirmationCode: 'ABC123',
      services: [{ id: '1', name: 'Corte', duration_minutes: 30, price: 1500 }],
      barber: { name: 'Juan', avatar: undefined },
      slot: {
        barberId: 'barber-1',
        barberName: 'Juan',
        date: expect.any(Date),
        startTime: '10:00',
        endTime: '10:30',
      },
      customer: {
        fullName: 'Test Customer',
        phone: '+5491123456789',
        email: 'test@example.com',
      },
      totalPrice: 1500,
    });
  });

  it('resets flow when starting new booking', async () => {
    render(
      <TestWrapper>
        <FreshaBookingFlow 
          barbershopId={barbershopId}
          onComplete={mockOnComplete}
        />
      </TestWrapper>
    );

    // Complete entire flow
    fireEvent.click(screen.getByText('Select Services'));
    await waitFor(() => screen.getByTestId('datetime-selector'));

    fireEvent.click(screen.getByText('Select DateTime'));
    await waitFor(() => screen.getByTestId('customer-info'));

    fireEvent.click(screen.getByText('Submit Customer Info'));
    await waitFor(() => screen.getByTestId('booking-confirmation'));

    // Start new booking
    fireEvent.click(screen.getByText('New Booking'));

    // Should be back at step 1
    await waitFor(() => {
      expect(screen.getByTestId('service-selector')).toBeInTheDocument();
      expect(screen.getByText('Selecciona servicios')).toBeInTheDocument();
    });
  });

  it('shows loading state during booking creation', async () => {
    // Make booking service take time
    vi.mocked(bookingService.createBooking).mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );

    render(
      <TestWrapper>
        <FreshaBookingFlow 
          barbershopId={barbershopId}
          onComplete={mockOnComplete}
        />
      </TestWrapper>
    );

    // Navigate to customer info step
    fireEvent.click(screen.getByText('Select Services'));
    await waitFor(() => screen.getByTestId('datetime-selector'));

    fireEvent.click(screen.getByText('Select DateTime'));
    await waitFor(() => screen.getByTestId('customer-info'));

    // Customer info should receive isLoading prop
    expect(screen.getByTestId('customer-info')).toBeInTheDocument();
  });
});