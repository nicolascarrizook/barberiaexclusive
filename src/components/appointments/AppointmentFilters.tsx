import { useState } from 'react';
import { format, subDays, addDays } from 'date-fns';
import { Calendar, X } from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

// Services
import { type AppointmentFilters as ServiceFilters } from '@/services/appointment-management.service';

// Types
interface AppointmentFiltersProps {
  filters: ServiceFilters;
  onFiltersChange: (filters: Partial<ServiceFilters>) => void;
  barbershopId?: string;
}

interface Barber {
  id: string;
  display_name: string;
}

// Mock barbers - in a real app, this would come from a service
const mockBarbers: Barber[] = [
  { id: '0e66030b-6c0a-43d6-824f-e0f7938137dd', display_name: 'José' },
  { id: 'db46c881-2c34-47ba-aa99-8c2471a4e0f6', display_name: 'Valentina' },
];

// Status options
const statusOptions = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'arrived', label: 'Cliente llegó' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'completed', label: 'Completado' },
  { value: 'cancelled', label: 'Cancelado' },
  { value: 'no_show', label: 'No se presentó' },
];

export function AppointmentFilters({ 
  filters, 
  onFiltersChange
}: AppointmentFiltersProps) {
  // Local state for date pickers
  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    filters.date_from ? new Date(filters.date_from) : undefined
  );
  const [dateTo, setDateTo] = useState<Date | undefined>(
    filters.date_to ? new Date(filters.date_to) : undefined
  );

  // Handle date changes
  const handleDateFromChange = (date: Date | undefined) => {
    setDateFrom(date);
    onFiltersChange({
      date_from: date ? format(date, 'yyyy-MM-dd') : undefined,
    });
  };

  const handleDateToChange = (date: Date | undefined) => {
    setDateTo(date);
    onFiltersChange({
      date_to: date ? format(date, 'yyyy-MM-dd') : undefined,
    });
  };

  // Quick date presets
  const handleQuickDate = (preset: string) => {
    const today = new Date();
    let from: Date;
    let to: Date;

    switch (preset) {
      case 'today':
        from = today;
        to = today;
        break;
      case 'tomorrow':
        from = addDays(today, 1);
        to = addDays(today, 1);
        break;
      case 'this_week':
        from = today;
        to = addDays(today, 7);
        break;
      case 'last_week':
        from = subDays(today, 7);
        to = today;
        break;
      case 'this_month':
        from = new Date(today.getFullYear(), today.getMonth(), 1);
        to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      default:
        return;
    }

    setDateFrom(from);
    setDateTo(to);
    onFiltersChange({
      date_from: format(from, 'yyyy-MM-dd'),
      date_to: format(to, 'yyyy-MM-dd'),
    });
  };

  // Handle barber selection
  const handleBarberChange = (barberId: string) => {
    onFiltersChange({
      barber_id: barberId === 'all' ? undefined : barberId,
    });
  };

  // Handle status selection
  const handleStatusChange = (status: string, checked: boolean) => {
    const currentStatuses = filters.status || [];
    let newStatuses: string[];

    if (checked) {
      newStatuses = [...currentStatuses, status];
    } else {
      newStatuses = currentStatuses.filter(s => s !== status);
    }

    onFiltersChange({
      status: newStatuses.length === 0 ? undefined : newStatuses,
    });
  };

  // Clear all filters
  const handleClearFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    onFiltersChange({
      date_from: undefined,
      date_to: undefined,
      barber_id: undefined,
      status: undefined,
      search: undefined,
    });
  };

  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Filtros avanzados</h3>
        <Button variant="ghost" size="sm" onClick={handleClearFilters}>
          <X className="w-4 h-4 mr-2" />
          Limpiar filtros
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Date From */}
        <div className="space-y-2">
          <Label>Fecha desde</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <Calendar className="mr-2 h-4 w-4" />
                {dateFrom ? format(dateFrom, 'dd/MM/yyyy') : 'Seleccionar fecha'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={dateFrom}
                onSelect={handleDateFromChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Date To */}
        <div className="space-y-2">
          <Label>Fecha hasta</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <Calendar className="mr-2 h-4 w-4" />
                {dateTo ? format(dateTo, 'dd/MM/yyyy') : 'Seleccionar fecha'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={dateTo}
                onSelect={handleDateToChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Barber Selection */}
        <div className="space-y-2">
          <Label>Barbero</Label>
          <Select 
            value={filters.barber_id || 'all'} 
            onValueChange={handleBarberChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos los barberos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los barberos</SelectItem>
              {mockBarbers.map((barber) => (
                <SelectItem key={barber.id} value={barber.id}>
                  {barber.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Payment Status */}
        <div className="space-y-2">
          <Label>Estado de pago</Label>
          <Select 
            value={filters.payment_status || 'all'} 
            onValueChange={(value) => onFiltersChange({
              payment_status: value === 'all' ? undefined : value
            })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="paid">Pagado</SelectItem>
              <SelectItem value="refunded">Reembolsado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick Date Presets */}
      <div className="space-y-2">
        <Label>Fechas rápidas</Label>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => handleQuickDate('today')}>
            Hoy
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleQuickDate('tomorrow')}>
            Mañana
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleQuickDate('this_week')}>
            Esta semana
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleQuickDate('last_week')}>
            Semana pasada
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleQuickDate('this_month')}>
            Este mes
          </Button>
        </div>
      </div>

      {/* Status Checkboxes */}
      <div className="space-y-2">
        <Label>Estados</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {statusOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={`status-${option.value}`}
                checked={filters.status?.includes(option.value) || false}
                onCheckedChange={(checked) => 
                  handleStatusChange(option.value, checked as boolean)
                }
              />
              <Label
                htmlFor={`status-${option.value}`}
                className="text-sm font-normal cursor-pointer"
              >
                {option.label}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Export type for external use
export type { ServiceFilters as AppointmentFiltersType };