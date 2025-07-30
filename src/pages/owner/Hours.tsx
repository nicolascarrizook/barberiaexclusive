// // // // // import { useState } from 'react';
// // // // // import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// // // // // import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// // // // // import { BarbershopScheduleConfig } from '@/components/owner/BarbershopScheduleConfig';
// // // // // import { HolidayCalendar } from '@/components/schedule/HolidayCalendar';
import CapacityManagement from '@/components/owner/CapacityManagement';
// // // // // import { Clock, Calendar, Settings, Activity, Users, ArrowLeft } from 'lucide-react';
// // // // // import { useAuth } from '@/hooks/useAuth';
// // // // // import { useQuery } from '@tanstack/react-query';
// // // // // import { barbershopService } from '@/services/barbershops.service';
// // // // // import { Skeleton } from '@/components/ui/skeleton';
// // // // // import { Alert, AlertDescription } from '@/components/ui/alert';
// // // // // import { Button } from '@/components/ui/button';
// // // // // import { Link } from 'react-router-dom';
// // // // // import { ScheduleOverview } from '@/components/owner/ScheduleOverview';

export function OwnerHours() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('schedule');

  // Fetch barbershop data
  const {
    data: barbershop,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['owner-barbershop', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID');
      const _shops = await barbershopService.getByOwner(user.id);
      return shops[0]; // For now, assume one barbershop per owner
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !barbershop) {
    return (
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link to="/owner">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al panel
          </Link>
        </Button>

        <Alert variant="destructive">
          <AlertDescription>
            No se pudo cargar la información de la barbería. Por favor, intenta
            nuevamente.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link to="/owner">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Clock className="h-8 w-8" />
              Gestión de Horarios
            </h1>
            <p className="text-muted-foreground">
              Configura los horarios de atención, feriados y capacidad de tu
              barbería
            </p>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Centro de Control de Horarios
          </CardTitle>
          <CardDescription className="text-blue-900">
            Desde aquí puedes gestionar todos los aspectos relacionados con los
            horarios de tu barbería: horarios de atención, días feriados,
            capacidad máxima y monitoreo en tiempo real.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Main Content with Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Horarios</span>
          </TabsTrigger>
          <TabsTrigger value="holidays" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Feriados</span>
          </TabsTrigger>
          <TabsTrigger value="capacity" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Capacidad</span>
          </TabsTrigger>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Vista General</span>
          </TabsTrigger>
        </TabsList>

        {/* Schedule Configuration Tab */}
        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Horarios de Atención</CardTitle>
              <CardDescription>
                Define los horarios de apertura y cierre de tu barbería para
                cada día de la semana. También puedes configurar horarios de
                descanso o almuerzo.
              </CardDescription>
            </CardHeader>
          </Card>
          <BarbershopScheduleConfig barbershopId={barbershop.id} />
        </TabsContent>

        {/* Holidays Tab */}
        <TabsContent value="holidays" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Feriados</CardTitle>
              <CardDescription>
                Administra los días feriados nacionales y fechas especiales de
                tu barbería. Puedes importar feriados argentinos automáticamente
                o crear fechas personalizadas.
              </CardDescription>
            </CardHeader>
          </Card>
          <HolidayCalendar barbershopId={barbershop.id} />
        </TabsContent>

        {/* Capacity Management Tab */}
        <TabsContent value="capacity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Capacidad</CardTitle>
              <CardDescription>
                Configura la capacidad máxima de citas concurrentes y define
                multiplicadores para horarios pico. Monitorea la disponibilidad
                en tiempo real.
              </CardDescription>
            </CardHeader>
          </Card>
          <CapacityManagement barbershopId={barbershop.id} />
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <ScheduleOverview barbershopId={barbershop.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
