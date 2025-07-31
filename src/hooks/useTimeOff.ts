import { useState, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { timeOffService, TimeOffWithBarber, TimeOffRequest, TimeOffFilters } from '@/services/time-off.service'
import { appointmentsService } from '@/services/appointments.service'
import { format, differenceInDays, isWeekend, eachDayOfInterval } from 'date-fns'
import { es } from 'date-fns/locale'

interface UseTimeOffReturn {
  // Estados
  loading: boolean;
  submitting: boolean;
  requests: TimeOffWithBarber[];

  // Métodos para solicitudes
  requestTimeOff: (request: TimeOffRequest) => Promise<void>;
  getRequests: (filters?: TimeOffFilters) => Promise<void>;
  cancelRequest: (requestId: string) => Promise<void>;

  // Métodos para aprobación
  approveRequest: (requestId: string, notes?: string) => Promise<void>;
  rejectRequest: (requestId: string, reason: string) => Promise<void>;

  // Utilidades
  checkConflicts: (
    barberId: string,
    startDate: string,
    endDate: string
  ) => Promise<boolean>;
  getAffectedAppointments: (
    barberId: string,
    startDate: string,
    endDate: string
  ) => Promise<number>;
  calculateWorkingDays: (startDate: Date, endDate: Date) => number;
}

export function useTimeOff(): UseTimeOffReturn {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState<TimeOffWithBarber[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  // Solicitar vacaciones
  const requestTimeOff = useCallback(
    async (request: TimeOffRequest) => {
      setSubmitting(true);
      try {
        await timeOffService.requestTimeOff(request);
        toast({
          title: 'Solicitud enviada',
          description:
            'Tu solicitud de vacaciones ha sido enviada para aprobación.',
        });
      } catch (error) {
        toast({
          title: 'Error',
          description:
            error instanceof Error
              ? error.message
              : 'No se pudo enviar la solicitud',
          variant: 'destructive',
        });
        throw error;
      } finally {
        setSubmitting(false);
      }
    },
    [toast]
  );

  // Obtener solicitudes
  const getRequests = useCallback(
    async (filters?: TimeOffFilters) => {
      setLoading(true);
      try {
        const data = await timeOffService.getTimeOffRequests(filters);
        setRequests(data);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'No se pudieron cargar las solicitudes',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  // Cancelar solicitud
  const cancelRequest = useCallback(
    async (requestId: string) => {
      if (!user?.id) {
        toast({
          title: 'Error',
          description: 'Usuario no autenticado',
          variant: 'destructive',
        });
        return;
      }

      setSubmitting(true);
      try {
        await timeOffService.cancelTimeOff(requestId, user.id);
        toast({
          title: 'Solicitud cancelada',
          description: 'La solicitud de vacaciones ha sido cancelada.',
        });
      } catch (error) {
        toast({
          title: 'Error',
          description:
            error instanceof Error
              ? error.message
              : 'No se pudo cancelar la solicitud',
          variant: 'destructive',
        });
      } finally {
        setSubmitting(false);
      }
    },
    [toast, user?.id]
  );

  // Aprobar solicitud
  const approveRequest = useCallback(
    async (requestId: string, notes?: string) => {
      if (!user?.id) {
        toast({
          title: 'Error',
          description: 'Usuario no autenticado',
          variant: 'destructive',
        });
        return;
      }

      setSubmitting(true);
      try {
        await timeOffService.approveTimeOff(requestId, user.id, notes);
        toast({
          title: 'Solicitud aprobada',
          description: 'La solicitud de vacaciones ha sido aprobada.',
        });
      } catch (error) {
        toast({
          title: 'Error',
          description:
            error instanceof Error
              ? error.message
              : 'No se pudo aprobar la solicitud',
          variant: 'destructive',
        });
      } finally {
        setSubmitting(false);
      }
    },
    [toast, user?.id]
  );

  // Rechazar solicitud
  const rejectRequest = useCallback(
    async (requestId: string, reason: string) => {
      if (!user?.id) {
        toast({
          title: 'Error',
          description: 'Usuario no autenticado',
          variant: 'destructive',
        });
        return;
      }

      setSubmitting(true);
      try {
        await timeOffService.rejectTimeOff(requestId, user.id, reason);
        toast({
          title: 'Solicitud rechazada',
          description: 'La solicitud de vacaciones ha sido rechazada.',
        });
      } catch (error) {
        toast({
          title: 'Error',
          description:
            error instanceof Error
              ? error.message
              : 'No se pudo rechazar la solicitud',
          variant: 'destructive',
        });
      } finally {
        setSubmitting(false);
      }
    },
    [toast, user?.id]
  );

  // Verificar conflictos
  const checkConflicts = useCallback(
    async (barberId: string, startDate: string, endDate: string) => {
      try {
        return await timeOffService.checkTimeOffConflict(
          barberId,
          startDate,
          endDate
        );
      } catch (error) {
        console.error('Error checking conflicts:', error);
        return false;
      }
    },
    []
  );

  // Obtener citas afectadas
  const getAffectedAppointments = useCallback(
    async (barberId: string, startDate: string, endDate: string) => {
      try {
        // Por ahora retornamos 0, pero esto podría implementarse con una consulta específica
        // TODO: Implementar método en appointmentsService para obtener citas por barbero y rango de fechas
        return 0;
      } catch (error) {
        console.error('Error getting affected appointments:', error);
        return 0;
      }
    },
    []
  );

  // Calcular días laborables
  const calculateWorkingDays = useCallback(
    (startDate: Date, endDate: Date) => {
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      return days.filter((day) => !isWeekend(day)).length;
    },
    []
  );

  return {
    loading,
    submitting,
    requests,
    requestTimeOff,
    getRequests,
    cancelRequest,
    approveRequest,
    rejectRequest,
    checkConflicts,
    getAffectedAppointments,
    calculateWorkingDays,
  };
}
