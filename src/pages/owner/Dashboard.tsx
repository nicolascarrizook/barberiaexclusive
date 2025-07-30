import {useEffect} from 'react';
// // // // // import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// // // // // import { Button } from '@/components/ui/button';
// // // // // import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// // // // // import { Badge } from '@/components/ui/badge';
// // // // // import { Store, Calendar, Users, DollarSign, Clock, Settings, TrendingUp, UserCheck } from 'lucide-react';
// // // // // import { useAuth } from '@/hooks/useAuth';
// // // // // import { barbershopService } from '@/services/barbershops.service';
// // // // // import { appointmentService } from '@/services/appointments.service';
// // // // // import { useQuery } from '@tanstack/react-query';
// // // // // import { Skeleton } from '@/components/ui/skeleton';
// // // // // import { Alert, AlertDescription } from '@/components/ui/alert';
// // // // // import { Link } from 'react-router-dom';
// // // // // import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
// // // // // import { es } from 'date-fns/locale';

export function OwnerDashboard() {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>(
    'week'
  );

  // Fetch barbershop data
  const {
    data: barbershop,
    isLoading: barbershopLoading,
    error: barbershopError,
  } = useQuery({
    queryKey: ['owner-barbershop', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID');
      const _shops = await barbershopService.getByOwner(user.id);
      return shops[0]; // For now, assume one barbershop per owner
    },
    enabled: !!user?.id,
  });

  // Calculate date range based on selected period
  const _dateRange =
    selectedPeriod === 'week'
      ? {
          start: startOfWeek(new Date(), { locale: es }),
          end: endOfWeek(new Date(), { locale: es }),
        }
      : { start: startOfMonth(new Date()), end: endOfMonth(new Date()) };

  // Fetch appointments for the period
  const { data: appointments, isLoading: appointmentsLoading } = useQuery({
    queryKey: ['owner-appointments', barbershop?.id, dateRange],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      return appointmentService.getByBarbershopDateRange(
        barbershop.id,
        dateRange.start,
        dateRange.end
      );
    },
    enabled: !!barbershop?.id,
  });

  // Calculate metrics
  const _metrics = {
    totalAppointments: appointments?.length || 0,
    completedAppointments:
      appointments?.filter((a) => a.status === 'completed').length || 0,
    cancelledAppointments:
      appointments?.filter((a) => a.status === 'cancelled').length || 0,
    totalRevenue:
      appointments
        ?.filter((a) => a.status === 'completed')
        .reduce((sum, a) => sum + (a.total_price || 0), 0) || 0,
  };

  if (barbershopLoading || appointmentsLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Mi barbería</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (barbershopError || !barbershop) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Mi barbería</h1>
        <Card>
          <CardHeader>
            <CardTitle>Bienvenido al panel de propietario</CardTitle>
            <CardDescription>
              Aún no tienes una barbería registrada. Comienza creando tu
              barbería para gestionar tu negocio.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="lg" className="w-full">
              <Link to="/owner/barbershop/new">
                <Store className="mr-2 h-5 w-5" />
                Crear mi barbería
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{barbershop.name}</h1>
          <p className="text-muted-foreground">{barbershop.address}</p>
        </div>
        <Button asChild>
          <Link to="/owner/settings">
            <Settings className="mr-2 h-4 w-4" />
            Configuración
          </Link>
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Citas totales</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.totalAppointments}
            </div>
            <p className="text-xs text-muted-foreground">
              En esta {selectedPeriod === 'week' ? 'semana' : 'mes'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Citas completadas
            </CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.completedAppointments}
            </div>
            <p className="text-xs text-muted-foreground">
              {(
                (metrics.completedAppointments / metrics.totalAppointments) *
                  100 || 0
              ).toFixed(0)}
              % del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${metrics.totalRevenue.toLocaleString('es-AR')}
            </div>
            <p className="text-xs text-muted-foreground">
              De citas completadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelaciones</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.cancelledAppointments}
            </div>
            <p className="text-xs text-muted-foreground">
              {(
                (metrics.cancelledAppointments / metrics.totalAppointments) *
                  100 || 0
              ).toFixed(0)}
              % del total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Period Selector */}
      <Tabs
        value={selectedPeriod}
        onValueChange={(v) => setSelectedPeriod(v as 'week' | 'month')}
      >
        <TabsList>
          <TabsTrigger value="week">Esta semana</TabsTrigger>
          <TabsTrigger value="month">Este mes</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Horarios
            </CardTitle>
            <CardDescription>
              Gestiona los horarios de tu barbería
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/owner/hours">Configurar horarios</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Barberos
            </CardTitle>
            <CardDescription>Administra tu equipo de barberos</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/owner/barbers">Gestionar barberos</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Servicios
            </CardTitle>
            <CardDescription>
              Configura los servicios que ofreces
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/owner/services">Gestionar servicios</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Actividad reciente</CardTitle>
          <CardDescription>Últimas citas y actualizaciones</CardDescription>
        </CardHeader>
        <CardContent>
          {appointments && appointments.length > 0 ? (
            <div className="space-y-4">
              {appointments.slice(0, 5).map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">
                      {appointment.client?.full_name || 'Cliente'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(
                        new Date(appointment.start_time),
                        "d 'de' MMMM 'a las' HH:mm",
                        { locale: es }
                      )}
                    </p>
                  </div>
                  <Badge
                    variant={
                      appointment.status === 'completed'
                        ? 'default'
                        : appointment.status === 'cancelled'
                          ? 'destructive'
                          : 'secondary'
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
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No hay actividad reciente</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
