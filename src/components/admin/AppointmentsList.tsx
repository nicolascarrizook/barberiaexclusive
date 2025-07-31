import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { appointmentService, AppointmentWithDetails } from '@/services/appointments.service';
import { barbershopService } from '@/services/barbershops.service';
import { format, startOfDay, endOfDay, subDays, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Clock, Phone, User, CheckCircle, XCircle, AlertCircle, Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

type AppointmentStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

const statusConfig: Record<AppointmentStatus, { label: string; color: string; icon: any }> = {
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
  confirmed: { label: 'Confirmada', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  in_progress: { label: 'En progreso', color: 'bg-purple-100 text-purple-800', icon: Clock },
  completed: { label: 'Completada', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  cancelled: { label: 'Cancelada', color: 'bg-red-100 text-red-800', icon: XCircle },
  no_show: { label: 'No asistió', color: 'bg-gray-100 text-gray-800', icon: XCircle },
};

export function AppointmentsList() {
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'all' | 'today' | 'upcoming' | 'past'>('today');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [barbershopId, setBarbershopId] = useState<string | null>(null);

  useEffect(() => {
    loadBarbershop();
  }, []);

  useEffect(() => {
    if (barbershopId) {
      loadAppointments();
    }
  }, [barbershopId, selectedTab]);

  const loadBarbershop = async () => {
    try {
      const barbershops = await barbershopService.getAllSimple();
      
      if (barbershops.length > 0) {
        setBarbershopId(barbershops[0].id);
        console.log('Barbershop loaded:', barbershops[0].name);
      } else {
        console.log('No barbershops found in database');
        toast({
          title: "Información",
          description: "No se encontraron barberías. Por favor, crea una barbería primero.",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error loading barbershop:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la barbería",
        variant: "destructive"
      });
    }
  };

  const loadAppointments = async () => {
    if (!barbershopId) return;
    
    setLoading(true);
    try {
      const today = new Date();
      let startDate = new Date(today.getFullYear() - 1, 0, 1); // Default: last year
      let endDate = new Date(today.getFullYear() + 1, 11, 31); // Default: next year

      switch (selectedTab) {
        case 'today':
          startDate = startOfDay(today);
          endDate = endOfDay(today);
          break;
        case 'upcoming':
          startDate = startOfDay(addDays(today, 1));
          endDate = addDays(today, 30); // Next 30 days
          break;
        case 'past':
          startDate = subDays(today, 30); // Last 30 days
          endDate = endOfDay(subDays(today, 1));
          break;
      }

      const data = await appointmentService.getByBarbershopDateRange(
        barbershopId,
        startDate,
        endDate
      );

      // Sort by date and time
      const sortedData = data.sort((a, b) => {
        const dateA = new Date(a.start_time).getTime();
        const dateB = new Date(b.start_time).getTime();
        return selectedTab === 'past' ? dateB - dateA : dateA - dateB;
      });

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
      
      // Update local state
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
    return format(new Date(date), "EEEE d 'de' MMMM, yyyy", { locale: es });
  };

  // Filter appointments based on status and search term
  const filteredAppointments = appointments.filter(appointment => {
    const matchesStatus = selectedStatus === 'all' || appointment.status === selectedStatus;
    const matchesSearch = !searchTerm || 
      appointment.customer.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.barber.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.service.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

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
            <div className="grid gap-4 md:grid-cols-[1fr_200px]">
              {/* Main Content */}
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {appointment.customer.full_name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-semibold">{appointment.customer.full_name}</h4>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {appointment.customer.phone}
                      </p>
                    </div>
                  </div>
                  <Badge className={cn("ml-2", statusConfig[status].color)}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {statusConfig[status].label}
                  </Badge>
                </div>

                {/* Details */}
                <div className="grid gap-2 text-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>Barbero:</span>
                    </div>
                    <span className="font-medium">{appointment.barber.display_name}</span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Horario:</span>
                    </div>
                    <span className="font-medium">{getAppointmentTime(appointment)}</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">Servicio:</span>
                    <span className="font-medium">
                      {appointment.service.name} ({appointment.service.duration_minutes} min) - ${appointment.price}
                    </span>
                  </div>

                  {appointment.notes && (
                    <p className="text-muted-foreground italic">
                      Nota: {appointment.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 justify-center">
                {status === 'pending' && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}
                      disabled={isUpdating}
                    >
                      Confirmar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                      disabled={isUpdating}
                    >
                      Cancelar
                    </Button>
                  </>
                )}
                {status === 'confirmed' && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateAppointmentStatus(appointment.id, 'in_progress')}
                      disabled={isUpdating}
                    >
                      Iniciar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                      disabled={isUpdating}
                    >
                      Cancelar
                    </Button>
                  </>
                )}
                {status === 'in_progress' && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                    disabled={isUpdating}
                  >
                    Completar
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!barbershopId) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Gestión de Citas</h1>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No se ha encontrado ninguna barbería. Por favor, crea una barbería primero desde el panel de configuración.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gestión de Citas</h1>
        <Button onClick={loadAppointments} variant="outline">
          Actualizar
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, barbero o servicio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(statusConfig).map(([value, config]) => (
              <SelectItem key={value} value={value}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="today">Hoy</TabsTrigger>
          <TabsTrigger value="upcoming">Próximas</TabsTrigger>
          <TabsTrigger value="past">Pasadas</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="mt-6">
          {filteredAppointments.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No hay citas que mostrar
                </p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[600px] pr-4">
              <AnimatePresence>
                {Object.entries(groupAppointmentsByDate(filteredAppointments)).map(([date, dateAppointments]) => (
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