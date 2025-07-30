import {useEffect} from 'react';
// // // // // import { useForm, Controller } from 'react-hook-form';
// // // // // import { zodResolver } from '@hookform/resolvers/zod';
// // // // // import { z } from 'zod';
// // // // // import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
// // // // // import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
// // // // // import { Button } from '@/components/ui/button';
// // // // // import { Input } from '@/components/ui/input';
// // // // // import { Label } from '@/components/ui/label';
// // // // // import { Switch } from '@/components/ui/switch';
// // // // // import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
// // // // // import { useToast } from '@/hooks/use-toast';
// // // // // import { barbershopHoursService, BarberWeekSchedule } from '@/services/barbershop-hours.service';
// // // // // import { barberSchedulesService, WeeklySchedule, DaySchedule } from '@/services/barber-schedules.service';
// // // // // import { 
  Save, 
  Loader2, 
  Copy, 
  Clock, 
  Calendar,
  AlertCircle,
  Check,
  Coffee
} from 'lucide-react';
// // // // // import { Alert, AlertDescription } from '@/components/ui/alert';
// // // // // import { Separator } from '@/components/ui/separator';
// // // // // import { DayOfWeek } from '@/types/database';
// // // // // import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Schema de validación para horarios de barbero
const _barberScheduleSchema = z.object({
  monday: z.object({
    is_closed: z.boolean(),
    open_time: z.string().optional(),
    close_time: z.string().optional(),
    break_start: z.string().optional(),
    break_end: z.string().optional(),
  }),
  tuesday: z.object({
    is_closed: z.boolean(),
    open_time: z.string().optional(),
    close_time: z.string().optional(),
    break_start: z.string().optional(),
    break_end: z.string().optional(),
  }),
  wednesday: z.object({
    is_closed: z.boolean(),
    open_time: z.string().optional(),
    close_time: z.string().optional(),
    break_start: z.string().optional(),
    break_end: z.string().optional(),
  }),
  thursday: z.object({
    is_closed: z.boolean(),
    open_time: z.string().optional(),
    close_time: z.string().optional(),
    break_start: z.string().optional(),
    break_end: z.string().optional(),
  }),
  friday: z.object({
    is_closed: z.boolean(),
    open_time: z.string().optional(),
    close_time: z.string().optional(),
    break_start: z.string().optional(),
    break_end: z.string().optional(),
  }),
  saturday: z.object({
    is_closed: z.boolean(),
    open_time: z.string().optional(),
    close_time: z.string().optional(),
    break_start: z.string().optional(),
    break_end: z.string().optional(),
  }),
  sunday: z.object({
    is_closed: z.boolean(),
    open_time: z.string().optional(),
    close_time: z.string().optional(),
    break_start: z.string().optional(),
    break_end: z.string().optional(),
  }),
});

type BarberScheduleFormData = z.infer<typeof barberScheduleSchema>;

interface BarberWorkingHoursProps {
  barberId: string;
  barbershopId: string;
  isOwnerView?: boolean;
}

// Mapeo de días en español
const dayLabels: Record<DayOfWeek, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

