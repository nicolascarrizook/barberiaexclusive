import React, { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, isSameDay, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Users, 
  AlertCircle,
  Coffee,
  CalendarOff,
  Activity,
  Eye,
  Filter
} from 'lucide-react';
import { barberService } from '@/services/barbers.service';
import { availabilityService } from '@/services/availability.service';
import { holidaysService } from '@/services/holidays.service';
import { timeOffService } from '@/services/time-off.service';
import { barbershopHoursService } from '@/services/barbershop-hours.service';

interface ScheduleOverviewProps {
  barbershopId: string;
}

type ViewMode = 'week' | 'month';

interface BarberScheduleData {
  id: string;
  name: string;
  avatar_url?: string;
  schedule: {
    [date: string]: {
      isWorking: boolean;
      breaks: Array<{ start_time: string; end_time: string; reason?: string }>;
      timeOff?: { reason: string; status: string };
      appointments: number;
      capacity: number;
    };
  };
}

export function ScheduleOverview({ barbershopId }: ScheduleOverviewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);

  // Fetch barbers
  const { data: barbers, isLoading: isLoadingBarbers } = useQuery({
    queryKey: ['barbershop-barbers', barbershopId],
    queryFn: () => barberService.getByBarbershop(barbershopId),
  });

  // Fetch barbershop hours
  const { data: barbershopHours, isLoading: isLoadingHours } = useQuery({
    queryKey: ['barbershop-hours', barbershopId],
    queryFn: () => barbershopHoursService.getBarbershopSchedule(barbershopId),
  });

  // Fetch holidays for the current period
  const { data: holidays, isLoading: isLoadingHolidays } = useQuery({
    queryKey: ['holidays', barbershopId, currentDate, viewMode],
    queryFn: async () => {
      const { startDate, endDate } = getDateRange();
      return holidaysService.getHolidaysInRange(barbershopId, startDate, endDate);
    },
  });

  // Fetch time off requests for all barbers
  const { data: timeOffRequests, isLoading: isLoadingTimeOff } = useQuery({
    queryKey: ['time-off-overview', barbershopId, currentDate, viewMode],
    queryFn: async () => {
      const { startDate, endDate } = getDateRange();
      return timeOffService.getBarbershopTimeOffInRange(barbershopId, startDate, endDate);
    },
  });

  // Fetch availability data
  const { data: availabilityData, isLoading: isLoadingAvailability } = useQuery({
    queryKey: ['availability-overview', barbershopId, currentDate, viewMode],
    queryFn: async () => {
      const { startDate, endDate } = getDateRange();
      return availabilityService.getAvailabilityHeatmap(barbershopId, startDate, endDate);
    },
  });

  const getDateRange = () => {
    let startDate: Date;
    let endDate: Date;

    if (viewMode === 'week') {
      startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
      endDate = addDays(startDate, 6);
    } else {
      startDate = startOfMonth(currentDate);
      endDate = endOfMonth(currentDate);
    }

    return {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
    };
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    if (viewMode === 'week') {
      setCurrentDate(prev => addDays(prev, direction === 'next' ? 7 : -7));
    } else {
      setCurrentDate(prev => direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1));
    }
  };

  const isHoliday = (date: Date): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return holidays?.some(h => h.date === dateStr) || false;
  };

  const getDaySchedule = (barberId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayOfWeek = format(date, 'EEEE').toLowerCase();
    
    // Check if it's a holiday
    const holiday = holidays?.find(h => h.date === dateStr);
    if (holiday && !holiday.custom_hours) {
      return { isWorking: false, isHoliday: true, holidayReason: holiday.reason };
    }

    // Check barbershop hours
    const dayHours = barbershopHours?.find(h => h.day_of_week === dayOfWeek);
    if (!dayHours || dayHours.is_closed) {
      return { isWorking: false, isClosed: true };
    }

    // Check time off
    const timeOff = timeOffRequests?.find(
      to => to.barber_id === barberId && 
      dateStr >= to.start_date && 
      dateStr <= to.end_date &&
      (to.status === 'approved' || to.status === 'pending')
    );
    if (timeOff) {
      return { 
        isWorking: false, 
        hasTimeOff: true, 
        timeOffReason: timeOff.reason,
        timeOffStatus: timeOff.status 
      };
    }

    // Get availability data
    const availability = availabilityData?.find(
      a => a.date === dateStr && a.barber_id === barberId
    );

    return { 
      isWorking: true,
      availability: availability?.availability_level || 'high',
      bookings: availability?.bookings || 0,
      capacity: availability?.capacity || 8
    };
  };

  const getStatusColor = (schedule: any) => {
    if (!schedule.isWorking) {
      if (schedule.isHoliday) return 'bg-blue-100 border-blue-300';
      if (schedule.hasTimeOff) {
        return schedule.timeOffStatus === 'pending' 
          ? 'bg-yellow-100 border-yellow-300' 
          : 'bg-orange-100 border-orange-300';
      }
      if (schedule.isClosed) return 'bg-gray-100 border-gray-300';
    }

    // Working day - show availability
    switch (schedule.availability) {
      case 'high': return 'bg-green-100 border-green-300';
      case 'medium': return 'bg-yellow-100 border-yellow-300';
      case 'low': return 'bg-orange-100 border-orange-300';
      case 'full': return 'bg-red-100 border-red-300';
      default: return 'bg-white border-gray-200';
    }
  };

  const getStatusIcon = (schedule: any) => {
    if (!schedule.isWorking) {
      if (schedule.isHoliday) return <Calendar className="h-3 w-3" />;
      if (schedule.hasTimeOff) return <CalendarOff className="h-3 w-3" />;
      if (schedule.isClosed) return <Clock className="h-3 w-3" />;
    }
    return null;
  };

  const renderWeekView = () => {
    const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

    return (
      <div className="space-y-4">
        {/* Days header */}
        <div className="grid grid-cols-8 gap-2">
          <div className="font-medium text-sm">Barbero</div>
          {days.map((day) => (
            <div key={day.toISOString()} className="text-center">
              <div className="font-medium text-sm">
                {format(day, 'EEE', { locale: es })}
              </div>
              <div className="text-xs text-muted-foreground">
                {format(day, 'd MMM', { locale: es })}
              </div>
              {isSameDay(day, new Date()) && (
                <Badge variant="secondary" className="text-xs mt-1">Hoy</Badge>
              )}
            </div>
          ))}
        </div>

        {/* Barbers schedule */}
        <div className="space-y-2">
          {barbers?.map((barber) => (
            <div key={barber.id} className="grid grid-cols-8 gap-2 items-center">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={barber.avatar_url} />
                  <AvatarFallback>
                    {barber.full_name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium truncate">
                  {barber.full_name.split(' ')[0]}
                </span>
              </div>
              
              {days.map((day) => {
                const schedule = getDaySchedule(barber.id, day);
                return (
                  <TooltipProvider key={day.toISOString()}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={`
                            h-12 rounded-md border-2 flex items-center justify-center
                            cursor-pointer transition-all hover:scale-105
                            ${getStatusColor(schedule)}
                          `}
                        >
                          {getStatusIcon(schedule)}
                          {schedule.isWorking && schedule.bookings > 0 && (
                            <span className="text-xs font-medium">
                              {schedule.bookings}/{schedule.capacity}
                            </span>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-xs">
                          <div className="font-medium">{format(day, 'EEEE d', { locale: es })}</div>
                          {!schedule.isWorking && (
                            <>
                              {schedule.isHoliday && <div>Feriado: {schedule.holidayReason}</div>}
                              {schedule.hasTimeOff && (
                                <div>
                                  Vacaciones ({schedule.timeOffStatus === 'pending' ? 'Pendiente' : 'Aprobada'}): 
                                  {schedule.timeOffReason}
                                </div>
                              )}
                              {schedule.isClosed && <div>Barbería cerrada</div>}
                            </>
                          )}
                          {schedule.isWorking && (
                            <div>
                              Reservas: {schedule.bookings}/{schedule.capacity}
                              <br />
                              Disponibilidad: {
                                schedule.availability === 'high' ? 'Alta' :
                                schedule.availability === 'medium' ? 'Media' :
                                schedule.availability === 'low' ? 'Baja' :
                                'Completo'
                              }
                            </div>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const isLoading = isLoadingBarbers || isLoadingHours || isLoadingHolidays || 
                   isLoadingTimeOff || isLoadingAvailability;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Vista General de Horarios
              </CardTitle>
              <CardDescription>
                Visualiza los horarios de todos los barberos, vacaciones y disponibilidad
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('week')}
              >
                Semana
              </Button>
              <Button
                variant={viewMode === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('month')}
              >
                Mes
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateDate('prev')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <h3 className="text-lg font-medium">
          {viewMode === 'week' 
            ? `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'd MMM', { locale: es })} - ${format(addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 6), 'd MMM yyyy', { locale: es })}`
            : format(currentDate, 'MMMM yyyy', { locale: es })
          }
        </h3>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateDate('next')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded"></div>
              <span>Alta disponibilidad</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-100 border-2 border-yellow-300 rounded"></div>
              <span>Media disponibilidad</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-100 border-2 border-orange-300 rounded"></div>
              <span>Baja disponibilidad / Vacaciones</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100 border-2 border-blue-300 rounded"></div>
              <span>Feriado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-100 border-2 border-gray-300 rounded"></div>
              <span>Cerrado</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Grid */}
      <Card>
        <CardContent className="pt-6">
          {viewMode === 'week' && renderWeekView()}
          {viewMode === 'month' && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                La vista mensual estará disponible próximamente. Por ahora, usa la vista semanal.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Barberos Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{barbers?.length || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Feriados este mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {holidays?.filter(h => {
                const holidayMonth = new Date(h.date).getMonth();
                return holidayMonth === currentDate.getMonth();
              }).length || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Vacaciones activas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {timeOffRequests?.filter(to => to.status === 'approved').length || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Solicitudes pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {timeOffRequests?.filter(to => to.status === 'pending').length || 0}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}