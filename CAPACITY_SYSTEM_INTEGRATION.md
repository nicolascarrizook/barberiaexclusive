# Sistema de Control de Capacidad y Prevención de Overbooking

## Descripción General

Este sistema implementa un control completo de capacidad y prevención de overbooking para la barbería, incluyendo configuración de límites, horarios pico, simulación de impacto y vista consolidada de disponibilidad.

## Componentes Implementados

### 1. Actualización de `availability.service.ts`

Se agregaron los siguientes métodos y interfaces:

#### Interfaces Nuevas
- `CapacityConfig`: Configuración de capacidad por franja horaria
- `PeakHourConfig`: Configuración de horarios pico
- `CapacityStats`: Estadísticas de capacidad y riesgo
- `AvailabilityHeatmapData`: Datos para heatmap de disponibilidad
- `OverviewStats`: Estadísticas generales de disponibilidad

#### Métodos Principales
- `setCapacityConfig()`: Configura límites de capacidad
- `getPeakHourConfig()`: Obtiene configuración de horarios pico
- `getCapacityStats()`: Calcula estadísticas y nivel de riesgo
- `getAvailabilityHeatmap()`: Genera datos para heatmap
- `getOverviewStats()`: Obtiene estadísticas generales
- `simulateCapacityImpact()`: Simula impacto de cambios de configuración

### 2. `CapacityConfiguration.tsx`

Componente para configuración de capacidad con las siguientes funcionalidades:

#### Características Principales
- **Configuración de Capacidad**: Límites por franja horaria
- **Horarios Pico**: Configuración con multiplicadores
- **Simulador de Impacto**: Vista previa de cambios antes de aplicar
- **Control de Overbooking**: Habilitación/deshabilitación con límites
- **Alertas de Configuración**: Avisos sobre configuraciones riesgosas
- **Interfaz con Tabs**: Organización clara en pestañas

#### Props
```typescript
interface CapacityConfigurationProps {
  barbershopId: string
  onConfigurationChange?: () => void
}
```

#### Funcionalidades
1. **Configuración de Capacidad**
   - Selección de franja horaria (9:00 - 20:00)
   - Definición de capacidad máxima
   - Multiplicador para horas pico
   - Control de overbooking con límites

2. **Configuración de Horarios Pico**
   - Selección de día de la semana
   - Rango horario (inicio/fin)
   - Multiplicador de capacidad

3. **Simulador de Impacto**
   - Vista previa en tiempo real
   - Cálculo de impacto porcentual
   - Recomendaciones automáticas
   - Validaciones antes de guardar

4. **Vista General**
   - Resumen de configuraciones
   - Alertas de configuración
   - Estadísticas rápidas

### 3. `AvailabilityOverview.tsx`

Componente de vista consolidada de disponibilidad con:

#### Características Principales
- **Heatmap de Disponibilidad**: Visualización por colores (verde/amarillo/rojo)
- **Navegación Temporal**: Vista por día/semana/mes
- **Estado de Barberos**: Monitoreo en tiempo real
- **Gráfico de Ocupación**: Análisis por horas del día
- **Estadísticas Clave**: Métricas de ocupación y disponibilidad
- **Filtros**: Por barbero y servicio

#### Props
```typescript
interface AvailabilityOverviewProps {
  barbershopId: string
}
```

#### Funcionalidades
1. **Heatmap de Disponibilidad**
   - Codificación por colores según nivel de ocupación
   - Vista de 12 horas (9 AM - 8 PM)
   - Navegación por fechas
   - Información detallada en hover

2. **Estado de Barberos**
   - Estado en tiempo real (disponible/ocupado/descanso)
   - Próxima cita programada
   - Porcentaje de utilización actual
   - Avatar y información visual

3. **Análisis y Métricas**
   - Gráfico de ocupación por horas
   - Barberos más ocupados
   - Estadísticas de rendimiento
   - Métricas de eficiencia

4. **Controles de Vista**
   - Selector día/semana/mes
   - Navegación anterior/siguiente
   - Filtros por barbero/servicio
   - Botón de actualización

### 4. `CapacityManagement.tsx`

Componente integrador que combina ambos componentes en una interfaz unificada.

