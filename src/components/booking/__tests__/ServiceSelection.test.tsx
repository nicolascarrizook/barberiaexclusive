import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { ServiceSelection } from '../ServiceSelection'
import { mockServices } from '@/test/mocks/handlers'

describe('ServiceSelection', () => {
  const defaultProps = {
    services: mockServices,
    selectedService: undefined,
    onSelectService: vi.fn(),
    onNext: vi.fn(),
  }

  it('renderiza todos los servicios disponibles', () => {
    render(<ServiceSelection {...defaultProps} />)
    
    mockServices.forEach(service => {
      expect(screen.getByText(service.name)).toBeInTheDocument()
      expect(screen.getByText(service.description)).toBeInTheDocument()
      expect(screen.getByText(`$${service.price}`)).toBeInTheDocument()
      expect(screen.getByText(`${service.duration} min`)).toBeInTheDocument()
    })
  })

  it('muestra los servicios en un grid', () => {
    render(<ServiceSelection {...defaultProps} />)
    
    // Verificar que existe el contenedor grid
    const gridContainer = screen.getByText(mockServices[0].name).closest('.grid')
    expect(gridContainer).toHaveClass('gap-4', 'md:grid-cols-2')
  })

  it('permite seleccionar un servicio', async () => {
    const user = userEvent.setup()
    const onSelectService = vi.fn()
    
    render(
      <ServiceSelection 
        {...defaultProps} 
        onSelectService={onSelectService}
      />
    )
    
    const firstService = screen.getByText(mockServices[0].name)
    await user.click(firstService)
    
    expect(onSelectService).toHaveBeenCalledWith(mockServices[0])
  })

  it('muestra el servicio seleccionado con estilo diferente', () => {
    const selectedService = mockServices[0]
    
    render(
      <ServiceSelection 
        {...defaultProps} 
        selectedService={selectedService}
      />
    )
    
    // El servicio seleccionado debería tener un ring
    const serviceCard = screen.getByText(selectedService.name).closest('.cursor-pointer')
    expect(serviceCard).toHaveClass('ring-2', 'ring-primary')
  })

  it('desactiva el botón siguiente cuando no hay servicio seleccionado', () => {
    render(<ServiceSelection {...defaultProps} />)
    
    const nextButton = screen.getByRole('button', { name: /siguiente/i })
    expect(nextButton).toBeDisabled()
  })

  it('habilita el botón siguiente cuando hay un servicio seleccionado', () => {
    render(
      <ServiceSelection 
        {...defaultProps} 
        selectedService={mockServices[0]}
      />
    )
    
    const nextButton = screen.getByRole('button', { name: /siguiente/i })
    expect(nextButton).toBeEnabled()
  })

  it('llama a onNext cuando se hace click en siguiente', async () => {
    const user = userEvent.setup()
    const onNext = vi.fn()
    
    render(
      <ServiceSelection 
        {...defaultProps} 
        selectedService={mockServices[0]}
        onNext={onNext}
      />
    )
    
    const nextButton = screen.getByRole('button', { name: /siguiente/i })
    await user.click(nextButton)
    
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('muestra todos los servicios activos e inactivos', () => {
    const servicesWithInactive = [
      ...mockServices,
      {
        ...mockServices[0],
        id: 'inactive-1',
        name: 'Servicio Inactivo',
        is_active: false,
      },
    ]
    
    render(
      <ServiceSelection 
        {...defaultProps} 
        services={servicesWithInactive}
      />
    )
    
    // El componente muestra todos los servicios, no filtra por is_active
    expect(screen.getByText('Servicio Inactivo')).toBeInTheDocument()
  })

  it('maneja correctamente cuando no hay servicios', () => {
    render(
      <ServiceSelection 
        {...defaultProps} 
        services={[]}
      />
    )
    
    // El componente seguirá mostrando el título pero sin servicios
    expect(screen.getByText(/selecciona un servicio/i)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument() // No hay CardTitle
  })

  it('permite cambiar la selección de servicio', async () => {
    const user = userEvent.setup()
    const onSelectService = vi.fn()
    
    render(
      <ServiceSelection 
        {...defaultProps} 
        selectedService={mockServices[0]}
        onSelectService={onSelectService}
      />
    )
    
    // Seleccionar un servicio diferente
    const secondService = screen.getByText(mockServices[1].name)
    await user.click(secondService)
    
    expect(onSelectService).toHaveBeenCalledWith(mockServices[1])
  })
})