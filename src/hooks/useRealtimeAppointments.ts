import { useEffect, useCallback } from 'react';
import { realtimeService, AppointmentChangeEvent } from '@/services/realtime.service';
import { useToast } from './use-toast';

interface UseRealtimeAppointmentsOptions {
  barbershopId?: string;
  barberId?: string;
  date?: string;
  onAppointmentChange?: (event: AppointmentChangeEvent) => void;
  showNotifications?: boolean;
}

export function useRealtimeAppointments({
  barbershopId,
  barberId,
  date,
  onAppointmentChange,
  showNotifications = true,
}: UseRealtimeAppointmentsOptions) {
  const { toast } = useToast();

  const handleAppointmentChange = useCallback((event: AppointmentChangeEvent) => {
    // Call custom handler if provided
    onAppointmentChange?.(event);

    // Show toast notifications if enabled
    if (showNotifications) {
      const appointment = event.new || event.old;
      
      if (event.eventType === 'INSERT') {
        toast({
          title: 'Nueva reserva',
          description: `Se ha creado una nueva reserva para las ${appointment?.start_time?.split('T')[1]?.substring(0, 5)}`,
        });
      } else if (event.eventType === 'UPDATE') {
        const oldStatus = event.old?.status;
        const newStatus = event.new?.status;
        
        if (oldStatus !== newStatus) {
          if (newStatus === 'cancelled') {
            toast({
              title: 'Reserva cancelada',
              description: `La reserva de las ${appointment?.start_time?.split('T')[1]?.substring(0, 5)} ha sido cancelada`,
              variant: 'destructive',
            });
          } else if (newStatus === 'confirmed') {
            toast({
              title: 'Reserva confirmada',
              description: `La reserva de las ${appointment?.start_time?.split('T')[1]?.substring(0, 5)} ha sido confirmada`,
            });
          }
        }
      } else if (event.eventType === 'DELETE') {
        toast({
          title: 'Reserva eliminada',
          description: 'Se ha eliminado una reserva',
          variant: 'destructive',
        });
      }
    }
  }, [onAppointmentChange, showNotifications, toast]);

  useEffect(() => {
    if (!barbershopId && !barberId) return;

    const unsubscribe = realtimeService.subscribeToAppointments(
      { barbershopId, barberId, date },
      {
        onChange: handleAppointmentChange,
        onStatusChange: (status) => {
          if (status === 'error' && showNotifications) {
            toast({
              title: 'Error de conexión',
              description: 'Se perdió la conexión en tiempo real. Intentando reconectar...',
              variant: 'destructive',
            });
          } else if (status === 'connected' && showNotifications) {
            console.log('Real-time connection established');
          }
        },
      }
    );

    return () => {
      unsubscribe();
    };
  }, [barbershopId, barberId, date, handleAppointmentChange, showNotifications, toast]);
}

export default useRealtimeAppointments;