import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, DollarSign, Users, TrendingUp, AlertCircle } from 'lucide-react';
import { useBarber } from '@/hooks/useBarber';
import { appointmentService, AppointmentWithDetails } from '@/services/appointments.service';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function BarberDashboard() {
  const { barberId, loading: barberLoading, error: barberError } = useBarber();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [stats, setStats] = useState({
    todayAppointments: 0,
    todayCompleted: 0,
    weekAppointments: 0,
    monthEarnings: 0,
    pendingAppointments: 0,
  });

  useEffect(() => {
    if (barberId) {
      loadDashboardData();
    }
  }, [barberId]);

  const loadDashboardData = async () => {
    if (!barberId) return;

    setLoading(true);
    try {
      const today = new Date();
      const todayStart = startOfDay(today);
      const todayEnd = endOfDay(today);
      const weekStart = startOfWeek(today, { locale: es });
      const weekEnd = endOfWeek(today, { locale: es });
      const monthStart = startOfMonth(today);
      const monthEnd = endOfMonth(today);

      // Get today's appointments
      const todayAppts = await appointmentService.getByBarberDateRange(
        barberId,
        todayStart,
        todayEnd
      );

      // Get week appointments
      const weekAppts = await appointmentService.getByBarberDateRange(
        barberId,
        weekStart,
        weekEnd
      );

      // Get month appointments for earnings
      const monthAppts = await appointmentService.getByBarberDateRange(
        barberId,
        monthStart,
        monthEnd
      );

      // Calculate stats
      const todayCompleted = todayAppts.filter(apt => apt.status === 'completed').length;
      const pendingAppts = todayAppts.filter(apt => apt.status === 'pending').length;
      const monthEarnings = monthAppts
        .filter(apt => apt.status === 'completed')
        .reduce((sum, apt) => sum + apt.price, 0);

      setStats({
        todayAppointments: todayAppts.length,
        todayCompleted,
        weekAppointments: weekAppts.length,
        monthEarnings,
        pendingAppointments: pendingAppts,
      });

      // Get next 5 upcoming appointments
      const upcomingAppts = todayAppts
        .filter(apt => new Date(apt.start_time) > new Date() && apt.status !== 'cancelled')
        .slice(0, 5);
      
      setAppointments(upcomingAppts);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (barberLoading || loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Mi Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
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
        <h1 className="text-3xl font-bold">Mi Dashboard</h1>
        <Button onClick={loadDashboardData} variant="outline">
          Actualizar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Citas de hoy</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayAppointments}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingAppointments > 0 && `${stats.pendingAppointments} pendientes`}
              {stats.pendingAppointments === 0 && stats.todayCompleted > 0 && `${stats.todayCompleted} completadas`}
              {stats.todayAppointments === 0 && 'Sin citas programadas'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Citas esta semana
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.weekAppointments}</div>
            <p className="text-xs text-muted-foreground">
              {format(startOfWeek(new Date(), { locale: es }), 'd MMM', { locale: es })} - {format(endOfWeek(new Date(), { locale: es }), 'd MMM', { locale: es })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ganancias del mes
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.monthEarnings}</div>
            <p className="text-xs text-muted-foreground">
              {format(new Date(), 'MMMM yyyy', { locale: es })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completadas hoy
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayCompleted}</div>
            <p className="text-xs text-muted-foreground">
              de {stats.todayAppointments} citas totales
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Próximas citas</CardTitle>
          <CardDescription>Tus próximas citas programadas</CardDescription>
        </CardHeader>
        <CardContent>
          {appointments.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No hay más citas programadas para hoy
              </p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => navigate('/barber/appointments')}
              >
                Ver todas las citas
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {appointments.map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">{appointment.customer.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {appointment.service.name} • {format(new Date(appointment.start_time), 'HH:mm')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${appointment.price}</p>
                    <p className="text-xs text-muted-foreground">{appointment.service.duration_minutes} min</p>
                  </div>
                </div>
              ))}
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/barber/appointments')}
              >
                Ver todas las citas
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
