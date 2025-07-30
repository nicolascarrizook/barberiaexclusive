import React, { useState, useEffect } from 'react';
// // // // // import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// // // // // import { useForm, Controller } from 'react-hook-form';
// // // // // import { zodResolver } from '@hookform/resolvers/zod';
// // // // // import { z } from 'zod';
// // // // // import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
// // // // // import { Button } from '@/components/ui/button';
// // // // // import { Input } from '@/components/ui/input';
// // // // // import { Label } from '@/components/ui/label';
// // // // // import { Switch } from '@/components/ui/switch';
// // // // // import { Badge } from '@/components/ui/badge';
// // // // // import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
// // // // // import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
// // // // // import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
// // // // // import { Textarea } from '@/components/ui/textarea';
// // // // // import { Alert, AlertDescription } from '@/components/ui/alert';
// // // // // import { Separator } from '@/components/ui/separator';
// // // // // import { useToast } from '@/hooks/use-toast';
// // // // // import {
  Calendar,
  Plus,
  Import,
  Copy,
  Filter,
  Clock,
  X,
  AlertTriangle,
  Info,
  CheckCircle,
  MapPin,
  Users,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
// // // // // import {
  holidaysService,
  Holiday,
  HolidayFilter,
  HolidayCustomHours,
} from '@/services/holidays.service';

interface HolidayCalendarProps {
  barbershopId: string;
}

// Schema de validación para el formulario de feriado
const _holidaySchema = z.object({
  date: z.string().min(1, 'La fecha es requerida'),
  reason: z.string().min(1, 'El motivo es requerido'),
  is_closed: z.boolean(),
  custom_hours: z.object({
    start: z.string().optional(),
    end: z.string().optional(),
    breaks: z.array(z.object({
      start: z.string(),
      end: z.string(),
    })).optional(),
  }).optional(),
});

type HolidayFormData = z.infer<typeof holidaySchema>;

// Colores para los diferentes tipos de feriados
const _HOLIDAY_COLORS = {
  national: 'bg-blue-100 text-blue-800 border-blue-200',
  custom: 'bg-purple-100 text-purple-800 border-purple-200',
  closed: 'bg-red-100 text-red-800 border-red-200',
  special_hours: 'bg-orange-100 text-orange-800 border-orange-200',
} as const;

// Nombres de los meses en español
const _MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// Nombres de los días de la semana en español
const _DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/**
 * Componente principal del calendario de feriados
 * Permite gestionar feriados nacionales argentinos y fechas especiales personalizadas
 */
