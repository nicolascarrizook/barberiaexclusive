import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarberScheduleManager } from '@/components/barber/BarberScheduleManager';
import { VacationRequestForm } from '@/components/schedule/VacationRequestForm';
import { AppointmentDetails } from '@/components/admin/AppointmentDetails';
import { useToast } from '@/hooks/use-toast';
import { AppointmentWithDetails, appointmentService } from '@/services/appointments.service';
import { AppointmentStatus } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { profileService } from '@/services/profiles.service';
import { barbershopService } from '@/services/barbershops.service';
import { Calendar, Clock, CalendarOff, Info, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

export function BarberSchedule() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithDetails | null>(null);
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);
  const [activeTab, setActiveTab] = useState('schedule');

  // Fetch barber profile
  const { data: barberProfile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['barber-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID');
      return profileService.getByUserId(user.id);
    },
    enabled: !!user?.id,
  });

  // Fetch barbershop info
  const { data: barbershop, isLoading: isLoadingBarbershop } = useQuery({
    queryKey: ['barber-barbershop', barberProfile?.barbershop_id],
    queryFn: async () => {
      if (!barberProfile?.barbershop_id) throw new Error('No barbershop ID');
      return barbershopService.getById(barberProfile.barbershop_id);
    },
    enabled: !!barberProfile?.barbershop_id,
  });

  // Fetch today's appointments
  const {
    data: todayAppointments,
    isLoading: isLoadingAppointments,
    refetch: refetchAppointments,
  } = useQuery({
    queryKey: ['barber-appointments', user?.id, selectedDate],
    queryFn: async () => {
      if (!user?.id || !barberProfile?.id) return [];
      const start = startOfDay(selectedDate);
      const end = endOfDay(selectedDate);
      return appointmentService.getByBarberDateRange(
        barberProfile.id,
        start,
        end
      );
    },
    enabled: !!user?.id && !!barberProfile?.id,
  });

  const handleUpdateAppointmentStatus = async (id: string, status: string) => {
    try {
      await appointmentService.updateStatus(id, status as AppointmentStatus);
      toast({
        title: 'Estado actualizado',
        description: `La cita ha sido marcada como ${
          status === 'confirmed'
            ? 'confirmada'
            : status === 'cancelled'
              ? 'cancelada'
              : 'completada'
        }.`,
      });
      setShowAppointmentDetails(false);
      refetchAppointments();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado de la cita',
        variant: 'destructive',
      });
    }
  };

  const handleViewAppointmentDetails = (appointment: AppointmentWithDetails) => {
    setSelectedAppointment(appointment);
    setShowAppointmentDetails(true);
  };

  const isLoading = isLoadingProfile || isLoadingBarbershop;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!barberProfile || !barbershop) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Mi Agenda</h1>
        <Alert variant="destructive">
          <AlertDescription>
            No se pudo cargar tu perfil de barbero. Por favor, contacta al
            administrador.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Calculate stats
  const todayStats = {
    total: todayAppointments?.length || 0,
    confirmed:
      todayAppointments?.filter((a) => a.status === 'confirmed').length || 0,
    pending:
      todayAppointments?.filter((a) => a.status === 'pending').length || 0,
    completed:
      todayAppointments?.filter((a) => a.status === 'completed').length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Mi Agenda
          </h1>
          <p className="text-muted-foreground">
            Gestiona tu horario, descansos y solicitudes de vacaciones
          </p>
        </div>
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Citas Hoy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayStats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Confirmadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {todayStats.confirmed}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {todayStats.pending}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {todayStats.completed}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content with Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Horarios y Descansos
          </TabsTrigger>
          <TabsTrigger value="appointments" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Citas del Día
          </TabsTrigger>
          <TabsTrigger value="vacation" className="flex items-center gap-2">
            <CalendarOff className="h-4 w-4" />
            Vacaciones
          </TabsTrigger>
        </TabsList>

        {/* Schedule Management Tab */}
        <TabsContent value="schedule" className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Gestiona tu horario de trabajo regular y programa descansos
              temporales. Los cambios se reflejarán inmediatamente en la
              disponibilidad para los clientes.
            </AlertDescription>
          </Alert>

          <BarberScheduleManager
            barberId={barberProfile.id}
            barbershopId={barbershop.id}
          />
        </TabsContent>

        {/* Today's Appointments Tab */}
        <TabsContent value="appointments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Citas de Hoy</CardTitle>
              <CardDescription>
                {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", {
                  locale: es,
                })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAppointments ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : todayAppointments && todayAppointments.length > 0 ? (
                <div className="space-y-3">
                  {todayAppointments.map((appointment) => (
                    <Card
                      key={appointment.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleViewAppointmentDetails(appointment)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">
                              {appointment.client?.full_name || 'Cliente'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {format(
                                new Date(appointment.start_time),
                                'HH:mm'
                              )}{' '}
                              -{appointment.service?.name || 'Servicio'}
                            </div>
                          </div>
                          <Badge
                            variant={
                              appointment.status === 'completed'
                                ? 'default'
                                : appointment.status === 'cancelled'
                                  ? 'destructive'
                                  : appointment.status === 'confirmed'
                                    ? 'secondary'
                                    : 'outline'
                            }
                          >
                            {appointment.status === 'completed'
                              ? 'Completada'
                              : appointment.status === 'cancelled'
                                ? 'Cancelada'
                                : appointment.status === 'confirmed'
                                  ? 'Confirmada'
                                  : 'Pendiente'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No tienes citas programadas para hoy
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vacation Requests Tab */}
        <TabsContent value="vacation" className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Las solicitudes de vacaciones deben ser aprobadas por un
              administrador. Recibirás una notificación cuando tu solicitud sea
              procesada.
            </AlertDescription>
          </Alert>

          <VacationRequestForm />
        </TabsContent>
      </Tabs>

      {/* Appointment Details Dialog */}
      <AppointmentDetails
        appointment={selectedAppointment}
        isOpen={showAppointmentDetails}
        onClose={() => setShowAppointmentDetails(false)}
        onUpdateStatus={handleUpdateAppointmentStatus}
      />
    </div>
  );
}
