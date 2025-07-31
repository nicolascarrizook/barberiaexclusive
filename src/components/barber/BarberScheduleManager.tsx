import React, { useState, useEffect, useCallback } from 'react';
import { format, startOfWeek, addDays, isSameDay, parse, isWithinInterval, addWeeks, subWeeks } from 'date-fns'
import { es } from 'date-fns/locale'
import { Clock, Calendar, Plus, Trash2, Copy, AlertCircle, ChevronLeft, ChevronRight, Loader2, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { availabilityService, BreakRequest } from '@/services/availability.service'
import { barbershopHoursService } from '@/services/barbershop-hours.service'
import { barberSchedulesService } from '@/services/barber-schedules.service'
import { BarberWorkingHours } from './BarberWorkingHours'
import type {
  BarberBreaks,
  BarbershopHours,
  DayOfWeek,
} from '@/types/database';

interface BarberScheduleManagerProps {
  barberId: string;
  barbershopId: string;
}

interface BreakFormData {
  date: string;
  startTime: string;
  endTime: string;
  reason?: string;
}

interface WeeklySchedule {
  [key: string]: {
    barbershopHours: BarbershopHours | null;
    breaks: BarberBreaks[];
    isAvailable: boolean;
  };
}

// Días de la semana en español
const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

// Generar opciones de tiempo cada 15 minutos
const generateTimeOptions = () => {
  const options = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      options.push(time);
    }
  }
  return options;
};