## Instalación y Uso

### 1. Importar los Componentes

```typescript
import CapacityConfiguration from '@/components/owner/CapacityConfiguration'
import AvailabilityOverview from '@/components/owner/AvailabilityOverview'
import CapacityManagement from '@/components/owner/CapacityManagement'
```

### 2. Uso Individual

```tsx
// Vista de disponibilidad
<AvailabilityOverview barbershopId="barbershop-123" />

// Configuración de capacidad
<CapacityConfiguration 
  barbershopId="barbershop-123"
  onConfigurationChange={() => {
    // Refrescar datos cuando cambie la configuración
  }}
/>
```

### 3. Uso Integrado

```tsx
// Componente completo con ambas funcionalidades
<CapacityManagement barbershopId="barbershop-123" />
```

## Integración con Páginas Existentes

### En la Dashboard del Owner

```tsx
// src/pages/owner/Dashboard.tsx
import CapacityManagement from '@/components/owner/CapacityManagement'

const OwnerDashboard = () => {
  const barbershopId = user.barbershop?.id

  return (
    <div className="space-y-6">
      {/* Otros componentes del dashboard */}
      
      <CapacityManagement barbershopId={barbershopId} />
    </div>
  )
}
```

### Como Página Independiente

```tsx
// src/pages/owner/Capacity.tsx
import CapacityManagement from '@/components/owner/CapacityManagement'

const CapacityPage = () => {
  return (
    <div className="container mx-auto py-8">
      <CapacityManagement barbershopId={barbershopId} />
    </div>
  )
}
```

## Características Técnicas

### Responsive Design
- Totalmente responsive en móviles, tablets y desktop
- Grid adaptativo según tamaño de pantalla
- Interfaz táctil optimizada

### Manejo de Estados
- Estados de carga con spinners
- Manejo de errores con mensajes claros
- Actualizaciones en tiempo real
- Cache local para configuraciones

### Validaciones
- Validación de rangos de capacidad
- Verificación de conflictos horarios
- Alertas preventivas de configuración
- Simulación antes de aplicar cambios

### Integración con Servicios
- Conexión completa con `availability.service.ts`
- Uso de datos reales de citas y barberos
- Sincronización con horarios de la barbería
- Integración con sistema de vacaciones y breaks

## Configuraciones Recomendadas

### Capacidad Típica por Franja
- Horas normales: 3-4 citas por hora
- Horas pico: 5-6 citas por hora (con multiplicador 1.5x)
- Permitir overbooking: máximo 1-2 citas extra

### Horarios Pico Comunes
- Viernes: 17:00 - 20:00 (multiplicador 1.5x)
- Sábados: 10:00 - 18:00 (multiplicador 1.3x)
- Domingos: 10:00 - 14:00 (multiplicador 1.2x)

### Niveles de Riesgo
- **Bajo**: Ocupación < 70%
- **Medio**: Ocupación 70-90%
- **Alto**: Ocupación > 90%

## Mantenimiento y Extensiones

### Futuras Mejoras
1. Notificaciones push para alertas de capacidad
2. Integración con sistema de lista de espera
3. Análisis predictivo de demanda
4. Reportes automáticos de utilización
5. API para integración con apps móviles

### Personalización
- Colores del heatmap configurables
- Rangos horarios ajustables
- Métricas personalizables por barbería
- Exportación de datos a Excel/PDF

## Resolución de Problemas

### Problemas Comunes
1. **Datos no se actualizan**: Verificar conexión con Supabase
2. **Configuración no se guarda**: Revisar localStorage del navegador
3. **Heatmap no se muestra**: Verificar permisos de barbería
4. **Simulador no funciona**: Verificar datos de capacidad existentes

### Logs y Debugging
- Usar console del navegador para errores
- Verificar respuestas de la API en Network tab
- Revisar estado de localStorage para configuraciones
- Comprobar permisos de usuario en la base de datos

## Conclusión

Este sistema proporciona un control completo sobre la capacidad de la barbería, permitiendo una gestión eficiente de citas y prevención de overbooking. La interfaz intuitiva y las funcionalidades avanzadas mejoran significativamente la experiencia del administrador y la eficiencia operativa del negocio.