// Orden de los días
const daysOrder: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export function BarberWorkingHours({ barberId, barbershopId, isOwnerView = false }: BarberWorkingHoursProps) {
  const { toast } = useToast();
  const _queryClient = useQueryClient();
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCopyDialog, setShowCopyDialog] = useState(false);

  // Helper function to get day name from numeric day_of_week
  const _getDayNameFromNumber = (dayNumber: number | string): DayOfWeek | null => {
    // Handle both numeric and string day_of_week values
    const _numericDay = typeof dayNumber === 'string' ? parseInt(dayNumber) : dayNumber;
    
    const dayMap: Record<number, DayOfWeek> = {
      1: 'monday',
      2: 'tuesday',
      3: 'wednesday',
      4: 'thursday',
      5: 'friday',
      6: 'saturday',
      0: 'sunday', // Sunday is 0 in JavaScript Date
    };
    
    // Also handle string day names in case they come from the database
    if (typeof dayNumber === 'string' && isNaN(numericDay)) {
      return dayNumber.toLowerCase() as DayOfWeek;
    }
    
    return dayMap[numericDay] || null;
  };

  // Helper function to get numeric day from day name
  const _getDayNumberFromName = (dayName: DayOfWeek): number => {
    const dayMap: Record<DayOfWeek, number> = {
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
      sunday: 0,
    };
    return dayMap[dayName];
  };

  // Helper function to convert time to minutes
  const _timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Fetch barbershop schedule as reference
  const { data: barbershopSchedule, isLoading: isLoadingBarbershop } = useQuery({
    queryKey: ['barbershop-schedule', barbershopId],
    queryFn: () => barbershopHoursService.getBarbershopSchedule(barbershopId),
  });

  // Fetch barber-specific schedule
  const { data: barberSchedule, isLoading: isLoadingBarber, refetch: refetchBarberSchedule } = useQuery({
    queryKey: ['barber-schedule', barberId],
    queryFn: () => barberSchedulesService.getWeeklySchedule(barberId),
  });

  const _form = useForm<BarberScheduleFormData>({
    resolver: zodResolver(barberScheduleSchema),
    defaultValues: {
      monday: { is_closed: false, open_time: '09:00', close_time: '18:00', break_start: '13:00', break_end: '14:00' },
      tuesday: { is_closed: false, open_time: '09:00', close_time: '18:00', break_start: '13:00', break_end: '14:00' },
      wednesday: { is_closed: false, open_time: '09:00', close_time: '18:00', break_start: '13:00', break_end: '14:00' },
      thursday: { is_closed: false, open_time: '09:00', close_time: '18:00', break_start: '13:00', break_end: '14:00' },
      friday: { is_closed: false, open_time: '09:00', close_time: '18:00', break_start: '13:00', break_end: '14:00' },
      saturday: { is_closed: false, open_time: '10:00', close_time: '16:00' },
      sunday: { is_closed: true },
    },
  });

  // Actualizar formulario cuando se cargan los datos
  useEffect(() => {
    if (barberSchedule) {
      // Transform barber schedule data to form format
      const formData: any = {};
      
      // Initialize all days with default values
      daysOrder.forEach(day => {
        formData[day] = { 
          is_closed: true,
          open_time: '09:00',
          close_time: '18:00',
          break_start: '',
          break_end: ''
        };
      });
      
      // If we have schedule data, map it to the form
      if (barberSchedule.length > 0) {
        barberSchedule.forEach((daySchedule) => {
          const _dayName = getDayNameFromNumber(daySchedule.day_of_week);
          if (dayName) {
            formData[dayName] = {
              is_closed: !daySchedule.is_working,
              open_time: daySchedule.start_time || '09:00',
              close_time: daySchedule.end_time || '18:00',
              break_start: daySchedule.break_start || '',
              break_end: daySchedule.break_end || '',
            };
          }
        });
      }
      
      form.reset(formData);
    }
  }, [barberSchedule, form]);

  // Create copy barbershop hours mutation
  const _copyBarbershopHoursMutation = useMutation({
    mutationFn: async () => {
      return await barberSchedulesService.copyBarbershopHours(barberId);
    },
    onSuccess: async () => {
      // Invalidate and refetch barber schedule
      await queryClient.invalidateQueries({ queryKey: ['barber-schedule', barberId] });
      
      // Explicitly refetch to ensure UI updates
      await refetchBarberSchedule();
      
      setShowCopyDialog(false);
      toast({
        title: 'Horarios copiados',
        description: 'Se han copiado los horarios de la barbería y guardado exitosamente.',
      });
    },
    onError: (error: Error) => {
      console.error('Error copying barbershop hours:', error);
      toast({
        title: 'Error al copiar horarios',
        description: error.message || 'No se pudieron copiar los horarios de la barbería',
        variant: 'destructive',
      });
    },
  });

  // Copy barbershop hours to barber schedule
  const _handleCopyBarbershopHours = async () => {
    if (!barbershopSchedule) return;

    try {
      await copyBarbershopHoursMutation.mutateAsync();
    } catch (error) {
      // Error is handled by mutation onError
    }
  };

  // Validar horarios contra los de la barbería usando el servicio
  const _validateAgainstBarbershop = async (data: BarberScheduleFormData): Promise<boolean> => {
    if (!barbershopSchedule) return true;

    // Transform form data to service format for validation
    const _scheduleData = transformFormDataToSchedule(data);
    
    try {
      // Validate each day using the service
      for (const daySchedule of scheduleData) {
        const _validationResult = await barberSchedulesService.validateScheduleAgainstBarbershop(
          barberId, 
          daySchedule
        );
        
        if (!validationResult.isValid) {
          const _dayName = getDayNameFromNumber(daySchedule.day_of_week);
          toast({
            title: 'Error de validación',
            description: `${dayLabels[dayName!]}: ${validationResult.errors.join(', ')}`,
            variant: 'destructive',
          });
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error validating schedule:', error);
      toast({
        title: 'Error de validación',
        description: 'No se pudo validar el horario. Inténtalo de nuevo.',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Create save mutation
  const _saveMutation = useMutation({
    mutationFn: async (scheduleData: WeeklySchedule) => {
      return await barberSchedulesService.updateWeeklySchedule(scheduleData);
    },
    onSuccess: () => {
      // Invalidate and refetch barber schedule
      queryClient.invalidateQueries({ queryKey: ['barber-schedule', barberId] });
      queryClient.invalidateQueries({ queryKey: ['barber-availability', barberId] });
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
      toast({
        title: 'Horarios actualizados',
        description: 'Tus horarios de trabajo se han guardado exitosamente',
      });
    },
    onError: (error: Error) => {
      console.error('Error saving barber schedule:', error);
      toast({
        title: 'Error al guardar',
        description: error.message || 'No se pudieron actualizar los horarios',
        variant: 'destructive',
      });
    },
  });

  const _onSubmit = async (data: BarberScheduleFormData) => {
    const _isValid = await validateAgainstBarbershop(data);
    if (!isValid) {
      return;
    }

    try {
      // Transform form data to service format
      const weeklySchedule: WeeklySchedule = {
        barber_id: barberId,
        schedule: transformFormDataToSchedule(data),
      };

      await saveMutation.mutateAsync(weeklySchedule);
    } catch (error) {
      // Error is handled by mutation onError
    }
  };

  const _isLoading = isLoadingBarbershop || isLoadingBarber;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Transform form data to service schedule format
  const _transformFormDataToSchedule = (formData: BarberScheduleFormData): DaySchedule[] => {
    return daysOrder.map((day) => {
      const _dayData = formData[day];
      return {
        day_of_week: getDayNumberFromName(day),
        is_working: !dayData.is_closed,
        start_time: dayData.is_closed ? null : (dayData.open_time || null),
        end_time: dayData.is_closed ? null : (dayData.close_time || null),
        break_start: dayData.is_closed || !dayData.break_start ? null : dayData.break_start,
        break_end: dayData.is_closed || !dayData.break_end ? null : dayData.break_end,
      };
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Mi Horario de Trabajo
              </CardTitle>
              <CardDescription>
                Define tu horario personal de trabajo y descansos diarios
              </CardDescription>
            </div>
            {showSuccess && (
              <div className="flex items-center gap-2 text-green-600">
                <Check className="h-5 w-5" />
                <span className="text-sm font-medium">Guardado</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Botón para copiar horarios de la barbería */}
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCopyDialog(true)}
                  className="flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copiar horarios de la barbería
                </Button>
              </div>

              {/* Info Alert */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Tu horario debe estar dentro del horario de apertura de la barbería. 
                  Los descansos programados aquí se aplicarán todos los días de la semana.
                </AlertDescription>
              </Alert>

              <Separator />

              {/* Grid de días */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium">Horario semanal</h3>
                </div>

                <div className="space-y-4">
                  {daysOrder.map((day) => {
                    const _barbershopDay = barbershopSchedule?.find(d => d.day_of_week === day);
                    const _isBarbershopClosed = barbershopDay?.is_closed ?? false;

                    return (
                      <div key={day} className="rounded-lg border p-4">
                        <div className="grid gap-4 md:grid-cols-5 items-start">
                          {/* Día y switch */}
                          <div className="md:col-span-1">
                            <div className="flex items-center justify-between md:flex-col md:items-start md:gap-2">
                              <Label className="text-base font-medium">
                                {dayLabels[day]}
                              </Label>
                              <FormField
                                control={form.control}
                                name={`${day}.is_closed` as any}
                                render={({ field }) => (
                                  <FormItem className="flex items-center gap-2">
                                    <FormControl>
                                      <Switch
                                        checked={!field.value}
                                        onCheckedChange={(checked) => field.onChange(!checked)}
                                        disabled={isBarbershopClosed}
                                      />
                                    </FormControl>
                                    <FormLabel className="text-sm font-normal cursor-pointer">
                                      {field.value ? 'No trabajo' : 'Trabajo'}
                                    </FormLabel>
                                  </FormItem>
                                )}
                              />
                              {isBarbershopClosed && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Barbería cerrada
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Horarios */}
                          <div className="md:col-span-4">
                            <Controller
                              control={form.control}
                              name={`${day}.is_closed` as any}
                              render={({ field: closedField }) => (
                                <div className={`grid gap-4 md:grid-cols-2 ${closedField.value || isBarbershopClosed ? 'opacity-50' : ''}`}>
                                  {/* Horario de trabajo */}
                                  <div className="space-y-2">
                                    <Label className="text-xs font-medium flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      Horario de trabajo
                                    </Label>
                                    <div className="flex gap-2 items-center">
                                      <FormField
                                        control={form.control}
                                        name={`${day}.open_time` as any}
                                        render={({ field }) => (
                                          <FormItem className="flex-1">
                                            <FormControl>
                                              <Input
                                                type="time"
                                                {...field}
                                                disabled={closedField.value || isBarbershopClosed}
                                              />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                      <span>-</span>
                                      <FormField
                                        control={form.control}
                                        name={`${day}.close_time` as any}
                                        render={({ field }) => (
                                          <FormItem className="flex-1">
                                            <FormControl>
                                              <Input
                                                type="time"
                                                {...field}
                                                disabled={closedField.value || isBarbershopClosed}
                                              />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                    </div>
                                    {barbershopDay && !barbershopDay.is_closed && (
                                      <p className="text-xs text-muted-foreground">
                                        Barbería: {barbershopDay.open_time} - {barbershopDay.close_time}
                                      </p>
                                    )}
                                  </div>

                                  {/* Horario de descanso */}
                                  <div className="space-y-2">
                                    <Label className="text-xs font-medium flex items-center gap-1">
                                      <Coffee className="h-3 w-3" />
                                      Descanso/Almuerzo
                                    </Label>
                                    <div className="flex gap-2 items-center">
                                      <FormField
                                        control={form.control}
                                        name={`${day}.break_start` as any}
                                        render={({ field }) => (
                                          <FormItem className="flex-1">
                                            <FormControl>
                                              <Input
                                                type="time"
                                                {...field}
                                                disabled={closedField.value || isBarbershopClosed}
                                                placeholder="--:--"
                                              />
                                            </FormControl>
                                          </FormItem>
                                        )}
                                      />
                                      <span>-</span>
                                      <FormField
                                        control={form.control}
                                        name={`${day}.break_end` as any}
                                        render={({ field }) => (
                                          <FormItem className="flex-1">
                                            <FormControl>
                                              <Input
                                                type="time"
                                                {...field}
                                                disabled={closedField.value || isBarbershopClosed}
                                                placeholder="--:--"
                                              />
                                            </FormControl>
                                          </FormItem>
                                        )}
                                      />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      Opcional: deja vacío si no tomas descanso
                                    </p>
                                  </div>
                                </div>
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex justify-end gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={saveMutation.isPending || form.formState.isSubmitting}
                >
                  {(saveMutation.isPending || form.formState.isSubmitting) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  <Save className="mr-2 h-4 w-4" />
                  {saveMutation.isPending ? 'Guardando...' : 'Guardar horarios'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Dialog para copiar horarios */}
      <Dialog open={showCopyDialog} onOpenChange={setShowCopyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copiar horarios de la barbería</DialogTitle>
            <DialogDescription>
              ¿Deseas usar los horarios de la barbería como base para tu horario personal?
              Podrás ajustarlos después según tus necesidades.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {barbershopSchedule && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Horarios actuales de la barbería:</h4>
                <div className="space-y-1">
                  {daysOrder.map(day => {
                    const _schedule = barbershopSchedule.find(s => s.day_of_week === day);
                    if (!schedule) return null;
                    
                    return (
                      <div key={day} className="text-sm text-muted-foreground">
                        <span className="font-medium">{dayLabels[day]}:</span>{' '}
                        {schedule.is_closed ? 'Cerrado' : `${schedule.open_time} - ${schedule.close_time}`}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCopyDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCopyBarbershopHours}
              disabled={copyBarbershopHoursMutation.isPending}
            >
              {copyBarbershopHoursMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {!copyBarbershopHoursMutation.isPending && (
                <Copy className="mr-2 h-4 w-4" />
              )}
              {copyBarbershopHoursMutation.isPending ? 'Copiando...' : 'Copiar horarios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}