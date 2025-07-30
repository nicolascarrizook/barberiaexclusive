import React from 'react';
// // // // // import { HolidayCalendar } from './HolidayCalendar';
// // // // // import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// // // // // import { Alert, AlertDescription } from '@/components/ui/alert';
// // // // // import { Info } from 'lucide-react';

interface HolidayCalendarExampleProps {
  barbershopId?: string;
}

/**
 * Ejemplo de implementación del HolidayCalendar
 * Demuestra cómo integrar el calendario de feriados en diferentes contextos
 */
export const HolidayCalendarExample: React.FC<HolidayCalendarExampleProps> = ({
  barbershopId = 'example-barbershop-id',
}) => {
  return (
    <div className="space-y-6">
      {/* Información del componente */}
      <Card>
        <CardHeader>
          <CardTitle>
            Calendario de Feriados - Ejemplo de Implementación
          </CardTitle>
          <CardDescription>
            Demuestra las funcionalidades completas del sistema de gestión de
            feriados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <div className="font-medium">Funcionalidades disponibles:</div>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Vista anual con 12 meses en formato grid responsivo</li>
                <li>
                  Importación automática de feriados nacionales argentinos
                  2024-2025
                </li>
                <li>
                  Gestión de feriados personalizados con formulario completo
                </li>
                <li>
                  Configuración flexible: cerrado O horarios especiales por día
                </li>
                <li>Vista previa del impacto en reservas existentes</li>
                <li>Leyenda visual clara para diferentes tipos de feriados</li>
                <li>Opción de copiar configuración del año anterior</li>
                <li>Filtros avanzados por tipo de feriado y estado</li>
                <li>Estadísticas completas de feriados del año</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Implementación del calendario */}
      <HolidayCalendar barbershopId={barbershopId} />

      {/* Información técnica */}
      <Card>
        <CardHeader>
          <CardTitle>Información Técnica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Servicios utilizados:</h4>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>
                <code>holidaysService</code> - Gestión completa de feriados y
                fechas especiales
              </li>
              <li>
                <code>special_dates</code> - Tabla de base de datos para
                almacenar feriados
              </li>
              <li>
                <code>appointments</code> - Consulta de citas afectadas por
                feriados
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-2">Tipos de feriados soportados:</h4>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>
                <span className="text-blue-600">Nacionales</span> - Feriados
                oficiales argentinos
              </li>
              <li>
                <span className="text-purple-600">Personalizados</span> - Fechas
                especiales de la barbería
              </li>
              <li>
                <span className="text-red-600">Cerrado</span> - Días sin
                atención
              </li>
              <li>
                <span className="text-orange-600">Horarios Especiales</span> -
                Días con horarios diferentes
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-2">Feriados argentinos incluidos:</h4>
            <div className="text-sm space-y-2">
              <div>
                <strong>2024:</strong> Año Nuevo, Carnaval, Día de la Memoria,
                Viernes Santo, Malvinas, Día del Trabajador, Revolución de Mayo,
                Güemes, Belgrano, Independencia, San Martín, Diversidad
                Cultural, Soberanía Nacional, Inmaculada Concepción, Navidad
              </div>
              <div>
                <strong>2025:</strong> Mismos feriados con fechas actualizadas
                para el nuevo año
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Ejemplo de uso en diferentes contextos
export const _HolidayCalendarUsageExamples = {
  // Uso básico en página de configuración
  OwnerSettings: () => (
    <div>
      <h2>Configuración de la Barbería</h2>
      <HolidayCalendar barbershopId="barbershop-123" />
    </div>
  ),

  // Uso en dashboard de administración
  AdminDashboard: () => (
    <div>
      <h2>Panel de Administración</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3>Otros controles...</h3>
        </div>
        <HolidayCalendar barbershopId="barbershop-123" />
      </div>
    </div>
  ),

  // Uso con props condicionales
  ConditionalUsage: ({ barbershopId }: { barbershopId?: string }) => (
    <div>
      {barbershopId ? (
        <HolidayCalendar barbershopId={barbershopId} />
      ) : (
        <div>Selecciona una barbería para gestionar feriados</div>
      )}
    </div>
  ),
};

export default HolidayCalendarExample;
