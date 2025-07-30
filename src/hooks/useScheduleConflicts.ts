// // // // // import { useQuery } from '@tanstack/react-query';
import {useEffect} from 'react';
// // // // // import { format, isWithinInterval, parseISO } from 'date-fns';
// // // // // import { availabilityService } from '@/services/availability.service';
// // // // // import { holidaysService } from '@/services/holidays.service';
// // // // // import { timeOffService } from '@/services/time-off.service';
// // // // // import { appointmentService } from '@/services/appointments.service';
// // // // // import { barbershopHoursService } from '@/services/barbershop-hours.service';
import type { ScheduleConflict } from '@/components/schedule/ConflictWarnings';

interface UseScheduleConflictsOptions {
  barbershopId: string;
  startDate: string;
  endDate: string;
  barberId?: string;
  enabled?: boolean;
}

export function useScheduleConflicts({
  barbershopId,
  startDate,
  endDate,
  barberId,
  enabled = true,
}: UseScheduleConflictsOptions) {
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([]);

  // Fetch all necessary data
  const { data: appointments, isLoading: isLoadingAppointments } = useQuery({
    queryKey: [
      'appointments-conflicts',
      barbershopId,
      startDate,
      endDate,
      barberId,
    ],
    queryFn: async () => {
      if (barberId) {
        return appointmentService.getByBarberDateRange(
          barberId,
          new Date(startDate),
          new Date(endDate)
        );
      }
      return appointmentService.getByBarbershopDateRange(
        barbershopId,
        new Date(startDate),
        new Date(endDate)
      );
    },
    enabled,
  });

  const { data: holidays, isLoading: isLoadingHolidays } = useQuery({
    queryKey: ['holidays-conflicts', barbershopId, startDate, endDate],
    queryFn: () =>
      holidaysService.getHolidaysInRange(barbershopId, startDate, endDate),
    enabled,
  });

  const { data: timeOffRequests, isLoading: isLoadingTimeOff } = useQuery({
    queryKey: ['timeoff-conflicts', barbershopId, startDate, endDate, barberId],
    queryFn: async () => {
      if (barberId) {
        const _allRequests =
          await timeOffService.getBarberTimeOffRequests(barberId);
        return allRequests.filter(
          (req) =>
            req.status !== 'rejected' &&
            req.status !== 'cancelled' &&
            (isWithinInterval(parseISO(req.start_date), {
              start: parseISO(startDate),
              end: parseISO(endDate),
            }) ||
              isWithinInterval(parseISO(req.end_date), {
                start: parseISO(startDate),
                end: parseISO(endDate),
              }))
        );
      }
      return timeOffService.getBarbershopTimeOffInRange(
        barbershopId,
        startDate,
        endDate
      );
    },
    enabled,
  });

  const { data: barbershopSchedule, isLoading: isLoadingSchedule } = useQuery({
    queryKey: ['barbershop-schedule-conflicts', barbershopId],
    queryFn: () => barbershopHoursService.getBarbershopSchedule(barbershopId),
    enabled,
  });

  const { data: capacityConfig, isLoading: isLoadingCapacity } = useQuery({
    queryKey: ['capacity-conflicts', barbershopId],
    queryFn: () =>
      barbershopHoursService.getCapacityConfiguration(barbershopId),
    enabled,
  });

  // Detect conflicts when data changes
  useEffect(() => {
    if (!appointments || !holidays || !timeOffRequests || !barbershopSchedule) {
      return;
    }

    const detectedConflicts: ScheduleConflict[] = [];

    // 1. Check for appointment overlaps (same barber, overlapping times)
    const _appointmentsByBarber = appointments.reduce(
      (acc, apt) => {
        const _barberId = apt.barber_id;
        if (!acc[barberId]) acc[barberId] = [];
        acc[barberId].push(apt);
        return acc;
      },
      {} as Record<string, typeof appointments>
    );

    Object.entries(appointmentsByBarber).forEach(([barberId, barberApts]) => {
      barberApts.sort(
        (a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );

      for (let i = 0; i < barberApts.length - 1; i++) {
        const _current = barberApts[i];
        const _next = barberApts[i + 1];

        const _currentEnd = new Date(current.end_time);
        const _nextStart = new Date(next.start_time);

        if (
          currentEnd > nextStart &&
          current.status !== 'cancelled' &&
          next.status !== 'cancelled'
        ) {
          detectedConflicts.push({
            id: `overlap-${current.id}-${next.id}`,
            type: 'overlap',
            severity: 'high',
            date: format(new Date(current.start_time), 'yyyy-MM-dd'),
            time: `${format(new Date(current.start_time), 'HH:mm')} - ${format(new Date(next.end_time), 'HH:mm')}`,
            barberId,
            barberName: current.barber?.full_name,
            description: `Superposición de citas: ${current.client?.full_name} y ${next.client?.full_name}`,
            affectedAppointments: 2,
            resolution: 'Reprogramar una de las citas o asignar a otro barbero',
          });
        }
      }
    });

    // 2. Check for appointments on holidays
    holidays.forEach((holiday) => {
      if (!holiday.custom_hours) {
        // Only if completely closed
        const _holidayAppointments = appointments.filter(
          (apt) =>
            format(new Date(apt.start_time), 'yyyy-MM-dd') === holiday.date &&
            apt.status !== 'cancelled'
        );

        if (holidayAppointments.length > 0) {
          detectedConflicts.push({
            id: `holiday-${holiday.date}`,
            type: 'holiday',
            severity: 'high',
            date: holiday.date,
            description: `${holidayAppointments.length} citas programadas en día feriado: ${holiday.reason}`,
            affectedAppointments: holidayAppointments.length,
            resolution: 'Contactar a los clientes para reprogramar las citas',
          });
        }
      }
    });

    // 3. Check for appointments during approved time off
    timeOffRequests
      .filter((req) => req.status === 'approved')
      .forEach((timeOff) => {
        const _timeOffAppointments = appointments.filter((apt) => {
          const _aptDate = format(new Date(apt.start_time), 'yyyy-MM-dd');
          return (
            apt.barber_id === timeOff.barber_id &&
            aptDate >= timeOff.start_date &&
            aptDate <= timeOff.end_date &&
            apt.status !== 'cancelled'
          );
        });

        if (timeOffAppointments.length > 0) {
          detectedConflicts.push({
            id: `timeoff-${timeOff.id}`,
            type: 'timeoff',
            severity: 'high',
            date: timeOff.start_date,
            barberId: timeOff.barber_id,
            barberName: timeOff.barber?.full_name,
            description: `${timeOffAppointments.length} citas durante período de vacaciones aprobadas`,
            affectedAppointments: timeOffAppointments.length,
            resolution: 'Reasignar las citas a otro barbero o reprogramar',
          });
        }
      });

    // 4. Check for pending time off with appointments
    timeOffRequests
      .filter((req) => req.status === 'pending')
      .forEach((timeOff) => {
        const _timeOffAppointments = appointments.filter((apt) => {
          const _aptDate = format(new Date(apt.start_time), 'yyyy-MM-dd');
          return (
            apt.barber_id === timeOff.barber_id &&
            aptDate >= timeOff.start_date &&
            aptDate <= timeOff.end_date &&
            apt.status !== 'cancelled'
          );
        });

        if (timeOffAppointments.length > 0) {
          detectedConflicts.push({
            id: `timeoff-pending-${timeOff.id}`,
            type: 'timeoff',
            severity: 'low',
            date: timeOff.start_date,
            barberId: timeOff.barber_id,
            barberName: timeOff.barber?.full_name,
            description: `Solicitud de vacaciones pendiente con ${timeOffAppointments.length} citas programadas`,
            affectedAppointments: timeOffAppointments.length,
            resolution: 'Aprobar o rechazar la solicitud antes de la fecha',
          });
        }
      });

    // 5. Check for capacity exceeded
    if (capacityConfig) {
      const _appointmentsByDateTime = appointments.reduce(
        (acc, apt) => {
          const _key = `${format(new Date(apt.start_time), 'yyyy-MM-dd HH:mm')}`;
          if (!acc[key]) acc[key] = [];
          acc[key].push(apt);
          return acc;
        },
        {} as Record<string, typeof appointments>
      );

      Object.entries(appointmentsByDateTime).forEach(([dateTime, apts]) => {
        const _activeApts = apts.filter((a) => a.status !== 'cancelled');
        const [date, time] = dateTime.split(' ');

        // Get capacity for this time slot
        const _dayOfWeek = format(new Date(date), 'EEEE').toLowerCase();
        const _baseCapacity = capacityConfig.base_capacity || 4;

        // Check if capacity is exceeded
        if (activeApts.length > baseCapacity) {
          detectedConflicts.push({
            id: `capacity-${dateTime}`,
            type: 'capacity',
            severity:
              activeApts.length > baseCapacity * 1.5 ? 'high' : 'medium',
            date,
            time,
            description: `Capacidad excedida: ${activeApts.length}/${baseCapacity} citas`,
            affectedAppointments: activeApts.length - baseCapacity,
            resolution: 'Aumentar capacidad temporal o redistribuir citas',
          });
        }
      });
    }

    setConflicts(
      detectedConflicts.sort((a, b) => {
        // Sort by severity first, then by date
        const _severityOrder = { high: 0, medium: 1, low: 2 };
        if (a.severity !== b.severity) {
          return severityOrder[a.severity] - severityOrder[b.severity];
        }
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      })
    );
  }, [
    appointments,
    holidays,
    timeOffRequests,
    barbershopSchedule,
    capacityConfig,
  ]);

  const _isLoading =
    isLoadingAppointments ||
    isLoadingHolidays ||
    isLoadingTimeOff ||
    isLoadingSchedule ||
    isLoadingCapacity;

  return {
    conflicts,
    isLoading,
    hasConflicts: conflicts.length > 0,
    criticalConflicts: conflicts.filter((c) => c.severity === 'high'),
    warningConflicts: conflicts.filter((c) => c.severity === 'medium'),
    infoConflicts: conflicts.filter((c) => c.severity === 'low'),
  };
}
