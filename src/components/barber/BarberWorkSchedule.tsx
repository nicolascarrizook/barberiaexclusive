import {useEffect} from 'react';
// // // // // import { useForm } from 'react-hook-form';
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
// // // // // import { barberSchedulesService, WeeklyBarberSchedule } from '@/services/barber-schedules.service';
// // // // // import { barbershopHoursService } from '@/services/barbershop-hours.service';
// // // // // import { supabase } from '@/lib/supabase';
// // // // // import { 
  Save, 
  Loader2, 
  Clock, 
  Calendar,
  AlertCircle,
  Check,
  Copy,
  Info
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
// // // // // import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Schema for form validation
const _dayScheduleSchema = z.object({
  is_working: z.boolean(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  break_start: z.string().optional(),
  break_end: z.string().optional(),
}).refine(
  (data) => {
    if (!data.is_working) return true;
    // Check that times are not just empty strings
    const _hasValidStartTime = data.start_time && data.start_time.trim() !== '';
    const _hasValidEndTime = data.end_time && data.end_time.trim() !== '';
    return hasValidStartTime && hasValidEndTime;
  },
  {
    message: "Los días laborales deben tener horario de entrada y salida",
  }
);

const _scheduleSchema = z.object({
  monday: dayScheduleSchema,
  tuesday: dayScheduleSchema,
  wednesday: dayScheduleSchema,
  thursday: dayScheduleSchema,
  friday: dayScheduleSchema,
  saturday: dayScheduleSchema,
  sunday: dayScheduleSchema,
});

type ScheduleFormData = z.infer<typeof scheduleSchema>;

interface BarberWorkScheduleProps {
  barberId: string;
  barbershopId: string;
  barberName?: string;
}

// Day labels in Spanish
const dayLabels: Record<DayOfWeek, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

// Day order
const daysOrder: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export function BarberWorkSchedule({ barberId, barbershopId, barberName }: BarberWorkScheduleProps) {
  const { toast } = useToast();
  const _queryClient = useQueryClient();
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [selectedSourceBarber, setSelectedSourceBarber] = useState<string>('');

  // Fetch current barber schedule
  const { data: currentSchedule, isLoading: isLoadingSchedule } = useQuery({
    queryKey: ['barber-schedule', barberId],
    queryFn: () => barberSchedulesService.getBarberWeeklySchedule(barberId),
  });

  // Fetch barbershop hours for validation
  const { data: barbershopSchedule } = useQuery({
    queryKey: ['barbershop-schedule', barbershopId],
    queryFn: () => barbershopHoursService.getBarbershopSchedule(barbershopId),
  });

  // Fetch other barbers for copy functionality
  const { data: otherBarbers } = useQuery({
    queryKey: ['barbershop-barbers', barbershopId],
    queryFn: async () => {
      const { data } = await supabase
        .from('barbers')
        .select('id, full_name')
        .eq('barbershop_id', barbershopId)
        .eq('is_active', true)
        .neq('id', barberId);
      return data || [];
    },
  });

  const _form = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      monday: { is_working: true, start_time: '09:00', end_time: '20:00', break_start: '13:00', break_end: '14:00' },
      tuesday: { is_working: true, start_time: '09:00', end_time: '20:00', break_start: '13:00', break_end: '14:00' },
      wednesday: { is_working: true, start_time: '09:00', end_time: '20:00', break_start: '13:00', break_end: '14:00' },
      thursday: { is_working: true, start_time: '09:00', end_time: '20:00', break_start: '13:00', break_end: '14:00' },
      friday: { is_working: true, start_time: '09:00', end_time: '20:00', break_start: '13:00', break_end: '14:00' },
      saturday: { is_working: true, start_time: '10:00', end_time: '18:00' },
      sunday: { is_working: false },
    },
  });

  // Update form when data loads
  useEffect(() => {
    if (currentSchedule) {
      const formData: any = {};

      // Initialize all days with default values
      daysOrder.forEach((day) => {
        formData[day] = {
          is_working: false,
          start_time: '09:00',
          end_time: '20:00',
          break_start: '',
          break_end: '',
        };
      });

      // Update with actual schedule data
      currentSchedule.forEach((daySchedule) => {
        const _day = daySchedule.day_of_week as DayOfWeek;
        formData[day] = {
          is_working: daySchedule.is_working ?? true, // If record exists, assume working
          start_time: daySchedule.start_time || '09:00',
          end_time: daySchedule.end_time || '20:00',
          break_start: daySchedule.break_start || '',
          break_end: daySchedule.break_end || '',
        };
      });

      form.reset(formData);
    }
  }, [currentSchedule, form]);

  // Update schedule mutation
  const _updateScheduleMutation = useMutation({
    mutationFn: async (data: ScheduleFormData) => {
      const weekSchedule: WeeklyBarberSchedule = {};
      daysOrder.forEach((day) => {
        weekSchedule[day] = data[day];
      });

      await barberSchedulesService.updateBarberWeeklySchedule(barberId, weekSchedule);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barber-schedule', barberId] });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      toast({
        title: 'Horario actualizado',
        description: 'Tu horario de trabajo se ha guardado exitosamente',
      });
    },
    onError: (error) => {
      console.error('Error updating schedule:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo actualizar el horario',
        variant: 'destructive',
      });
    },
  });

  // Copy schedule mutation
  const _copyScheduleMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSourceBarber) throw new Error('Debes seleccionar un barbero');
      await barberSchedulesService.copyBarberSchedule(selectedSourceBarber, barberId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barber-schedule', barberId] });
      setShowCopyDialog(false);
      toast({
        title: 'Horario copiado',
        description: 'Se ha copiado el horario exitosamente',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo copiar el horario',
        variant: 'destructive',
      });
    },
  });

  const _onSubmit = (data: ScheduleFormData) => {
    // Validate against barbershop hours before submitting
    let hasErrors = false;
    const errors: string[] = [];

    daysOrder.forEach((day) => {
      const _dayData = data[day];
      const _warning = getScheduleWarning(day, dayData);
      if (warning && dayData.is_working) {
        hasErrors = true;
        errors.push(`${dayLabels[day]}: ${warning}`);
      }
    });

    if (hasErrors) {
      toast({
        title: 'Error de validación',
        description: 'No puedes configurar horarios fuera del horario de la barbería:\n' + errors.join('\n'),
        variant: 'destructive',
      });
      return;
    }

    updateScheduleMutation.mutate(data);
  };

  const _handleCopySchedule = () => {
    copyScheduleMutation.mutate();
  };

  // Check if schedule is within barbershop hours
  const _getScheduleWarning = (day: DayOfWeek, dayData: any): string | null => {
    if (!dayData.is_working || !barbershopSchedule) return null;

    const _barbershopDay = barbershopSchedule.find(s => s.day_of_week === day);
    if (!barbershopDay || barbershopDay.is_closed) {
      return 'La barbería está cerrada este día';
    }

    if (dayData.start_time && barbershopDay.open_time && dayData.start_time < barbershopDay.open_time) {
      return `Tu horario inicia antes que la barbería (${barbershopDay.open_time})`;
    }

    if (dayData.end_time && barbershopDay.close_time && dayData.end_time > barbershopDay.close_time) {
      return `Tu horario termina después que la barbería (${barbershopDay.close_time})`;
    }

    return null;
  };

  if (isLoadingSchedule) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Horario de Trabajo
              </CardTitle>
              <CardDescription>
                {barberName ? `Configuración del horario de ${barberName}` : 'Define tu horario semanal de trabajo y descansos'}
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
              {/* Action buttons */}
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCopyDialog(true)}
                  disabled={!otherBarbers || otherBarbers.length === 0}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar horario de otro barbero
                </Button>
              </div>

              <Separator />

              {/* Days grid */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium">Horario semanal</h3>
                </div>

                <div className="space-y-4">
                  {daysOrder.map((day) => {
                    const _dayData = form.watch(day as any);
                    const _warning = getScheduleWarning(day, dayData);

                    return (
                      <div key={day} className="rounded-lg border p-4">
                        <div className="grid gap-4 sm:grid-cols-5 items-start">
                          {/* Day and switch */}
                          <div className="sm:col-span-1">
                            <div className="flex items-center justify-between sm:flex-col sm:items-start sm:gap-2">
                              <Label className="text-base font-medium">
                                {dayLabels[day]}
                              </Label>
                              <FormField
                                control={form.control}
                                name={`${day}.is_working` as any}
                                render={({ field }) => (
                                  <FormItem className="flex items-center gap-2">
                                    <FormControl>
                                      <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        disabled={updateScheduleMutation.isPending}
                                      />
                                    </FormControl>
                                    <FormLabel className="text-sm font-normal cursor-pointer">
                                      {field.value ? 'Trabajo' : 'Descanso'}
                                    </FormLabel>
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>

                          {/* Schedule inputs */}
                          <div className="sm:col-span-4">
                            <div className={`grid gap-4 sm:grid-cols-2 ${!dayData.is_working ? 'opacity-50' : ''}`}>
                              {/* Working hours */}
                              <div className="flex gap-2 items-center">
                                <FormField
                                  control={form.control}
                                  name={`${day}.start_time` as any}
                                  render={({ field }) => (
                                    <FormItem className="flex-1">
                                      <FormLabel className="text-xs">Entrada</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="time"
                                          {...field}
                                          disabled={updateScheduleMutation.isPending || !dayData.is_working}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <span className="mt-6">-</span>
                                <FormField
                                  control={form.control}
                                  name={`${day}.end_time` as any}
                                  render={({ field }) => (
                                    <FormItem className="flex-1">
                                      <FormLabel className="text-xs">Salida</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="time"
                                          {...field}
                                          disabled={updateScheduleMutation.isPending || !dayData.is_working}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>

                              {/* Break times */}
                              <div className="flex gap-2 items-center">
                                <FormField
                                  control={form.control}
                                  name={`${day}.break_start` as any}
                                  render={({ field }) => (
                                    <FormItem className="flex-1">
                                      <FormLabel className="text-xs">Descanso desde</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="time"
                                          {...field}
                                          disabled={updateScheduleMutation.isPending || !dayData.is_working}
                                          placeholder="--:--"
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                                <span className="mt-6">-</span>
                                <FormField
                                  control={form.control}
                                  name={`${day}.break_end` as any}
                                  render={({ field }) => (
                                    <FormItem className="flex-1">
                                      <FormLabel className="text-xs">hasta</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="time"
                                          {...field}
                                          disabled={updateScheduleMutation.isPending || !dayData.is_working}
                                          placeholder="--:--"
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>

                            {/* Warning message */}
                            {warning && (
                              <Alert className="mt-2">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription className="text-xs">
                                  {warning}
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Information alert */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Los descansos programados aquí son tus horarios regulares de almuerzo o descanso. 
                  Para descansos excepcionales (citas médicas, permisos, etc.) usa el gestor de descansos.
                </AlertDescription>
              </Alert>

              {/* Submit button */}
              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  disabled={updateScheduleMutation.isPending}
                >
                  {updateScheduleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />
                  Guardar horario
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Copy schedule dialog */}
      <Dialog open={showCopyDialog} onOpenChange={setShowCopyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copiar horario de otro barbero</DialogTitle>
            <DialogDescription>
              Selecciona un barbero para copiar su horario de trabajo
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Barbero</Label>
              <Select value={selectedSourceBarber} onValueChange={setSelectedSourceBarber}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un barbero" />
                </SelectTrigger>
                <SelectContent>
                  {otherBarbers?.map((barber) => (
                    <SelectItem key={barber.id} value={barber.id}>
                      {barber.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Esto reemplazará completamente tu horario actual con el del barbero seleccionado.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCopyDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCopySchedule} 
              disabled={!selectedSourceBarber || copyScheduleMutation.isPending}
            >
              {copyScheduleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Copiar horario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}