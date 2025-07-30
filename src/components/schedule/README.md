# Componentes de Gestión de Horarios y Calendario

Este directorio contiene los componentes para el sistema de gestión de vacaciones y feriados de la barbería.

## Componentes

### VacationRequestForm

Formulario para que los barberos soliciten días de vacaciones.

**Características:**

- Selector de rango de fechas con DateRangePicker
- Campo de texto para el motivo de la solicitud
- Vista previa de días laborables afectados
- Validación de conflictos con vacaciones existentes
- Historial de solicitudes previas del barbero
- Cancelación de solicitudes pendientes

**Uso:**

```tsx
import { VacationRequestForm } from '@/components/schedule';

function BarberDashboard() {
  return (
    <div>
      <VacationRequestForm />
    </div>
  );
}
```

### VacationApprovalPanel

Panel para que administradores gestionen las solicitudes de vacaciones.

**Características:**

- Tabla de solicitudes con filtros por estado
- Vista detallada expandible de cada solicitud
- Botones de aprobar/rechazar con comentarios
- Estadísticas de solicitudes por estado
- Indicador de impacto (citas afectadas - por implementar)
- Historial de decisiones tomadas

**Uso:**

```tsx
import { VacationApprovalPanel } from '@/components/schedule';

function AdminDashboard() {
  return (
    <div>
      <VacationApprovalPanel />
    </div>
  );
}
```

## Hook personalizado

### useTimeOff

Hook que proporciona toda la funcionalidad para manejar solicitudes de vacaciones.

**Funciones principales:**

- `requestTimeOff()` - Crear nueva solicitud
- `getRequests()` - Obtener solicitudes con filtros
- `approveRequest()` - Aprobar solicitud
- `rejectRequest()` - Rechazar solicitud
- `cancelRequest()` - Cancelar solicitud
- `checkConflicts()` - Verificar conflictos de fechas
- `calculateWorkingDays()` - Calcular días laborables

## Componentes UI adicionales

Se crearon los siguientes componentes de UI para soportar la funcionalidad:

### DateRangePicker

Selector de rango de fechas basado en el componente Calendar de shadcn/ui.

### Popover

Componente popover de shadcn/ui para mostrar contenido contextual.

### Collapsible

Componente para contenido expandible/colapsable.

## Dependencias

Estos componentes requieren las siguientes dependencias:

- `date-fns` - Para manejo de fechas (ya instalado)
- `react-day-picker` - Para el selector de calendario (incluido con shadcn/ui calendar)
- `@radix-ui/react-popover` - Para el componente Popover (ya instalado)
- `@radix-ui/react-collapsible` - Para el componente Collapsible

Para instalar la dependencia faltante:

```bash
npm install @radix-ui/react-collapsible
```

## Estados y Permisos

- **Barberos**: Pueden solicitar vacaciones y ver su historial
- **Administradores**: Pueden aprobar/rechazar solicitudes y ver todas las solicitudes
- **Estados de solicitud**: pending, approved, rejected, cancelled

### HolidayCalendar

Calendario anual completo para gestionar feriados y fechas especiales de la barbería.

**Características:**

- Vista anual con 12 meses en formato grid
- Importación automática de feriados nacionales argentinos 2024-2025
- Gestión de feriados personalizados
- Configuración por día: cerrado O horarios especiales
- Vista previa del impacto en reservas existentes
- Leyenda visual clara (feriado nacional, local, cerrado, horario especial)
- Opción de copiar configuración del año anterior
- Filtros por tipo de feriado y estado
- Estadísticas de feriados del año
- Responsive design para todos los dispositivos

**Uso:**

```tsx
import { HolidayCalendar } from '@/components/schedule';

function OwnerSettings() {
  return (
    <div>
      <HolidayCalendar barbershopId={barbershopId} />
    </div>
  );
}
```

**Props:**

- `barbershopId`: ID de la barbería (requerido)

**Servicios relacionados:**

- `holidaysService` - Servicio principal para gestionar feriados y fechas especiales
- Funciones para cargar feriados argentinos automáticamente
- Integración con tabla `special_dates` de la base de datos

## Servicios

### holidaysService

Servicio completo para gestionar feriados argentinos y fechas especiales personalizadas.

**Funciones principales:**

- `getHolidaysByYear()` - Obtener feriados de un año específico
- `getFilteredHolidays()` - Obtener feriados con filtros
- `createOrUpdateHoliday()` - Crear o actualizar un feriado
- `getHolidayByDate()` - Obtener feriado específico por fecha
- `deleteHolidayByDate()` - Eliminar feriado por fecha
- `importArgentineHolidays()` - Importar feriados nacionales argentinos
- `copyHolidaysFromPreviousYear()` - Copiar feriados del año anterior
- `getAffectedAppointments()` - Obtener citas afectadas por un feriado
- `getAvailableArgentineHolidays()` - Lista de feriados argentinos disponibles
- `getHolidayStats()` - Estadísticas de feriados para un año

**Tipos de datos:**

- `Holiday` - Interfaz principal para feriados
- `HolidayCustomHours` - Configuración de horarios especiales
- `HolidayFilter` - Filtros para consultas
- `ArgentineHoliday` - Feriados nacionales argentinos

## TODOs

### Vacaciones

1. Implementar método en `appointmentsService` para obtener citas afectadas por rango de fechas
2. Agregar notificaciones automáticas al barbero cuando se aprueba/rechaza una solicitud
3. Implementar cancelación automática de citas cuando se aprueban vacaciones
4. Agregar validación de días máximos de vacaciones por año
5. Implementar reportes de vacaciones por período

### Feriados

1. Integrar con sistema de notificaciones para avisar cambios en feriados
2. Implementar validación automática de conflictos con citas existentes
3. Añadir funcionalidad de reprogramación masiva de citas afectadas
4. Crear sistema de plantillas de horarios especiales frecuentes
5. Implementar sincronización con calendarios externos (Google Calendar, etc.)
6. Agregar soporte para feriados provinciales específicos
