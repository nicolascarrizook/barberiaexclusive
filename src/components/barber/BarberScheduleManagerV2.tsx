import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarberWorkSchedule } from './BarberWorkSchedule';
import { BarberScheduleManager } from './BarberScheduleManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Calendar, Coffee } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

interface BarberScheduleManagerV2Props {
  barberId: string;
  barbershopId: string;
  barberName?: string;
}

/**
 * Unified schedule management component that combines:
 * 1. Regular work schedule configuration
 * 2. Temporary breaks and time-off management
 */
export const BarberScheduleManagerV2: React.FC<
  BarberScheduleManagerV2Props
> = ({ barberId, barbershopId, barberName }) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Gestión de Horarios
          </CardTitle>
          <CardDescription>
            Administra tu horario de trabajo regular y descansos temporales
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Information Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Horario de Trabajo:</strong> Define tus horas laborales
          regulares y descansos diarios (como el almuerzo).
          <br />
          <strong>Descansos Temporales:</strong> Programa ausencias puntuales
          como citas médicas, permisos o vacaciones.
        </AlertDescription>
      </Alert>

      {/* Tabs */}
      <Tabs defaultValue="schedule" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Horario de Trabajo
          </TabsTrigger>
          <TabsTrigger value="breaks" className="flex items-center gap-2">
            <Coffee className="h-4 w-4" />
            Descansos Temporales
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-4">
          <BarberWorkSchedule
            barberId={barberId}
            barbershopId={barbershopId}
            barberName={barberName}
          />
        </TabsContent>

        <TabsContent value="breaks" className="space-y-4">
          <BarberScheduleManager
            barberId={barberId}
            barbershopId={barbershopId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