export const HolidayCalendar: React.FC<HolidayCalendarProps> = ({ barbershopId }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isHolidayDialogOpen, setIsHolidayDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [filters, setFilters] = useState<HolidayFilter>({});
  const [showFilters, setShowFilters] = useState(false);

  const { toast } = useToast();
  const _queryClient = useQueryClient();

  // Formulario para crear/editar feriados
  const _form = useForm<HolidayFormData>({
    resolver: zodResolver(holidaySchema),
    defaultValues: {
      is_closed: true,
      custom_hours: {
        breaks: [],
      },
    },
  });

  // Query para obtener feriados del año
  const {
    data: holidays = [],
    isLoading: isLoadingHolidays,
    error: holidaysError,
  } = useQuery({
    queryKey: ['holidays', barbershopId, selectedYear, filters],
    queryFn: () => holidaysService.getFilteredHolidays(barbershopId, { 
      year: selectedYear, 
      ...filters 
    }),
  });

  // Query para obtener estadísticas
  const {
    data: stats,
    isLoading: isLoadingStats,
  } = useQuery({
    queryKey: ['holiday-stats', barbershopId, selectedYear],
    queryFn: () => holidaysService.getHolidayStats(barbershopId, selectedYear),
  });

  // Query para obtener feriados argentinos disponibles
  const {
    data: availableArgentineHolidays = [],
  } = useQuery({
    queryKey: ['argentine-holidays', selectedYear],
    queryFn: () => holidaysService.getAvailableArgentineHolidays(selectedYear),
  });

  // Mutation para crear/actualizar feriado
  const _createOrUpdateHolidayMutation = useMutation({
    mutationFn: (holiday: Omit<Holiday, 'id' | 'created_at'>) =>
      holidaysService.createOrUpdateHoliday(holiday),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      queryClient.invalidateQueries({ queryKey: ['holiday-stats'] });
      toast({
        title: 'Feriado guardado',
        description: 'El feriado se ha guardado correctamente.',
      });
      setIsHolidayDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: 'Error al guardar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutation para importar feriados argentinos
  const _importArgentineHolidaysMutation = useMutation({
    mutationFn: (year: number) =>
      holidaysService.importArgentineHolidays(barbershopId, year),
    onSuccess: (importedHolidays) => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      queryClient.invalidateQueries({ queryKey: ['holiday-stats'] });
      toast({
        title: 'Feriados importados',
        description: `Se importaron ${importedHolidays.length} feriados argentinos.`,
      });
      setIsImportDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Error al importar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutation para copiar feriados del año anterior
  const _copyHolidaysMutation = useMutation({
    mutationFn: ({ fromYear, toYear }: { fromYear: number; toYear: number }) =>
      holidaysService.copyHolidaysFromPreviousYear(barbershopId, fromYear, toYear),
    onSuccess: (copiedHolidays) => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      queryClient.invalidateQueries({ queryKey: ['holiday-stats'] });
      toast({
        title: 'Feriados copiados',
        description: `Se copiaron ${copiedHolidays.length} feriados personalizados.`,
      });
      setIsCopyDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Error al copiar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutation para eliminar feriado
  const _deleteHolidayMutation = useMutation({
    mutationFn: (date: string) =>
      holidaysService.deleteHolidayByDate(barbershopId, date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      queryClient.invalidateQueries({ queryKey: ['holiday-stats'] });
      toast({
        title: 'Feriado eliminado',
        description: 'El feriado se ha eliminado correctamente.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error al eliminar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Función para obtener el feriado de una fecha específica
  const _getHolidayForDate = (date: Date): Holiday | null => {
    const _dateString = date.toISOString().split('T')[0];
    return holidays.find(holiday => holiday.date === dateString) || null;
  };

  // Función para determinar el tipo de feriado
  const _getHolidayType = (holiday: Holiday): keyof typeof HOLIDAY_COLORS => {
    const _isNational = availableArgentineHolidays.some(ah => ah.date === holiday.date);
    if (isNational) return 'national';
    if (!holiday.custom_hours) return 'closed';
    return 'special_hours';
  };

  // Función para abrir el diálogo de edición con una fecha seleccionada
  const _openHolidayDialog = (date?: string) => {
    if (date) {
      const _existingHoliday = holidays.find(h => h.date === date);
      if (existingHoliday) {
        form.reset({
          date: existingHoliday.date,
          reason: existingHoliday.reason || '',
          is_closed: !existingHoliday.custom_hours,
          custom_hours: existingHoliday.custom_hours || { breaks: [] },
        });
      } else {
        form.reset({
          date,
          reason: '',
          is_closed: true,
          custom_hours: { breaks: [] },
        });
      }
      setSelectedDate(date);
    }
    setIsHolidayDialogOpen(true);
  };

  // Función para manejar el submit del formulario
  const _onSubmit = (data: HolidayFormData) => {
    const holidayData: Omit<Holiday, 'id' | 'created_at'> = {
      barbershop_id: barbershopId,
      barber_id: null,
      date: data.date,
      is_holiday: true,
      reason: data.reason,
      custom_hours: data.is_closed ? null : (data.custom_hours || null),
    };

    createOrUpdateHolidayMutation.mutate(holidayData);
  };

  // Función para generar el calendario del mes
  const _generateMonthCalendar = (monthIndex: number) => {
    const _year = selectedYear;
    const _firstDay = new Date(year, monthIndex, 1);
    const _lastDay = new Date(year, monthIndex + 1, 0);
    const _daysInMonth = lastDay.getDate();
    const _startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Agregar días vacíos al inicio
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Agregar días del mes
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, monthIndex, day));
    }

    return days;
  };

  // Renderizar un día del calendario
  const _renderCalendarDay = (date: Date | null) => {
    if (!date) {
      return <div className="h-8 w-8"></div>;
    }

    const _holiday = getHolidayForDate(date);
    const _isToday = date.toDateString() === new Date().toDateString();
    const _dayNumber = date.getDate();

    return (
      <div
        className={`
          relative h-8 w-8 flex items-center justify-center text-xs cursor-pointer rounded
          ${isToday ? 'bg-blue-500 text-white font-bold' : 'hover:bg-gray-100'}
          ${holiday ? 'font-semibold' : ''}
        `}
        onClick={() => openHolidayDialog(date.toISOString().split('T')[0])}
      >
        <span>{dayNumber}</span>
        {holiday && (
          <div
            className={`
              absolute -top-1 -right-1 w-3 h-3 rounded-full border
              ${HOLIDAY_COLORS[getHolidayType(holiday)]}
            `}
          />
        )}
      </div>
    );
  };

  if (holidaysError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Error al cargar los feriados: {holidaysError.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con controles */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Calendario de Feriados
          </h2>
          
          {/* Selector de año */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedYear(selectedYear - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-semibold text-lg">{selectedYear}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedYear(selectedYear + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Import className="h-4 w-4 mr-2" />
                Importar Feriados
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Importar Feriados Argentinos</DialogTitle>
                <DialogDescription>
                  Importa automáticamente todos los feriados nacionales argentinos para {selectedYear}.
                  Se importarán {availableArgentineHolidays.length} feriados.
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-60 overflow-y-auto">
                <div className="space-y-2">
                  {availableArgentineHolidays.map((holiday) => (
                    <div key={holiday.date} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <div>
                        <div className="font-medium">{holiday.name}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(holiday.date).toLocaleDateString('es-AR')}
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {holiday.type === 'fixed' ? 'Fijo' : 'Movible'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => importArgentineHolidaysMutation.mutate(selectedYear)}
                  disabled={importArgentineHolidaysMutation.isPending}
                >
                  {importArgentineHolidaysMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Importar Feriados
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isCopyDialogOpen} onOpenChange={setIsCopyDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Copy className="h-4 w-4 mr-2" />
                Copiar Año Anterior
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Copiar Feriados del Año Anterior</DialogTitle>
                <DialogDescription>
                  Copia los feriados personalizados de {selectedYear - 1} a {selectedYear}.
                  Solo se copiarán los feriados que no son nacionales.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCopyDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => copyHolidaysMutation.mutate({
                    fromYear: selectedYear - 1,
                    toYear: selectedYear,
                  })}
                  disabled={copyHolidaysMutation.isPending}
                >
                  {copyHolidaysMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Copiar Feriados
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button size="sm" onClick={() => openHolidayDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar Feriado
          </Button>
        </div>
      </div>

      {/* Filtros */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Tipo de feriado</Label>
                <Select
                  value={filters.type || 'all'}
                  onValueChange={(value) =>
                    setFilters({ ...filters, type: value === 'all' ? undefined : value as any })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="national">Nacionales</SelectItem>
                    <SelectItem value="custom">Personalizados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Estado</Label>
                <Select
                  value={
                    filters.is_closed === undefined
                      ? 'all'
                      : filters.is_closed
                      ? 'closed'
                      : 'special_hours'
                  }
                  onValueChange={(value) =>
                    setFilters({
                      ...filters,
                      is_closed:
                        value === 'all' ? undefined : value === 'closed',
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="closed">Cerrado</SelectItem>
                    <SelectItem value="special_hours">Horarios especiales</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => setFilters({})}
                  className="w-full"
                >
                  Limpiar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estadísticas */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-gray-500">Total Feriados</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.national}</div>
              <div className="text-sm text-gray-500">Nacionales</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">{stats.custom}</div>
              <div className="text-sm text-gray-500">Personalizados</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{stats.closed}</div>
              <div className="text-sm text-gray-500">Cerrado</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">{stats.specialHours}</div>
              <div className="text-sm text-gray-500">Horarios Especiales</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Leyenda */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Leyenda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded border ${HOLIDAY_COLORS.national}`}></div>
              <span className="text-sm">Feriado Nacional</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded border ${HOLIDAY_COLORS.custom}`}></div>
              <span className="text-sm">Feriado Personalizado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded border ${HOLIDAY_COLORS.closed}`}></div>
              <span className="text-sm">Cerrado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded border ${HOLIDAY_COLORS.special_hours}`}></div>
              <span className="text-sm">Horarios Especiales</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendario anual */}
      {isLoadingHolidays ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {MONTH_NAMES.map((monthName, monthIndex) => (
            <Card key={monthIndex}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-center">{monthName}</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Encabezados de días */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {DAY_NAMES.map((dayName) => (
                    <div key={dayName} className="text-xs text-center font-medium text-gray-500 p-1">
                      {dayName}
                    </div>
                  ))}
                </div>
                
                {/* Días del mes */}
                <div className="grid grid-cols-7 gap-1">
                  {generateMonthCalendar(monthIndex).map((date, index) => (
                    <div key={index} className="flex justify-center">
                      {renderCalendarDay(date)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Diálogo para crear/editar feriado */}
      <Dialog open={isHolidayDialogOpen} onOpenChange={setIsHolidayDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedDate ? 'Editar Feriado' : 'Agregar Feriado'}
            </DialogTitle>
            <DialogDescription>
              Configure los detalles del feriado para la fecha seleccionada.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivo</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ej: Día de la Independencia, Día de la Barbería, etc."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_closed"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Barbería cerrada</FormLabel>
                      <FormDescription>
                        La barbería permanecerá cerrada todo el día
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Horarios especiales - solo mostrar si no está cerrado */}
              {!form.watch('is_closed') && (
                <div className="space-y-4 border rounded-lg p-4">
                  <h4 className="font-medium">Horarios Especiales</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="custom_hours.start"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hora de apertura</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="custom_hours.end"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hora de cierre</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2">
                {selectedDate && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      if (selectedDate) {
                        deleteHolidayMutation.mutate(selectedDate);
                        setIsHolidayDialogOpen(false);
                      }
                    }}
                    disabled={deleteHolidayMutation.isPending}
                  >
                    {deleteHolidayMutation.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Eliminar
                  </Button>
                )}
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsHolidayDialogOpen(false)}
                >
                  Cancelar
                </Button>
                
                <Button
                  type="submit"
                  disabled={createOrUpdateHolidayMutation.isPending}
                >
                  {createOrUpdateHolidayMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Guardar
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};