import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarberWorkingHours } from '@/components/barber/BarberWorkingHours';
import { BarberScheduleManager } from '@/components/barber/BarberScheduleManager';
import { Clock, Calendar, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BarberScheduleDialogProps {
  barberId: string;
  barbershopId: string;
  barberName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function BarberScheduleDialog({
  barberId,
  barbershopId,
  barberName,
  isOpen,
  onClose,
}: BarberScheduleDialogProps) {
  const [activeTab, setActiveTab] = useState('schedule');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestión de Horarios - {barberName}</DialogTitle>
          <DialogDescription>
            Configura el horario de trabajo y los descansos del barbero
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="schedule" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Horario de Trabajo
            </TabsTrigger>
            <TabsTrigger value="breaks" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Descansos y Vacaciones
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="mt-6">
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Define el horario regular de trabajo del barbero. Este horario debe estar dentro de los 
                horarios de apertura de la barbería.
              </AlertDescription>
            </Alert>
            <BarberWorkingHours 
              barberId={barberId} 
              barbershopId={barbershopId}
              isOwnerView={true}
            />
          </TabsContent>

          <TabsContent value="breaks" className="mt-6">
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Programa descansos temporales, vacaciones y ausencias específicas del barbero.
              </AlertDescription>
            </Alert>
            <BarberScheduleManager 
              barberId={barberId} 
              barbershopId={barbershopId}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}