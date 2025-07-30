import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AlertTriangle, 
  Calendar, 
  Clock, 
  Users, 
  CalendarOff,
  ChevronRight,
  Info
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface ScheduleConflict {
  id: string;
  type: 'overlap' | 'capacity' | 'holiday' | 'timeoff' | 'break';
  severity: 'high' | 'medium' | 'low';
  date: string;
  time?: string;
  barberId?: string;
  barberName?: string;
  description: string;
  affectedAppointments?: number;
  resolution?: string;
}

interface ConflictWarningsProps {
  conflicts: ScheduleConflict[];
  onResolve?: (conflictId: string) => void;
  className?: string;
}

export function ConflictWarnings({ conflicts, onResolve, className }: ConflictWarningsProps) {
  if (!conflicts || conflicts.length === 0) {
    return null;
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'border-red-200 bg-red-50';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50';
      case 'low':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'low':
        return <Info className="h-4 w-4 text-blue-600" />;
      default:
        return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      high: "destructive",
      medium: "secondary",
      low: "outline"
    };

    const labels: Record<string, string> = {
      high: "Alta",
      medium: "Media",
      low: "Baja"
    };

    return (
      <Badge variant={variants[severity] || "outline"}>
        {labels[severity] || severity}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'overlap':
        return <Clock className="h-4 w-4" />;
      case 'capacity':
        return <Users className="h-4 w-4" />;
      case 'holiday':
        return <Calendar className="h-4 w-4" />;
      case 'timeoff':
        return <CalendarOff className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      overlap: "Superposición de horarios",
      capacity: "Capacidad excedida",
      holiday: "Conflicto con feriado",
      timeoff: "Conflicto con vacaciones",
      break: "Conflicto con descanso"
    };
    return labels[type] || "Conflicto";
  };

  // Group conflicts by severity
  const highSeverityConflicts = conflicts.filter(c => c.severity === 'high');
  const mediumSeverityConflicts = conflicts.filter(c => c.severity === 'medium');
  const lowSeverityConflicts = conflicts.filter(c => c.severity === 'low');

  return (
    <div className={`space-y-4 ${className || ''}`}>
      {/* Summary Alert */}
      {highSeverityConflicts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Conflictos Críticos Detectados</AlertTitle>
          <AlertDescription>
            Se encontraron {highSeverityConflicts.length} conflictos de alta prioridad que requieren atención inmediata.
          </AlertDescription>
        </Alert>
      )}

      {/* Conflicts List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Conflictos de Horarios
          </CardTitle>
          <CardDescription>
            {conflicts.length} conflicto{conflicts.length !== 1 ? 's' : ''} detectado{conflicts.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {conflicts.map((conflict) => (
            <div
              key={conflict.id}
              className={`p-4 rounded-lg border-2 ${getSeverityColor(conflict.severity)}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    {getSeverityIcon(conflict.severity)}
                    <span className="font-medium flex items-center gap-2">
                      {getTypeIcon(conflict.type)}
                      {getTypeLabel(conflict.type)}
                    </span>
                    {getSeverityBadge(conflict.severity)}
                  </div>

                  <div className="text-sm space-y-1">
                    <p>{conflict.description}</p>
                    
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(conflict.date), "d 'de' MMMM", { locale: es })}
                      </span>
                      
                      {conflict.time && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {conflict.time}
                        </span>
                      )}
                      
                      {conflict.barberName && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {conflict.barberName}
                        </span>
                      )}
                    </div>

                    {conflict.affectedAppointments && conflict.affectedAppointments > 0 && (
                      <p className="text-sm font-medium text-red-600">
                        {conflict.affectedAppointments} cita{conflict.affectedAppointments !== 1 ? 's' : ''} afectada{conflict.affectedAppointments !== 1 ? 's' : ''}
                      </p>
                    )}

                    {conflict.resolution && (
                      <p className="text-sm italic">
                        Sugerencia: {conflict.resolution}
                      </p>
                    )}
                  </div>
                </div>

                {onResolve && (
                  <Button
                    size="sm"
                    variant={conflict.severity === 'high' ? 'destructive' : 'outline'}
                    onClick={() => onResolve(conflict.id)}
                  >
                    Resolver
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// Example usage component for demonstration
export function ConflictWarningsExample() {
  const exampleConflicts: ScheduleConflict[] = [
    {
      id: '1',
      type: 'overlap',
      severity: 'high',
      date: '2024-02-15',
      time: '10:00 - 11:00',
      barberId: 'barber1',
      barberName: 'Carlos Mendoza',
      description: 'Dos citas programadas al mismo tiempo para el mismo barbero',
      affectedAppointments: 2,
      resolution: 'Reprogramar una de las citas o asignar a otro barbero'
    },
    {
      id: '2',
      type: 'capacity',
      severity: 'medium',
      date: '2024-02-16',
      time: '15:00',
      description: 'La capacidad máxima será excedida en este horario (5/4 citas)',
      affectedAppointments: 1,
      resolution: 'Aumentar la capacidad temporal o redistribuir las citas'
    },
    {
      id: '3',
      type: 'holiday',
      severity: 'high',
      date: '2024-02-20',
      description: 'Hay 8 citas programadas para un día feriado (Carnaval)',
      affectedAppointments: 8,
      resolution: 'Contactar a los clientes para reprogramar'
    },
    {
      id: '4',
      type: 'timeoff',
      severity: 'low',
      date: '2024-02-25',
      barberId: 'barber2',
      barberName: 'Ana García',
      description: 'Solicitud de vacaciones pendiente de aprobación con citas programadas',
      affectedAppointments: 3,
      resolution: 'Aprobar o rechazar la solicitud antes del 20 de febrero'
    }
  ];

  const handleResolve = (conflictId: string) => {
    // Here you would implement the resolution logic
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <ConflictWarnings 
        conflicts={exampleConflicts} 
        onResolve={handleResolve}
      />
    </div>
  );
}