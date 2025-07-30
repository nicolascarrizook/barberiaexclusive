import {useEffect} from 'react';
// // // // // import { useQuery } from '@tanstack/react-query';
// // // // // import { useAuth } from '@/hooks/useAuth';
// // // // // import { barbershopService } from '@/services/barbershops.service';
// // // // // import { BarbershopScheduleConfig } from '@/components/owner/BarbershopScheduleConfig';
// // // // // import { Card, CardContent } from '@/components/ui/card';
// // // // // import { Skeleton } from '@/components/ui/skeleton';
// // // // // import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
// // // // // import { Button } from '@/components/ui/button';
// // // // // import { ArrowLeft, Clock, Info } from 'lucide-react';
// // // // // import { Link } from 'react-router-dom';

export function BarbershopHours() {
  const { user } = useAuth();
  const [barbershopId, setBarbershopId] = useState<string | null>(null);

  // Obtener la barbería del propietario
  const {
    data: barbershops,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['owner-barbershops', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID');
      return barbershopService.getByOwner(user.id);
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (barbershops && barbershops.length > 0) {
      setBarbershopId(barbershops[0].id);
    }
  }, [barbershops]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !barbershops || barbershops.length === 0) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link to="/owner">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al dashboard
          </Link>
        </Button>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>No se encontró barbería</AlertTitle>
          <AlertDescription>
            Primero debes crear una barbería para poder configurar los horarios.
          </AlertDescription>
        </Alert>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-center mb-4">
              Configura los horarios de tu barbería
            </p>
            <Button asChild>
              <Link to="/owner/barbershop/new">Crear barbería</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/owner">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Horarios de Atención</h1>
            <p className="text-muted-foreground">
              Configura los horarios de apertura y cierre de tu barbería
            </p>
          </div>
        </div>
      </div>

      {/* Información sobre horarios */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Información importante</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>
            Los horarios que configures aquí definen cuándo tu barbería está
            abierta para recibir clientes.
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Los barberos solo podrán trabajar dentro de estos horarios</li>
            <li>
              Los clientes solo podrán reservar citas en los horarios definidos
            </li>
            <li>
              Puedes configurar horarios de descanso (almuerzo) para cada día
            </li>
            <li>
              Los días festivos configurados previamente anularán estos horarios
            </li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Componente de configuración de horarios */}
      {barbershopId && <BarbershopScheduleConfig barbershopId={barbershopId} />}

      {/* Información adicional */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-medium mb-2">Próximos pasos</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary font-medium">1.</span>
              <span>
                Después de configurar los horarios de tu barbería, cada barbero
                podrá establecer su propio horario personal dentro de estos
                límites.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-medium">2.</span>
              <span>
                Los horarios especiales para días festivos se configuran en la
                sección de "Configuración" y tienen prioridad sobre estos
                horarios regulares.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-medium">3.</span>
              <span>
                Puedes ajustar la capacidad máxima de citas concurrentes según
                el tamaño de tu equipo y espacio disponible.
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
