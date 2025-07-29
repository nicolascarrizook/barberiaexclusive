# Flujo de Onboarding de Barberos

## Resumen

El sistema permite a los dueños de barberías agregar barberos de dos formas:
1. **Por email**: Envía una invitación al email del barbero
2. **Manual**: Genera un código de acceso de 6 caracteres

## Flujo Completo

### 1. Dueño crea la invitación

**Ruta**: `/owner/barbers` → Click en "Agregar barbero"

El dueño puede elegir entre:
- **Invitar por email**: Ingresa email y nombre del barbero
- **Crear acceso manual**: Completa el perfil del barbero y genera un código

Ejemplo de código generado: **739595**

### 2. Barbero accede al enlace

**URL generada**: `http://localhost:5175/barber/onboarding?code=739595`

El barbero puede:
- Usar el enlace directo con el código
- Ir a `/barber/onboarding` e ingresar el código manualmente

### 3. Proceso de registro

El barbero pasa por 3 pasos:

#### Paso 1: Autenticación
- Si no tiene cuenta → Se registra con email y contraseña
- Si ya tiene cuenta → Inicia sesión

#### Paso 2: Validar código
- Ingresa o confirma el código de 6 caracteres
- El sistema valida el código y lo asocia a la barbería

#### Paso 3: Completar perfil
- Actualiza su nombre completo
- Agrega teléfono (opcional)
- Escribe una biografía (opcional)

### 4. Finalización

Una vez completado:
- El usuario recibe el rol "barber"
- Se crea su registro en la tabla `barbers`
- Se actualiza la invitación como "accepted"
- Es redirigido a su dashboard de barbero

## Estructura de datos

### Tablas involucradas:
- `barber_invitations`: Almacena todas las invitaciones
- `provisional_barbers`: Datos prellenados para invitaciones manuales
- `profiles`: Perfil del usuario
- `barbers`: Registro del barbero en la barbería

### Estados de invitación:
- `pending`: Invitación creada, esperando ser reclamada
- `accepted`: Invitación aceptada exitosamente
- `expired`: Invitación expirada (30 días)
- `cancelled`: Invitación cancelada por el dueño

## Componentes principales

- `/src/pages/barber/Onboarding.tsx`: Página principal del flujo
- `/src/components/barber/InvitationCodeForm.tsx`: Formulario de código
- `/src/components/barber/BarberProfileSetup.tsx`: Configuración de perfil
- `/src/components/owner/BarberCreationDialog.tsx`: Diálogo de creación para dueños

## Testing

Para probar el flujo completo:

1. Inicia sesión como dueño
2. Ve a "Gestionar barberos"
3. Crea un barbero manual
4. Copia el código generado
5. Abre una ventana incógnito
6. Ve a la URL con el código
7. Regístrate como nuevo usuario
8. Completa el flujo de onboarding

El barbero ahora aparecerá en la lista de barberos del dueño y podrá acceder a su dashboard.