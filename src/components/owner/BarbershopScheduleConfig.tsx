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
// // // // // import { barbershopHoursService, WeekSchedule } from '@/services/barbershop-hours.service';
// // // // // import { barbershopService } from '@/services/barbershops.service';
// // // // // import { 
  Save, 
  Loader2, 
  RotateCcw, 
  Clock, 
  Calendar,
  AlertCircle,
  Check
} from 'lucide-react';
// // // // // import { Alert, AlertDescription } from '@/components/ui/alert';
// // // // // import { Separator } from '@/components/ui/separator';
// // // // // import { DayOfWeek } from '@/types/database';

// Esquema de validación para el formulario
const _dayScheduleSchema = z.object({
  is_closed: z.boolean(),
  open_time: z.string().optional(),
  close_time: z.string().optional(),
  break_start: z.string().optional(),
  break_end: z.string().optional(),
}).refine((data) => {
  // Si está cerrado, no necesita validación adicional
  if (data.is_closed) return true;
  
  // Si está abierto, debe tener horarios de apertura y cierre
  if (!data.open_time || !data.close_time) {
    return false;
  }
  
  // Si tiene un horario de descanso, debe tener ambos (inicio y fin)
  if ((data.break_start && !data.break_end) || (!data.break_start && data.break_end)) {
    return false;
  }
  
  return true;
}, {
  message: "Los días abiertos deben tener horario completo y los descansos deben tener inicio y fin"
});

const _scheduleSchema = z.object({
  monday: dayScheduleSchema,
  tuesday: dayScheduleSchema,
  wednesday: dayScheduleSchema,
  thursday: dayScheduleSchema,
  friday: dayScheduleSchema,
  saturday: dayScheduleSchema,
  sunday: dayScheduleSchema,
  max_concurrent_appointments: z.number().min(1).max(20),
});

type ScheduleFormData = z.infer<typeof scheduleSchema>;

