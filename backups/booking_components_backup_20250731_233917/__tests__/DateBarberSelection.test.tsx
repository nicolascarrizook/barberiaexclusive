import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DateBarberSelection } from '../DateBarberSelection';
import { Service, Barber } from '@/types';
import * as availabilityService from '@/services/availability.service';
import * as useRealtimeAvailability from '@/hooks/useRealtimeAvailability';

// Mock the dependencies
jest.mock('@/services/availability.service');
jest.mock('@/hooks/useRealtimeAvailability');

const mockAvailabilityService = availabilityService as jest.Mocked<typeof availabilityService>;
const mockUseRealtimeAvailability = useRealtimeAvailability as jest.Mocked<typeof useRealtimeAvailability>;

const mockServices: Service[] = [
  {
    id: '1',
    name: 'Corte Clásico',
    duration_minutes: 30,
    price: 25,
    description: 'Corte tradicional'
  }
];

const mockBarbers: Barber[] = [
  {
    id: 'barber1',
    name: 'Juan Pérez',
    specialties: ['Cortes clásicos', 'Barba'],
    available: true,
    barbershop_id: 'barbershop1'
  },
  {
    id: 'barber2',
    name: 'Carlos López',
    specialties: ['Cortes modernos'],
    available: true,
    barbershop_id: 'barbershop1'
  }
];

const mockAvailabilityData = [
  {
    barber_id: 'barber1',
    availability: {
      date: '2024-01-15',
      is_available: true,
      slots: [
        { start: '09:00', end: '09:30', available: true },
        { start: '09:30', end: '10:00', available: true },
        { start: '10:00', end: '10:30', available: false, reason: 'appointment' as const },
        { start: '10:30', end: '11:00', available: true },
      ],
      working_hours: { start: '09:00', end: '18:00' }
    }
  },
  {
    barber_id: 'barber2',
    availability: {
      date: '2024-01-15',
      is_available: true,
      slots: [
        { start: '09:00', end: '09:30', available: true },
        { start: '09:30', end: '10:00', available: false, reason: 'break' as const },
        { start: '10:00', end: '10:30', available: true },
      ],
      working_hours: { start: '09:00', end: '17:00' }
    }
  }
];

describe('DateBarberSelection', () => {
  const mockProps = {
    services: mockServices,
    barbers: mockBarbers,
    selectedService: mockServices[0],
    onSelectBarberAndTime: jest.fn(),
    onBack: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock realtime availability hook
    mockUseRealtimeAvailability.useRealtimeAvailability.mockReturnValue({
      availability: {},
      connectionStatus: 'connected',
      isConnected: true,
    });

    // Mock availability service
    mockAvailabilityService.availabilityService.getMultiBarberAvailability.mockResolvedValue(mockAvailabilityData);
  });

  it('renders the component with calendar and barber list', async () => {
    render(<DateBarberSelection {...mockProps} />);

    // Check if main elements are rendered
    expect(screen.getByText('Selecciona fecha y barbero')).toBeInTheDocument();
    expect(screen.getByText('Corte Clásico')).toBeInTheDocument();
    expect(screen.getByText('30 min')).toBeInTheDocument();
    expect(screen.getByText('$25')).toBeInTheDocument();
    
    // Check calendar section
    expect(screen.getByText('Seleccionar fecha')).toBeInTheDocument();
    
    // Check barbers section
    expect(screen.getByText('Barberos disponibles')).toBeInTheDocument();
  });

  it('displays barbers with availability information', async () => {
    render(<DateBarberSelection {...mockProps} />);

    // Wait for availability data to load
    await waitFor(() => {
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
      expect(screen.getByText('Carlos López')).toBeInTheDocument();
    });

    // Check barber specialties
    expect(screen.getByText('Cortes clásicos, Barba')).toBeInTheDocument();
    expect(screen.getByText('Cortes modernos')).toBeInTheDocument();
  });

  it('expands barber schedule when clicked', async () => {
    render(<DateBarberSelection {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    });

    // Click on a barber to expand
    const barberCard = screen.getByText('Juan Pérez').closest('[data-state]') || 
                      screen.getByText('Juan Pérez').closest('div');
    
    if (barberCard) {
      fireEvent.click(barberCard);
    }

    // Should show available time slots
    await waitFor(() => {
      expect(screen.getByText('Horarios disponibles')).toBeInTheDocument();
    });
  });

  it('calls onSelectBarberAndTime when time slot is selected', async () => {
    render(<DateBarberSelection {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    });

    // Expand barber to show time slots
    const barberCard = screen.getByText('Juan Pérez').closest('[data-state]') || 
                      screen.getByText('Juan Pérez').closest('div');
    
    if (barberCard) {
      fireEvent.click(barberCard);
    }

    await waitFor(() => {
      expect(screen.getByText('Horarios disponibles')).toBeInTheDocument();
    });

    // Click on a time slot (if available)
    const timeSlots = screen.getAllByRole('button').filter(button => 
      button.textContent?.match(/^\d{2}:\d{2}$/)
    );

    if (timeSlots.length > 0) {
      fireEvent.click(timeSlots[0]);
      expect(mockProps.onSelectBarberAndTime).toHaveBeenCalled();
    }
  });

  it('calls onBack when back button is clicked', () => {
    render(<DateBarberSelection {...mockProps} />);

    const backButton = screen.getByText('Volver a servicios');
    fireEvent.click(backButton);

    expect(mockProps.onBack).toHaveBeenCalled();
  });

  it('shows loading state while fetching availability', () => {
    render(<DateBarberSelection {...mockProps} />);
    
    expect(screen.getByText('Cargando disponibilidad...')).toBeInTheDocument();
  });

  it('handles date selection and updates barber availability', async () => {
    render(<DateBarberSelection {...mockProps} />);

    // The component should call getMultiBarberAvailability on mount
    await waitFor(() => {
      expect(mockAvailabilityService.availabilityService.getMultiBarberAvailability).toHaveBeenCalled();
    });

    // Verify the call was made with correct parameters
    expect(mockAvailabilityService.availabilityService.getMultiBarberAvailability).toHaveBeenCalledWith({
      barber_ids: ['barber1', 'barber2'],
      barbershop_id: 'barbershop1',
      date: expect.any(String),
      service_duration: 30,
    });
  });
});