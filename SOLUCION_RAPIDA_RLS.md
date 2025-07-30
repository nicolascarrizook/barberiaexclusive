# 🚨 Solución Rápida para Error de RLS en Feriados

## Problema Identificado
El usuario cambió de rol `owner` a `customer`, pero sigue siendo owner de la barbería en la tabla `barbershops`. Esto causa que las políticas RLS bloqueen la inserción de feriados.

## ⚡ Solución Inmediata (Opción 1 - Recomendada)

### Ejecutar en SQL Editor de Supabase:

```sql
-- 1. Verificar el problema
SELECT 
    p.email,
    p.role as rol_actual,
    bs.name as barberia_que_posee
FROM profiles p
JOIN barbershops bs ON bs.owner_id = p.id
WHERE p.id = auth.uid();

-- 2. Corregir el rol si es owner de una barbería
UPDATE profiles 
SET 
    role = 'owner',
    updated_at = NOW()
WHERE id = auth.uid()
AND EXISTS (
    SELECT 1 FROM barbershops 
    WHERE owner_id = auth.uid()
);

-- 3. Verificar que se corrigió
SELECT 
    email,
    role,
    'ROL CORREGIDO' as status
FROM profiles 
WHERE id = auth.uid();
```

## 🔧 Solución Temporal (Opción 2 - Si no puedes cambiar roles)

### Ejecutar el archivo `temporary_rls_fix.sql` en Supabase

Este archivo crea una política más permisiva que permite a usuarios que son owners en `barbershops` gestionar feriados, independientemente de su rol en `profiles`.

## 📋 Pasos Completos

### 1. **Ejecutar diagnóstico**
```bash
# Abrir en SQL Editor de Supabase
cat fix_role_issue.sql
```

### 2. **Aplicar solución**
- **Si puedes cambiar roles**: Ejecutar el UPDATE del paso anterior
- **Si no puedes cambiar roles**: Ejecutar `temporary_rls_fix.sql`

### 3. **Probar funcionalidad**
```sql
-- Probar inserción de feriado
INSERT INTO special_dates (
    barbershop_id,
    date,
    is_holiday,
    reason
) 
SELECT 
    bs.id,
    '2024-12-25'::date,
    true,
    'Prueba de Navidad'
FROM barbershops bs
WHERE bs.owner_id = auth.uid()
LIMIT 1;
```

### 4. **Verificar éxito**
Si la inserción funciona, el problema está resuelto.

## 🔍 Investigación de Causa Raíz

Para evitar que vuelva a pasar, investigar:

1. **¿Hay triggers que cambien roles automáticamente?**
2. **¿El proceso de registro tiene bugs?**
3. **¿Hubo migración de datos reciente?**

```sql
-- Buscar usuarios con inconsistencias
SELECT 
    p.email,
    p.role,
    COUNT(bs.id) as barberías_que_posee
FROM profiles p
LEFT JOIN barbershops bs ON bs.owner_id = p.id
GROUP BY p.id, p.email, p.role
HAVING COUNT(bs.id) > 0 AND p.role != 'owner';
```

## ✅ Verificación Final

Después de aplicar cualquier solución:

1. **Recargar la aplicación**
2. **Intentar crear un feriado desde la UI**
3. **Verificar que no aparece el error de RLS**
4. **Confirmar que el feriado se guarda correctamente**

## 📞 Si Persiste el Problema

Si después de estos pasos sigue el error:

1. Verificar que el `barbershop_id` que se envía desde el frontend sea correcto
2. Confirmar que el usuario está autenticado correctamente
3. Revisar logs de Supabase para más detalles del error

---

**Nota**: La Opción 1 (corregir el rol) es la solución permanente. La Opción 2 es temporal para que puedas seguir trabajando mientras investigas la causa raíz.