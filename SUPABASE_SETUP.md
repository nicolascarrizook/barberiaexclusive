# 🚀 Guía de Configuración de Supabase para Barbershop Booking

Esta guía te ayudará a configurar Supabase desde cero para el proyecto de gestión de turnos de barbería.

## 📋 Prerrequisitos

- Node.js v18 o superior
- npm o yarn instalado
- Cuenta gratuita en [Supabase](https://supabase.com)
- (Opcional) Supabase CLI para desarrollo local

## 🏗️ Paso 1: Crear un Proyecto en Supabase

### Opción A: Usando la Consola Web (Recomendado para comenzar)

1. **Crear cuenta y proyecto**
   - Ve a [app.supabase.com](https://app.supabase.com)
   - Crea una cuenta o inicia sesión
   - Click en "New Project"
   - Completa los campos:
     - **Project name**: `barbershop-booking` (o el nombre que prefieras)
     - **Database Password**: Genera una contraseña fuerte y guárdala
     - **Region**: Selecciona la más cercana a tus usuarios
   - Click en "Create new project" y espera ~2 minutos

2. **Obtener las credenciales**
   - Una vez creado, ve a Settings → API
   - Copia y guarda:
     - **Project URL**: `https://[tu-proyecto].supabase.co`
     - **anon public**: Esta es tu API Key pública
     - **service_role**: Esta es tu API Key privada (¡mantenla segura!)

### Opción B: Usando Supabase CLI (Para desarrollo local)

```bash
# Instalar Supabase CLI
npm install -g supabase

# Inicializar proyecto local
cd barbershop-booking
supabase init

# Iniciar Supabase local
supabase start

# Esto te dará URLs locales:
# API URL: http://localhost:54321
# GraphQL URL: http://localhost:54321/graphql/v1
# DB URL: postgresql://postgres:postgres@localhost:54322/postgres
# Studio URL: http://localhost:54323
```

## 📊 Paso 2: Ejecutar las Migraciones SQL

### Desde la Consola Web

1. Ve a SQL Editor en tu proyecto de Supabase
2. Ejecuta los scripts en este orden exacto:

#### 2.1 Schema Principal (schema.sql)
```sql
-- Copia y pega el contenido de database/schema.sql
-- Este archivo crea todas las tablas principales
```

#### 2.2 Funciones (functions.sql)
```sql
-- Copia y pega el contenido de database/functions.sql
-- Este archivo crea las funciones auxiliares
```

#### 2.3 Triggers (triggers.sql)
```sql
-- Copia y pega el contenido de database/triggers.sql
-- Este archivo configura los triggers automáticos
```

#### 2.4 Políticas RLS (rls_policies.sql)
```sql
-- Copia y pega el contenido de database/rls_policies.sql
-- Este archivo configura la seguridad a nivel de filas
```

#### 2.5 Cron Jobs (cron_jobs.sql)
```sql
-- Copia y pega el contenido de database/cron_jobs.sql
-- Este archivo configura las tareas programadas
```

#### 2.6 Datos de Prueba (seed.sql) - Opcional
```sql
-- Copia y pega el contenido de database/seed.sql
-- Solo si quieres datos de ejemplo
```

### Desde Supabase CLI

```bash
# Ejecutar todas las migraciones de una vez
supabase db push database/schema.sql
supabase db push database/functions.sql
supabase db push database/triggers.sql
supabase db push database/rls_policies.sql
supabase db push database/cron_jobs.sql

# Opcional: cargar datos de prueba
supabase db push database/seed.sql
```

## 🔒 Paso 3: Configurar Row Level Security (RLS)

RLS es crucial para la seguridad. Verifica que esté habilitado:

1. **En la consola web**
   - Ve a Authentication → Policies
   - Verifica que cada tabla tenga el ícono de escudo activado
   - Las políticas ya deberían estar aplicadas desde `rls_policies.sql`

2. **Verificar políticas activas**
   ```sql
   -- Ejecuta en SQL Editor para ver todas las políticas
   SELECT 
     schemaname,
     tablename,
     policyname,
     permissive,
     roles,
     cmd,
     qual,
     with_check
   FROM pg_policies
   WHERE schemaname = 'public'
   ORDER BY tablename, policyname;
   ```

3. **Políticas principales implementadas**
   - **profiles**: Los usuarios solo pueden ver/editar su propio perfil
   - **appointments**: Clientes ven sus turnos, barberos ven su agenda
   - **barbershops**: Información pública, solo dueños pueden editar
   - **reviews**: Clientes pueden crear, todos pueden leer

## 🔑 Paso 4: Configurar Variables de Entorno

1. **Copia el archivo de ejemplo**
   ```bash
   cp .env.example .env
   ```

2. **Edita `.env` con tus credenciales**
   ```env
   # Credenciales de Supabase (OBLIGATORIAS)
   VITE_SUPABASE_URL=https://[tu-proyecto].supabase.co
   VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui

   # Para desarrollo local con Supabase CLI
   # VITE_SUPABASE_URL=http://localhost:54321
   # VITE_SUPABASE_ANON_KEY=tu_anon_key_local

   # Entorno
   VITE_APP_ENV=development
   ```

3. **Para Edge Functions (Opcional)**
   
   Si vas a usar las Edge Functions para notificaciones, necesitarás configurar estas variables en Supabase:
   
   ```bash
   # Configurar secretos en Supabase
   supabase secrets set RESEND_API_KEY=tu_resend_api_key
   supabase secrets set FROM_EMAIL=noreply@tudominio.com
   supabase secrets set TWILIO_ACCOUNT_SID=tu_twilio_sid
   supabase secrets set TWILIO_AUTH_TOKEN=tu_twilio_token
   supabase secrets set TWILIO_PHONE_NUMBER=+1234567890
   ```

## ✅ Paso 5: Verificar la Configuración

### 5.1 Verificar Conexión

Crea un archivo `test-connection.js` en la raíz del proyecto:

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testConnection() {
  try {
    // Test 1: Verificar conexión
    const { data, error } = await supabase.from('profiles').select('count', { count: 'exact' })
    
    if (error) {
      console.error('❌ Error de conexión:', error)
      return
    }
    
    console.log('✅ Conexión exitosa a Supabase')
    
    // Test 2: Verificar autenticación
    const { data: { user } } = await supabase.auth.getUser()
    console.log('👤 Usuario actual:', user ? user.email : 'No autenticado')
    
    // Test 3: Verificar tablas
    const tables = ['profiles', 'barbershops', 'barbers', 'services', 'appointments']
    for (const table of tables) {
      const { error } = await supabase.from(table).select('*').limit(1)
      if (error) {
        console.error(`❌ Error en tabla ${table}:`, error.message)
      } else {
        console.log(`✅ Tabla ${table} accesible`)
      }
    }
    
  } catch (err) {
    console.error('❌ Error general:', err)
  }
}

testConnection()
```

### 5.2 Verificar desde la Aplicación

1. **Inicia el servidor de desarrollo**
   ```bash
   npm run dev
   # o
   yarn dev
   ```

2. **Abre la consola del navegador**
   - La aplicación debería conectarse sin errores
   - Revisa la consola para mensajes de error

3. **Prueba el registro/login**
   - Intenta crear una cuenta nueva
   - Verifica que se cree el perfil automáticamente

## 🛠️ Comandos Útiles para Desarrollo

### Supabase CLI

```bash
# Ver estado de Supabase local
supabase status

# Ver logs de la base de datos
supabase db logs

# Reiniciar base de datos local
supabase db reset

# Generar tipos TypeScript desde el schema
supabase gen types typescript --local > src/types/database.ts

# Hacer backup de la base de datos
supabase db dump -f backup.sql

# Restaurar desde backup
supabase db restore -f backup.sql
```

### Consultas SQL Útiles

```sql
-- Ver todos los usuarios registrados
SELECT * FROM auth.users;

-- Ver perfiles con sus roles
SELECT 
  p.*,
  u.email,
  u.created_at as user_created_at
FROM profiles p
JOIN auth.users u ON p.id = u.id;

-- Ver turnos del día
SELECT 
  a.*,
  c.full_name as customer_name,
  b.full_name as barber_name,
  s.name as service_name
FROM appointments a
JOIN profiles c ON a.customer_id = c.id
JOIN barbers b ON a.barber_id = b.id
JOIN services s ON a.service_id = s.id
WHERE DATE(a.start_time) = CURRENT_DATE
ORDER BY a.start_time;

-- Verificar políticas RLS
SELECT * FROM pg_policies WHERE schemaname = 'public';

-- Ver funciones creadas
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public';
```

## 🐛 Solución de Problemas Comunes

### Error: "Missing Supabase environment variables"
- Verifica que el archivo `.env` exista y tenga las variables correctas
- Reinicia el servidor de desarrollo después de cambiar `.env`

### Error: "permission denied for table"
- Verifica que RLS esté configurado correctamente
- Asegúrate de que el usuario esté autenticado
- Revisa las políticas en `rls_policies.sql`

### Error: "Invalid API key"
- Verifica que estés usando la clave `anon` correcta
- No uses la clave `service_role` en el frontend

### Las Edge Functions no funcionan
- Verifica que los secretos estén configurados en Supabase
- Revisa los logs: `supabase functions logs [nombre-funcion]`

### Los cron jobs no se ejecutan
- Los cron jobs requieren el plan Pro de Supabase
- Para desarrollo, ejecuta las tareas manualmente

## 📚 Recursos Adicionales

- [Documentación oficial de Supabase](https://supabase.com/docs)
- [Guía de RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Documentación del proyecto](./docs/BACKEND_ARCHITECTURE.md)

## 🤝 Siguiente Paso

Una vez configurado Supabase, puedes:

1. Revisar la [arquitectura del backend](./docs/BACKEND_ARCHITECTURE.md)
2. Explorar los servicios en `src/services/`
3. Probar la aplicación con datos reales
4. Configurar las Edge Functions para notificaciones

¿Necesitas ayuda? Revisa los logs de Supabase o abre un issue en el repositorio.