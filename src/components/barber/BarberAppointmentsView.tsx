import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { appointmentService, AppointmentWithDetails } from "@/services/appointments.service";
import { useBarber } from "@/hooks/useBarber";
import { format, isToday, isTomorrow, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Clock, Phone, User, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

type AppointmentStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

const statusConfig: Record<AppointmentStatus, { label: string; color: string; icon: any }> = {
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
  confirmed: { label: 'Confirmada', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  in_progress: { label: 'En progreso', color: 'bg-purple-100 text-purple-800', icon: Clock },
  completed: { label: 'Completada', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  cancelled: { label: 'Cancelada', color: 'bg-red-100 text-red-800', icon: XCircle },
  no_show: { label: 'No asistió', color: 'bg-gray-100 text-gray-800', icon: XCircle },
};

export function BarberAppointmentsView() {
  const { barberId, loading: barberLoading, error: barberError } = useBarber();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'today' | 'upcoming'>('today');
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  useEffect(() => {
    if (barberId) {
      loadAppointments();
    }
  }, [barberId, selectedTab]);

  const loadAppointments = async () => {
    if (!barberId) return;
    
    setLoading(true);
    try {
      const today = new Date();
      let startDate = startOfDay(today);
      let endDate = endOfDay(today);

      if (selectedTab === 'upcoming') {
        startDate = startOfDay(new Date(today.getTime() + 24 * 60 * 60 * 1000)); // Tomorrow
        endDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000); // Next 7 days
      }

      const data = await appointmentService.getAppointmentsByBarberDateRange(
        barberId,
        startDate.toISOString(),
        endDate.toISOString()
      );

      // Ordenar por hora de inicio
      const sortedData = data.sort((a, b) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );

      setAppointments(sortedData);
    } catch (error) {
      console.error('Error loading appointments:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las citas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, newStatus: AppointmentStatus) => {
    setUpdatingStatus(appointmentId);
    try {
      await appointmentService.updateAppointmentStatus(appointmentId, newStatus);
      
      // Actualizar el estado local
      setAppointments(prev => 
        prev.map(apt => 
          apt.id === appointmentId ? { ...apt, status: newStatus } : apt
        )
      );

      toast({
        title: "Estado actualizado",
        description: `La cita ha sido marcada como ${statusConfig[newStatus].label.toLowerCase()}`,
      });
    } catch (error) {
      console.error('Error updating appointment status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la cita",
        variant: "destructive"
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getAppointmentTime = (appointment: AppointmentWithDetails) => {
    const start = new Date(appointment.start_time);
    const end = new Date(appointment.end_time);
    return `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;
  };

  const getDateLabel = (date: string) => {
    const appointmentDate = new Date(date);
    if (isToday(appointmentDate)) return 'Hoy';
    if (isTomorrow(appointmentDate)) return 'Mañana';
    return format(appointmentDate, "EEEE d 'de' MMMM", { locale: es });
  };

  const groupAppointmentsByDate = (appointments: AppointmentWithDetails[]) => {
    const grouped: Record<string, AppointmentWithDetails[]> = {};
    
    appointments.forEach(appointment => {
      const dateKey = format(new Date(appointment.start_time), 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(appointment);
    });

    return grouped;
  };

  const renderAppointmentCard = (appointment: AppointmentWithDetails) => {
    const status = appointment.status as AppointmentStatus;
    const StatusIcon = statusConfig[status].icon;
    const isUpdating = updatingStatus === appointment.id;

    return (
      <motion.div
        key={appointment.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="mb-4 hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex gap-4 flex-1">
                {/* Customer Avatar */}
                <Avatar className="h-12 w-12">
                  <AvatarFallback>
                    {appointment.customer.full_name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* Appointment Details */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">{appointment.customer.full_name}</h4>
                    <Badge className={cn("ml-2", statusConfig[status].color)}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusConfig[status].label}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {getAppointmentTime(appointment)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {appointment.customer.phone}
                    </div>
                  </div>

                  <div className="text-sm">
                    <span className="font-medium">{appointment.service.name}</span>
                    <span className="text-muted-foreground"> • {appointment.service.duration_minutes} min</span>
                    <span className="text-muted-foreground"> • ${appointment.service.price}</span>
                  </div>

                  {appointment.notes && (
                    <p className="text-sm text-muted-foreground italic">
                      Nota: {appointment.notes}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {(status === 'pending' || status === 'confirmed') && (
              <div className="flex gap-2 mt-4 pt-4 border-t">
                {status === 'pending' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}
                    disabled={isUpdating}
                  >
                    Confirmar
                  </Button>
                )}
                {status === 'confirmed' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateAppointmentStatus(appointment.id, 'in_progress')}
                    disabled={isUpdating}
                  >
                    Iniciar
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                  disabled={isUpdating}
                >
                  Completar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                  disabled={isUpdating}
                >
                  Cancelar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  if (barberLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Mis Citas</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!barberId || barberError) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {barberError || 'No se encontró información del barbero. Por favor, contacta al administrador.'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Mis Citas</h1>
        <Button variant="outline" onClick={loadAppointments}>
          Actualizar
        </Button>
      </div>

      <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as 'today' | 'upcoming')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="today">Hoy</TabsTrigger>
          <TabsTrigger value="upcoming">Próximas</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="mt-6">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : appointments.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {selectedTab === 'today' 
                    ? 'No tienes citas programadas para hoy'
                    : 'No tienes citas próximas programadas'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[600px] pr-4">
              <AnimatePresence>
                {Object.entries(groupAppointmentsByDate(appointments)).map(([date, dateAppointments]) => (
                  <div key={date} className="mb-6">
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {getDateLabel(date)}
                    </h3>
                    {dateAppointments.map(renderAppointmentCard)}
                  </div>
                ))}
              </AnimatePresence>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}