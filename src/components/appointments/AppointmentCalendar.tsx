import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, parseISO, startOfWeek, endOfWeek, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Calendar, Clock, User, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { appointmentManagementService, type AppointmentListItem, type DaySchedule } from '@/services/appointment-management.service';
import { useToast } from '@/hooks/use-toast';

interface AppointmentCalendarProps {
  barbershopId: string;
  barberId?: string;
  onAppointmentClick?: (appointment: AppointmentListItem) => void;
  className?: string;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  appointments: AppointmentListItem[];
  totalRevenue: number;
}

export function AppointmentCalendar({
  barbershopId,
  barberId,
  onAppointmentClick,
  className,
}: AppointmentCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [monthSchedules, setMonthSchedules] = useState<DaySchedule[]>([]);

  const { toast } = useToast();

  // Load appointments for the current month
  useEffect(() => {
    loadMonthAppointments();
  }, [currentMonth, barbershopId, barberId]);

  const loadMonthAppointments = async () => {
    setIsLoading(true);
    try {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      
      const schedules = await appointmentManagementService.getAppointmentsByDateRange(
        barbershopId,
        monthStart,
        monthEnd,
        barberId
      );
      
      setMonthSchedules(schedules);
      generateCalendarDays(schedules);
    } catch (error) {
      console.error('Error loading appointments:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las citas del mes',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateCalendarDays = (schedules: DaySchedule[]) => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { locale: es });
    const calendarEnd = endOfWeek(monthEnd, { locale: es });
    
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    const today = new Date();
    
    const calendarData = days.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const daySchedule = schedules.find(s => s.date === dateStr);
      
      return {
        date,
        isCurrentMonth: isSameMonth(date, currentMonth),
        isToday: isSameDay(date, today),
        appointments: daySchedule?.appointments || [],
        totalRevenue: daySchedule?.total_revenue || 0,
      };
    });
    
    setCalendarDays(calendarData);
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
    setSelectedDay(null);
  };

  const handleDayClick = (day: CalendarDay) => {
    if (day.appointments.length > 0) {
      setSelectedDay(day.date);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100',
      confirmed: 'bg-blue-100',
      in_progress: 'bg-indigo-100',
      completed: 'bg-green-100',
      cancelled: 'bg-red-100',
      no_show: 'bg-gray-100',
    };
    return colors[status] || 'bg-gray-100';
  };

  const selectedDayAppointments = selectedDay
    ? calendarDays.find(day => isSameDay(day.date, selectedDay))?.appointments || []
    : [];

  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-1 lg:grid-cols-3 gap-6', className)}>
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-8 w-48" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }).map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-1 lg:grid-cols-3 gap-6', className)}>
      {/* Calendar Grid */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePreviousMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNextMonth}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
              <div
                key={day}
                className="text-center text-sm font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, index) => (
              <div
                key={index}
                className={cn(
                  'min-h-[80px] p-2 border rounded-lg cursor-pointer transition-colors',
                  !day.isCurrentMonth && 'opacity-50',
                  day.isToday && 'border-primary bg-primary/5',
                  selectedDay && isSameDay(day.date, selectedDay) && 'ring-2 ring-primary',
                  day.appointments.length > 0 ? 'hover:bg-gray-50' : 'cursor-default'
                )}
                onClick={() => handleDayClick(day)}
              >
                <div className="font-medium text-sm mb-1">
                  {format(day.date, 'd')}
                </div>
                
                {day.appointments.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-xs px-1 py-0">
                        {day.appointments.length}
                      </Badge>
                      {day.totalRevenue > 0 && (
                        <span className="text-xs text-green-600 font-medium">
                          ${day.totalRevenue}
                        </span>
                      )}
                    </div>
                    
                    {/* Status indicators */}
                    <div className="flex gap-1 flex-wrap">
                      {['pending', 'confirmed', 'completed'].map(status => {
                        const count = day.appointments.filter(a => a.status === status).length;
                        if (count === 0) return null;
                        return (
                          <div
                            key={status}
                            className={cn(
                              'w-2 h-2 rounded-full',
                              getStatusColor(status)
                            )}
                            title={`${count} ${status}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-yellow-100" />
              <span>Pendiente</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-100" />
              <span>Confirmada</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-100" />
              <span>Completada</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Day Detail */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {selectedDay
              ? format(selectedDay, "d 'de' MMMM", { locale: es })
              : 'Selecciona un día'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedDay && selectedDayAppointments.length > 0 ? (
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {selectedDayAppointments
                  .sort((a, b) => a.start_at.localeCompare(b.start_at))
                  .map(appointment => (
                    <div
                      key={appointment.id}
                      className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => onAppointmentClick?.(appointment)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">
                            {format(parseISO(appointment.start_at), 'HH:mm')}
                          </span>
                        </div>
                        <Badge
                          variant="secondary"
                          className={cn('text-xs', getStatusColor(appointment.status))}
                        >
                          {appointment.status === 'completed' ? 'Completada' :
                           appointment.status === 'confirmed' ? 'Confirmada' :
                           appointment.status === 'cancelled' ? 'Cancelada' :
                           appointment.status === 'pending' ? 'Pendiente' : appointment.status}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">
                            {appointment.customer.full_name}
                          </span>
                        </div>
                        
                        <div className="text-xs text-muted-foreground">
                          {appointment.services.map(s => s.service.name).join(', ')}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {appointment.barber.display_name}
                          </span>
                          <span className="text-sm font-medium text-green-600">
                            ${appointment.total_amount}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {selectedDay ? (
                <>
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No hay citas para este día</p>
                </>
              ) : (
                <>
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Selecciona un día para ver las citas</p>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}