interface BarbershopScheduleConfigProps {
  barbershopId: string;
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

export function BarbershopScheduleConfig({ barbershopId }: BarbershopScheduleConfigProps) {
  const { toast } = useToast();
  const _queryClient = useQueryClient();
  const [showSuccess, setShowSuccess] = useState(false);

  // Consultar horarios actuales
  const { data: currentSchedule, isLoading: isLoadingSchedule } = useQuery({
    queryKey: ['barbershop-schedule', barbershopId],
    queryFn: () => barbershopHoursService.getBarbershopSchedule(barbershopId),
  });

  // Consultar información de la barbería (para max_concurrent_appointments)
  const { data: barbershop, isLoading: isLoadingBarbershop } = useQuery({
    queryKey: ['barbershop', barbershopId],
    queryFn: () => barbershopService.getById(barbershopId),
  });

  const _form = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      monday: { is_closed: false, open_time: '09:00', close_time: '20:00' },
      tuesday: { is_closed: false, open_time: '09:00', close_time: '20:00' },
      wednesday: { is_closed: false, open_time: '09:00', close_time: '20:00' },
      thursday: { is_closed: false, open_time: '09:00', close_time: '20:00' },
      friday: { is_closed: false, open_time: '09:00', close_time: '20:00' },
      saturday: { is_closed: false, open_time: '10:00', close_time: '18:00' },
      sunday: { is_closed: true },
      max_concurrent_appointments: 1,
    },
  });

  // Actualizar formulario cuando se cargan los datos
  useEffect(() => {
    if (currentSchedule && barbershop) {
      const formData: any = {
        max_concurrent_appointments: barbershop.max_concurrent_appointments || 1,
      };

      // Convertir los datos del servicio al formato del formulario
      currentSchedule.forEach((daySchedule) => {
        const _day = daySchedule.day_of_week as DayOfWeek;
        formData[day] = {
          is_closed: daySchedule.is_closed,
          open_time: daySchedule.open_time || '09:00',
          close_time: daySchedule.close_time || '20:00',
        };
      });

      form.reset(formData);
    }
  }, [currentSchedule, barbershop, form]);

  // Mutación para actualizar horarios
  const _updateScheduleMutation = useMutation({
    mutationFn: async (data: ScheduleFormData) => {
      // Convertir datos del formulario al formato del servicio
      const weekSchedule: WeekSchedule = {};
      daysOrder.forEach((day) => {
        weekSchedule[day] = data[day];
      });

      // Actualizar horarios
      await barbershopHoursService.updateBarbershopSchedule(barbershopId, weekSchedule);
      
      // Actualizar capacidad máxima si cambió
      if (barbershop && barbershop.max_concurrent_appointments !== data.max_concurrent_appointments) {
        await barbershopService.updateBarbershop(barbershopId, {
          max_concurrent_appointments: data.max_concurrent_appointments,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barbershop-schedule', barbershopId] });
      queryClient.invalidateQueries({ queryKey: ['barbershop', barbershopId] });
      queryClient.invalidateQueries({ queryKey: ['barbershop-availability'] });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      toast({
        title: 'Horarios actualizados',
        description: 'Los horarios de la barbería se han guardado exitosamente. Los cambios ya están activos.',
      });
    },
    onError: (error) => {
      console.error('Error updating schedule:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudieron actualizar los horarios',
        variant: 'destructive',
      });
    },
  });

  // Mutación para restablecer valores por defecto
  const _resetToDefaultMutation = useMutation({
    mutationFn: () => barbershopHoursService.copyDefaultSchedule(barbershopId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barbershop-schedule', barbershopId] });
      toast({
        title: 'Horarios restablecidos',
        description: 'Se han aplicado los horarios por defecto',
      });
    },
    onError: (error) => {
      console.error('Error resetting schedule:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron restablecer los horarios',
        variant: 'destructive',
      });
    },
  });

  const _onSubmit = async (data: ScheduleFormData) => {
    try {
      // Validación básica: horarios de apertura y cierre
      for (const [day, schedule] of Object.entries(data)) {
        if (day === 'max_concurrent_appointments') continue;
        
        const _daySchedule = schedule as typeof data.monday;
        if (!daySchedule.is_closed) {
          if (!daySchedule.open_time || !daySchedule.close_time) {
            toast({
              title: 'Error de validación',
              description: `El ${dayLabels[day as DayOfWeek]} debe tener horario de apertura y cierre`,
              variant: 'destructive',
            });
            return;
          }
          
          // Validar que la hora de cierre sea posterior a la de apertura
          const _openTime = parseInt(daySchedule.open_time.replace(':', ''));
          const _closeTime = parseInt(daySchedule.close_time.replace(':', ''));
          
          if (closeTime <= openTime) {
            toast({
              title: 'Error de validación',
              description: `La hora de cierre del ${dayLabels[day as DayOfWeek]} debe ser posterior a la de apertura`,
              variant: 'destructive',
            });
            return;
          }
        }
      }
      
      updateScheduleMutation.mutate(data);
    } catch (error) {
      console.error('Error in form submission:', error);
      toast({
        title: 'Error',
        description: 'Ocurrió un error al procesar el formulario',
        variant: 'destructive',
      });
    }
  };

  const _handleResetToDefault = () => {
    if (window.confirm('¿Estás seguro de que deseas restablecer los horarios por defecto? Se perderán los cambios actuales.')) {
      resetToDefaultMutation.mutate();
    }
  };

  const _isLoading = isLoadingSchedule || isLoadingBarbershop;
  const _isSaving = updateScheduleMutation.isPending || resetToDefaultMutation.isPending;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Horarios de la Barbería
            </CardTitle>
            <CardDescription>
              Define los horarios de apertura y cierre de tu barbería. Los horarios individuales y descansos de cada barbero se configuran por separado.
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
            {/* Capacidad máxima */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">Configuración General</h3>
              </div>
              
              <FormField
                control={form.control}
                name="max_concurrent_appointments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Citas concurrentes máximas</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        disabled={isSaving}
                        className="w-24"
                      />
                    </FormControl>
                    <FormDescription>
                      Número máximo de citas que pueden agendarse en el mismo horario
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Info Alert */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <p><strong>Nota:</strong> Estos horarios definen cuándo está abierta la barbería.</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>Define los horarios generales de apertura y cierre de la barbería.</li>
                  <li>Cada barbero puede configurar su propio horario de trabajo y descansos dentro de estos límites.</li>
                  <li>Los cambios se aplicarán inmediatamente después de guardar.</li>
                </ul>
              </AlertDescription>
            </Alert>

            {/* Grid de días */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">Horarios por día</h3>
              </div>

              <div className="space-y-4">
                {daysOrder.map((day) => (
                  <div key={day} className="rounded-lg border p-4 transition-all hover:border-primary/50">
                    <div className="grid gap-4 lg:grid-cols-5 items-start">
                      {/* Día y switch */}
                      <div className="lg:col-span-1">
                        <div className="flex items-center justify-between lg:flex-col lg:items-start lg:gap-2">
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
                                    disabled={isSaving}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal cursor-pointer">
                                  {field.value ? 'Cerrado' : 'Abierto'}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Horarios */}
                      <div className="lg:col-span-4">
                        <Controller
                          control={form.control}
                          name={`${day}.is_closed` as any}
                          render={({ field: closedField }) => (
                            <div className={`${closedField.value ? 'opacity-50' : ''}`}>
                              {/* Horario principal */}
                              <div className="space-y-2">
                                <div className="text-xs font-medium text-muted-foreground">Horario de atención</div>
                                <div className="flex gap-2 items-center">
                                  <FormField
                                    control={form.control}
                                    name={`${day}.open_time` as any}
                                    render={({ field }) => (
                                      <FormItem className="flex-1">
                                        <FormLabel className="text-xs">Apertura</FormLabel>
                                        <FormControl>
                                          <Input
                                            type="time"
                                            {...field}
                                            disabled={isSaving || closedField.value}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <span className="mt-6">-</span>
                                  <FormField
                                    control={form.control}
                                    name={`${day}.close_time` as any}
                                    render={({ field }) => (
                                      <FormItem className="flex-1">
                                        <FormLabel className="text-xs">Cierre</FormLabel>
                                        <FormControl>
                                          <Input
                                            type="time"
                                            {...field}
                                            disabled={isSaving || closedField.value}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Información sobre horarios por defecto */}
            {currentSchedule?.some(s => s.is_default) && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Actualmente estás usando los horarios por defecto del sistema. 
                  Los cambios que realices crearán un horario personalizado para tu barbería.
                </AlertDescription>
              </Alert>
            )}

            {/* Botones de acción */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
              <Button
                type="submit"
                disabled={isSaving || !form.formState.isDirty}
                size="lg"
                className="flex-1 sm:flex-initial min-w-[200px]"
              >
                {updateScheduleMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar cambios
                  </>
                )}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={handleResetToDefault}
                disabled={isSaving}
                className="flex-1 sm:flex-initial"
              >
                {resetToDefaultMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Restableciendo...
                  </>
                ) : (
                  <>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Restablecer valores por defecto
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}