import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Appointment } from "@/types";
import { Calendar, Clock, DollarSign, TrendingUp, Users, Scissors } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface DashboardProps {
  appointments: Appointment[];
}

export function Dashboard({ appointments }: DashboardProps) {
  // Calculate statistics
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.date);
    aptDate.setHours(0, 0, 0, 0);
    return aptDate.getTime() === today.getTime();
  });

  const confirmedToday = todayAppointments.filter(apt => apt.status === 'confirmed').length;
  const pendingToday = todayAppointments.filter(apt => apt.status === 'pending').length;
  const completedToday = todayAppointments.filter(apt => apt.status === 'completed').length;

  const todayRevenue = todayAppointments
    .filter(apt => apt.status === 'completed')
    .reduce((sum, apt) => sum + apt.price, 0);

  const weekRevenue = appointments
    .filter(apt => {
      const aptDate = new Date(apt.date);
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return apt.status === 'completed' && aptDate >= weekAgo && aptDate <= today;
    })
    .reduce((sum, apt) => sum + apt.price, 0);

  const nextAppointment = appointments
    .filter(apt => {
      const aptDate = new Date(apt.date);
      return apt.status === 'confirmed' && aptDate >= today;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          {format(today, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Citas de hoy
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayAppointments.length}</div>
            <p className="text-xs text-muted-foreground">
              {confirmedToday} confirmadas, {pendingToday} pendientes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ingresos de hoy
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${todayRevenue}</div>
            <p className="text-xs text-muted-foreground">
              {completedToday} servicios completados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ingresos semanales
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${weekRevenue}</div>
            <p className="text-xs text-muted-foreground">
              Últimos 7 días
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Próxima cita
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {nextAppointment ? (
              <>
                <div className="text-2xl font-bold">{nextAppointment.time}</div>
                <p className="text-xs text-muted-foreground">
                  {nextAppointment.customerName} - {nextAppointment.barberName}
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">-</div>
                <p className="text-xs text-muted-foreground">
                  No hay citas próximas
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scissors className="h-5 w-5" />
              Barberos más solicitados
            </CardTitle>
            <CardDescription>
              Basado en las citas de los últimos 30 días
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {getTopBarbers(appointments).map((barber, index) => (
                <div key={barber.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{barber.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {barber.appointments} citas
                      </p>
                    </div>
                  </div>
                  <div className="text-sm font-medium">
                    ${barber.revenue}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Servicios populares
            </CardTitle>
            <CardDescription>
              Los servicios más solicitados este mes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {getTopServices(appointments).map((service, index) => (
                <div key={service.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/50 text-secondary-foreground font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{service.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {service.count} reservas
                      </p>
                    </div>
                  </div>
                  <div className="text-sm font-medium">
                    ${service.revenue}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getTopBarbers(appointments: Appointment[]) {
  const barberStats = appointments
    .filter(apt => apt.status === 'completed')
    .reduce((acc, apt) => {
      if (!acc[apt.barberName]) {
        acc[apt.barberName] = { appointments: 0, revenue: 0 };
      }
      acc[apt.barberName].appointments++;
      acc[apt.barberName].revenue += apt.price;
      return acc;
    }, {} as Record<string, { appointments: number; revenue: number }>);

  return Object.entries(barberStats)
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.appointments - a.appointments)
    .slice(0, 5);
}

function getTopServices(appointments: Appointment[]) {
  const serviceStats = appointments
    .filter(apt => apt.status === 'completed')
    .reduce((acc, apt) => {
      if (!acc[apt.serviceName]) {
        acc[apt.serviceName] = { count: 0, revenue: 0 };
      }
      acc[apt.serviceName].count++;
      acc[apt.serviceName].revenue += apt.price;
      return acc;
    }, {} as Record<string, { count: number; revenue: number }>);

  return Object.entries(serviceStats)
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}