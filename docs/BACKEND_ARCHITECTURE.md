# Sistema de Gestión de Turnos para Barbería - Arquitectura Backend

## Arquitectura Backend con Supabase

### 📊 Base de Datos PostgreSQL

#### Esquema Principal

**Tablas Principales:**
- `profiles` - Perfiles de usuarios (extiende auth.users)
- `barbershops` - Información de barberías
- `barbers` - Barberos y sus configuraciones
- `services` - Servicios ofrecidos
- `appointments` - Turnos y reservas
- `payments` - Registros de pagos
- `reviews` - Reseñas y calificaciones
- `notifications` - Sistema de notificaciones
- `waiting_list` - Lista de espera
- `promotions` - Promociones y descuentos

#### Características Clave

1. **Sistema de Horarios Flexible**
   - Horarios regulares por día de la semana
   - Fechas especiales y feriados
   - Pausas configurables

2. **Prevención de Solapamientos**
   - Función `check_slot_availability()` valida disponibilidad
   - Triggers automáticos previenen conflictos
   - Validación en tiempo real

3. **Sugerencia de Turnos Alternativos**
   - Función `suggest_alternative_slots()` encuentra horarios cercanos
   - Búsqueda flexible por fechas y horarios
   - Ranking por proximidad temporal

### 🔒 Row Level Security (RLS)

**Políticas Implementadas:**
- Clientes ven solo sus turnos
- Barberos gestionan su agenda
- Dueños tienen control total de su barbería
- Acceso público a información básica

### ⚡ Edge Functions

#### `/appointments`
- `POST /create` - Crear nuevo turno
- `PATCH /update` - Actualizar estado del turno
- `POST /alternatives` - Buscar horarios alternativos
- `GET /slots` - Obtener slots disponibles
- `GET /list` - Listar turnos con filtros

#### `/notifications`
- `POST /send` - Enviar notificación individual
- `POST /process` - Procesar cola de notificaciones
- `POST /reminders` - Enviar recordatorios automáticos

#### `/analytics`
- `POST /barbershop-stats` - Estadísticas de barbería
- `POST /barber-stats` - Estadísticas por barbero
- `POST /revenue-report` - Reporte de ingresos
- `POST /track` - Tracking de eventos

### 🔄 Sistema de Notificaciones

**Canales Soportados:**
- Email (via Resend)
- SMS (via Twilio)
- Push notifications
- In-app notifications

**Tipos de Notificaciones:**
- Confirmación de turno
- Recordatorios (24h antes)
- Cancelaciones
- Reprogramaciones
- Promociones

### 📊 Funciones de Base de Datos

**Utilidades Principales:**
- `get_available_slots()` - Obtiene horarios disponibles
- `calculate_appointment_price()` - Calcula precio con promociones
- `generate_confirmation_code()` - Genera códigos únicos
- `update_barber_rating()` - Actualiza calificaciones
- `get_barbershop_stats()` - Estadísticas completas

### ⏰ Cron Jobs

**Tareas Programadas:**
- Procesamiento de notificaciones (cada 5 min)
- Envío de recordatorios (cada hora)
- Marcado de no-shows (cada 30 min)
- Limpieza de datos antiguos (diaria)
- Agregación de analytics (diaria)

### 🚀 Configuración

#### Variables de Entorno Requeridas

```env
# Supabase
SUPABASE_URL=https://[PROJECT_REF].supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Email (Resend)
RESEND_API_KEY=your-resend-api-key
FROM_EMAIL=noreply@yourdomain.com

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890
```

#### Instalación

1. **Crear proyecto en Supabase**
   ```bash
   supabase init
   supabase start
   ```

2. **Ejecutar migraciones**
   ```bash
   supabase db push database/schema.sql
   supabase db push database/functions.sql
   supabase db push database/triggers.sql
   supabase db push database/rls_policies.sql
   ```

3. **Configurar cron jobs**
   ```bash
   supabase db push database/cron_jobs.sql
   ```

4. **Desplegar Edge Functions**
   ```bash
   supabase functions deploy appointments
   supabase functions deploy notifications
   supabase functions deploy analytics
   ```

5. **Cargar datos de prueba (opcional)**
   ```bash
   supabase db push database/seed.sql
   ```

### 📱 Integración con Frontend

#### Cliente JavaScript/TypeScript

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Crear turno
const { data, error } = await supabase.functions.invoke('appointments/create', {
  body: {
    barbershop_id: 'uuid',
    barber_id: 'uuid',
    service_id: 'uuid',
    start_time: '2024-01-15T10:00:00Z',
    notes: 'Corte ejecutivo'
  }
})

// Buscar slots disponibles
const { data: slots } = await supabase.functions.invoke('appointments/slots', {
  body: {
    barber_id: 'uuid',
    date: '2024-01-15',
    service_duration: 30
  }
})
```

### 🔐 Seguridad

**Medidas Implementadas:**
- Row Level Security en todas las tablas
- Validación de permisos por rol
- Sanitización de inputs
- Rate limiting en Edge Functions
- Encriptación de datos sensibles

### 📈 Monitoreo y Analytics

**Métricas Disponibles:**
- Total de turnos por período
- Tasa de cancelación
- Ingresos por barbero/servicio
- Clientes nuevos vs recurrentes
- Rating promedio por barbero
- Servicios más populares

### 🛠️ Mantenimiento

**Tareas Recomendadas:**
- Backup diario de base de datos
- Limpieza de notificaciones antiguas
- Actualización de índices
- Monitoreo de performance
- Revisión de logs de errores