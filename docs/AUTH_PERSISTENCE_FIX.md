# Solución de Persistencia de Autenticación

## 🔧 Problema Solucionado

Al presionar F5 (refresh), el usuario perdía su rol y quedaba como "cliente" debido a que:
1. El token de autenticación no se persistía correctamente
2. El perfil no se cargaba a tiempo
3. No había mecanismos de fallback para obtener el rol

## ✅ Solución Implementada

### 1. **Configuración de Supabase Client** (`/src/lib/supabase.ts`)
- ✅ `persistSession: true` - Mantiene la sesión en localStorage
- ✅ `autoRefreshToken: true` - Refresca automáticamente los tokens
- ✅ `flowType: 'pkce'` - Más seguro para aplicaciones SPA

### 2. **Sistema de Caché de Perfil** (`/src/contexts/AuthContext.tsx`)
- **Caché en localStorage** con expiración de 1 hora
- **Carga desde caché** cuando la red falla
- **Reintento automático** hasta 2 veces con backoff exponencial
- **Limpieza de caché** al cerrar sesión

### 3. **Extracción de Rol desde JWT** (`/src/hooks/useAuth.ts`)
El sistema ahora busca el rol en múltiples lugares:
1. **Perfil de base de datos** (prioridad)
2. **user_metadata del JWT** (fallback 1)
3. **app_metadata del JWT** (fallback 2)
4. **'customer' por defecto** (último recurso)

### 4. **Auth Service Mejorado** (`/src/services/auth.service.ts`)
- Crea un perfil mínimo desde JWT cuando la base de datos falla
- Mejor manejo de errores con logs detallados
- Extracción de rol desde múltiples fuentes

### 5. **Utilidades de Debugging** (`/src/utils/authDebugger.ts`)
En desarrollo, puedes usar en la consola:
```javascript
// Ver estado actual de autenticación
await window.authDebugger.logAuthState()

// Intentar recuperar sesión
await window.authDebugger.recoverAuthState()

// Limpiar todo el almacenamiento de auth
await window.authDebugger.clearAuthStorage()

// Forzar refresh de sesión
await window.authDebugger.forceRefreshSession()
```

## 🚀 Cómo Funciona Ahora

1. **Al cargar la página**:
   - Supabase carga la sesión desde localStorage
   - Se intenta cargar el perfil desde la base de datos
   - Si falla, se usa el caché local (1 hora de validez)
   - Si no hay caché, se extrae el rol del JWT
   - En último caso, se asigna rol 'customer'

2. **Durante la sesión**:
   - Los tokens se refrescan automáticamente
   - El perfil se cachea después de cada carga exitosa
   - Los cambios de auth se sincronizan entre pestañas

3. **Al refrescar (F5)**:
   - La sesión persiste desde localStorage
   - El perfil se carga desde caché mientras se obtiene uno nuevo
   - El rol se mantiene incluso si la red falla

## 🛠️ Solución de Problemas

### Si el usuario sigue perdiendo su rol:

1. **Verificar en consola** (modo desarrollo):
```javascript
await window.authDebugger.logAuthState()
```

2. **Intentar recuperación automática**:
```javascript
await window.authDebugger.recoverAuthState()
```

3. **Como último recurso, limpiar y volver a iniciar sesión**:
```javascript
await window.authDebugger.clearAuthStorage()
// Luego recargar la página y volver a iniciar sesión
```

### Verificar que el rol esté en el JWT:
En Supabase Dashboard:
1. Ir a Authentication → Users
2. Buscar el usuario
3. Verificar que en `raw_user_meta_data` o `raw_app_metadata` esté el campo `role`

## 📊 Mejoras Logradas

- ✅ **Persistencia completa** - El rol se mantiene al refrescar
- ✅ **Resistencia a fallos de red** - Funciona offline con caché
- ✅ **Recuperación automática** - Reintentos inteligentes
- ✅ **Debugging mejorado** - Herramientas para diagnosticar problemas
- ✅ **Sincronización entre pestañas** - Estado consistente

## 🔒 Seguridad

- Los tokens se almacenan de forma segura en localStorage
- El caché de perfil expira después de 1 hora
- Los roles desde JWT son solo fallback, la fuente principal es la base de datos
- En producción, las herramientas de debugging están deshabilitadas