export const BarberScheduleManager: React.FC<BarberScheduleManagerProps> = ({
  barberId,
  barbershopId,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>({});
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [breakDialogOpen, setBreakDialogOpen] = useState(false);
  const [breakToEdit, setBreakToEdit] = useState<BarberBreaks | null>(null);
  const [breakForm, setBreakForm] = useState<BreakFormData>({
    date: '',
    startTime: '',
    endTime: '',
    reason: '',
  });
  const [savingBreak, setSavingBreak] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [targetWeek, setTargetWeek] = useState<Date | null>(null);

  const timeOptions = generateTimeOptions();

  // Cargar el horario semanal
  const loadWeeklySchedule = useCallback(async () => {
    try {
      setLoading(true);
      const schedule: WeeklySchedule = {};

      // Obtener horarios de la barbería
      const barbershopSchedule =
        await barbershopHoursService.getBarbershopSchedule(barbershopId);

      // Iterar sobre cada día de la semana
      for (let i = 0; i < 7; i++) {
        const currentDate = addDays(currentWeek, i);
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        const dayOfWeek = format(currentDate, 'EEEE', {
          locale: es,
        }).toLowerCase() as DayOfWeek;

        // Encontrar el horario de la barbería para este día
        const barbershopHours =
          barbershopSchedule.find((h) => h.day_of_week === dayOfWeek) || null;

        // Obtener breaks del barbero para este día
        const breaks = await availabilityService.getBarberBreaks(
          barberId,
          dateStr
        );

        schedule[dateStr] = {
          barbershopHours,
          breaks,
          isAvailable: barbershopHours ? !barbershopHours.is_closed : false,
        };
      }

      setWeeklySchedule(schedule);
    } catch (error) {
      console.error('Error loading schedule:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar el horario',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [currentWeek, barberId, barbershopId, toast]);

  useEffect(() => {
    loadWeeklySchedule();
  }, [loadWeeklySchedule]);

  // Navegar entre semanas
  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek((prev) =>
      direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1)
    );
  };

  // Abrir diálogo para agregar/editar break
  const openBreakDialog = (date: Date, existingBreak?: BarberBreaks) => {
    setSelectedDay(date);
    setBreakToEdit(existingBreak || null);

    if (existingBreak) {
      setBreakForm({
        date: existingBreak.date,
        startTime: existingBreak.start_time,
        endTime: existingBreak.end_time,
        reason: existingBreak.reason || '',
      });
    } else {
      setBreakForm({
        date: format(date, 'yyyy-MM-dd'),
        startTime: '',
        endTime: '',
        reason: '',
      });
    }

    setBreakDialogOpen(true);
  };

  // Guardar break
  const handleSaveBreak = async () => {
    try {
      setSavingBreak(true);

      // Validaciones
      if (!breakForm.startTime || !breakForm.endTime) {
        toast({
          title: 'Error',
          description: 'Debe seleccionar hora de inicio y fin',
          variant: 'destructive',
        });
        return;
      }

      const startMinutes = timeToMinutes(breakForm.startTime);
      const endMinutes = timeToMinutes(breakForm.endTime);

      if (startMinutes >= endMinutes) {
        toast({
          title: 'Error',
          description: 'La hora de fin debe ser posterior a la hora de inicio',
          variant: 'destructive',
        });
        return;
      }

      // Verificar que el break esté dentro del horario de la barbería
      const daySchedule = weeklySchedule[breakForm.date];
      if (
        daySchedule?.barbershopHours &&
        !daySchedule.barbershopHours.is_closed
      ) {
        const openMinutes = timeToMinutes(
          daySchedule.barbershopHours.open_time!
        );
        const closeMinutes = timeToMinutes(
          daySchedule.barbershopHours.close_time!
        );

        if (startMinutes < openMinutes || endMinutes > closeMinutes) {
          toast({
            title: 'Error',
            description:
              'El descanso debe estar dentro del horario de la barbería',
            variant: 'destructive',
          });
          return;
        }
      }

      const breakRequest: BreakRequest = {
        barber_id: barberId,
        date: breakForm.date,
        start_time: breakForm.startTime,
        end_time: breakForm.endTime,
        reason: breakForm.reason || undefined,
      };

      await availabilityService.createBarberBreak(breakRequest);

      toast({
        title: 'Éxito',
        description: 'Descanso guardado correctamente',
      });

      setBreakDialogOpen(false);
      loadWeeklySchedule();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo guardar el descanso',
        variant: 'destructive',
      });
    } finally {
      setSavingBreak(false);
    }
  };

  // Eliminar break
  const handleDeleteBreak = async (breakId: string) => {
    try {
      await availabilityService.deleteBarberBreak(breakId);

      toast({
        title: 'Éxito',
        description: 'Descanso eliminado correctamente',
      });

      loadWeeklySchedule();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el descanso',
        variant: 'destructive',
      });
    }
  };

  // Copiar horario a otra semana
  const handleCopyWeek = async () => {
    if (!targetWeek) {
      toast({
        title: 'Error',
        description: 'Debe seleccionar una semana destino',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      // Obtener todos los breaks de la semana actual
      const breaksToCopy: BreakRequest[] = [];

      for (let i = 0; i < 7; i++) {
        const sourceDate = addDays(currentWeek, i);
        const targetDate = addDays(targetWeek, i);
        const sourceDateStr = format(sourceDate, 'yyyy-MM-dd');
        const targetDateStr = format(targetDate, 'yyyy-MM-dd');

        const daySchedule = weeklySchedule[sourceDateStr];
        if (daySchedule?.breaks) {
          for (const breakItem of daySchedule.breaks) {
            breaksToCopy.push({
              barber_id: barberId,
              date: targetDateStr,
              start_time: breakItem.start_time,
              end_time: breakItem.end_time,
              reason: breakItem.reason || undefined,
            });
          }
        }
      }

      // Crear todos los breaks en la semana destino
      await Promise.all(
        breaksToCopy.map((b) => availabilityService.createBarberBreak(b))
      );

      toast({
        title: 'Éxito',
        description: 'Horario copiado correctamente',
      });

      setCopyDialogOpen(false);
      // Navegar a la semana copiada
      setCurrentWeek(targetWeek);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo copiar el horario',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Convertir tiempo a minutos
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Formatear tiempo para mostrar
  const formatTimeDisplay = (time: string): string => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Verificar si hay conflictos en un día
  const hasConflicts = (dateStr: string): boolean => {
    const daySchedule = weeklySchedule[dateStr];
    if (!daySchedule || !daySchedule.breaks.length) return false;

    // Verificar superposición entre breaks
    const breaks = daySchedule.breaks;
    for (let i = 0; i < breaks.length; i++) {
      for (let j = i + 1; j < breaks.length; j++) {
        const break1Start = timeToMinutes(breaks[i].start_time);
        const break1End = timeToMinutes(breaks[i].end_time);
        const break2Start = timeToMinutes(breaks[j].start_time);
        const break2End = timeToMinutes(breaks[j].end_time);

        if (break1Start < break2End && break1End > break2Start) {
          return true;
        }
      }
    }

    return false;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="breaks" className="space-y-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="schedule" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Mi Horario de Trabajo
        </TabsTrigger>
        <TabsTrigger value="breaks" className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Descansos Temporales
        </TabsTrigger>
      </TabsList>

      {/* Tab de Horario de Trabajo */}
      <TabsContent value="schedule" className="space-y-4">
        <BarberWorkingHours barberId={barberId} barbershopId={barbershopId} />
      </TabsContent>

      {/* Tab de Descansos Temporales */}
      <TabsContent value="breaks" className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Usa esta sección para programar descansos temporales o
            excepcionales. Tu horario regular de trabajo y descansos diarios se
            configura en la pestaña &quot;Mi Horario de Trabajo&quot;.
          </AlertDescription>
        </Alert>

        {/* Header con navegación de semana */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Gestión de Descansos Temporales
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCopyDialogOpen(true)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar semana
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between mt-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateWeek('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-lg font-medium">
                {format(currentWeek, 'dd MMM', { locale: es })} -{' '}
                {format(addDays(currentWeek, 6), 'dd MMM yyyy', { locale: es })}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateWeek('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Vista de calendario semanal */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
          {DAYS_OF_WEEK.map((day, index) => {
            const currentDate = addDays(currentWeek, index);
            const dateStr = format(currentDate, 'yyyy-MM-dd');
            const daySchedule = weeklySchedule[dateStr];
            const isToday = isSameDay(currentDate, new Date());
            const hasConflict = hasConflicts(dateStr);

            return (
              <Card
                key={day.key}
                className={`${isToday ? 'border-primary' : ''} ${hasConflict ? 'border-destructive' : ''}`}
              >
                <CardHeader className="pb-3">
                  <div className="space-y-1">
                    <h3 className="font-medium text-sm">{day.label}</h3>
                    <p className="text-xs text-muted-foreground">
                      {format(currentDate, 'dd MMM', { locale: es })}
                    </p>
                    {isToday && (
                      <Badge variant="secondary" className="text-xs">
                        Hoy
                      </Badge>
                    )}
                    {hasConflict && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Conflicto
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* Horario de la barbería */}
                  {daySchedule?.barbershopHours && (
                    <div className="mb-3 p-2 bg-muted rounded-md">
                      <p className="text-xs font-medium mb-1">Barbería:</p>
                      {daySchedule.barbershopHours.is_closed ? (
                        <p className="text-xs text-muted-foreground">Cerrado</p>
                      ) : (
                        <>
                          <p className="text-xs">
                            {formatTimeDisplay(
                              daySchedule.barbershopHours.open_time!
                            )}{' '}
                            -{' '}
                            {formatTimeDisplay(
                              daySchedule.barbershopHours.close_time!
                            )}
                          </p>
                          {/* Break times are now managed at the individual barber level */}
                        </>
                      )}
                    </div>
                  )}

                  {/* Breaks del barbero */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium">Descansos:</p>
                      {daySchedule?.isAvailable && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => openBreakDialog(currentDate)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    {daySchedule?.breaks.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Sin descansos
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {daySchedule?.breaks.map((breakItem) => (
                          <div
                            key={breakItem.id}
                            className="flex items-center justify-between p-2 bg-secondary rounded-md"
                          >
                            <div className="flex-1">
                              <p className="text-xs">
                                {formatTimeDisplay(breakItem.start_time)} -{' '}
                                {formatTimeDisplay(breakItem.end_time)}
                              </p>
                              {breakItem.reason && (
                                <p className="text-xs text-muted-foreground">
                                  {breakItem.reason}
                                </p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => handleDeleteBreak(breakItem.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Estado de disponibilidad */}
                  {!daySchedule?.isAvailable && (
                    <Alert className="mt-3">
                      <AlertCircle className="h-3 w-3" />
                      <AlertDescription className="text-xs">
                        No disponible
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Diálogo para agregar/editar break */}
        <Dialog open={breakDialogOpen} onOpenChange={setBreakDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {breakToEdit ? 'Editar Descanso' : 'Agregar Descanso'}
              </DialogTitle>
              <DialogDescription>
                Configure el horario de descanso para{' '}
                {selectedDay &&
                  format(selectedDay, 'EEEE dd/MM', { locale: es })}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hora de inicio</Label>
                  <Select
                    value={breakForm.startTime}
                    onValueChange={(value) =>
                      setBreakForm({ ...breakForm, startTime: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar hora" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((time) => (
                        <SelectItem key={time} value={time}>
                          {formatTimeDisplay(time)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Hora de fin</Label>
                  <Select
                    value={breakForm.endTime}
                    onValueChange={(value) =>
                      setBreakForm({ ...breakForm, endTime: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar hora" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((time) => (
                        <SelectItem key={time} value={time}>
                          {formatTimeDisplay(time)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Motivo (opcional)</Label>
                <Select
                  value={breakForm.reason}
                  onValueChange={(value) =>
                    setBreakForm({ ...breakForm, reason: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin especificar</SelectItem>
                    <SelectItem value="Almuerzo">Almuerzo</SelectItem>
                    <SelectItem value="Descanso">Descanso</SelectItem>
                    <SelectItem value="Personal">Personal</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setBreakDialogOpen(false)}
                disabled={savingBreak}
              >
                Cancelar
              </Button>
              <Button onClick={handleSaveBreak} disabled={savingBreak}>
                {savingBreak ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Diálogo para copiar semana */}
        <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Copiar Horario Semanal</DialogTitle>
              <DialogDescription>
                Seleccione la semana a la que desea copiar el horario actual
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-md">
                <p className="text-sm font-medium mb-2">Semana origen:</p>
                <p className="text-sm">
                  {format(currentWeek, 'dd MMM', { locale: es })} -{' '}
                  {format(addDays(currentWeek, 6), 'dd MMM yyyy', {
                    locale: es,
                  })}
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Semana destino</Label>
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((weeksAhead) => {
                    const week = addWeeks(currentWeek, weeksAhead);
                    return (
                      <Button
                        key={weeksAhead}
                        variant={
                          targetWeek && isSameDay(targetWeek, week)
                            ? 'default'
                            : 'outline'
                        }
                        className="w-full justify-start"
                        onClick={() => setTargetWeek(week)}
                      >
                        {format(week, 'dd MMM', { locale: es })} -{' '}
                        {format(addDays(week, 6), 'dd MMM yyyy', {
                          locale: es,
                        })}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setCopyDialogOpen(false);
                  setTargetWeek(null);
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleCopyWeek} disabled={!targetWeek}>
                Copiar Horario
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TabsContent>
    </Tabs>
  );
};
