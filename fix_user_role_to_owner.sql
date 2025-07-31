-- Script para corregir el problema de rol de usuario
-- Ejecutar este script en Supabase SQL Editor

-- =====================================================
-- PASO 1: Verificar el estado actual del usuario
-- =====================================================
SELECT 
    'Estado Actual del Usuario' as info,
    p.id,
    p.email,
    p.role as rol_actual,
    p.full_name,
    CASE 
        WHEN p.role = 'owner' THEN '✅ Rol correcto'
        WHEN p.role = 'cliente' THEN '❌ Rol incorrecto - debe ser owner'
        ELSE '⚠️ Rol desconocido: ' || p.role
    END as estado
FROM profiles p
WHERE p.id = auth.uid();

-- =====================================================
-- PASO 2: Actualizar el rol a owner
-- =====================================================
UPDATE profiles 
SET role = 'owner' 
WHERE id = auth.uid()
RETURNING 
    'Usuario actualizado' as info,
    id, 
    email, 
    role as nuevo_rol;

-- =====================================================
-- PASO 3: Verificar barbershops asociadas
-- =====================================================
SELECT 
    'Barbershops del Usuario' as info,
    b.id as barbershop_id,
    b.name as barbershop_name,
    b.owner_id,
    CASE 
        WHEN b.owner_id = auth.uid() THEN '✅ Es owner de esta barbershop'
        ELSE '❌ NO es owner - owner actual: ' || b.owner_id
    END as estado_ownership
FROM barbershops b
LEFT JOIN profiles p ON p.id = b.owner_id
WHERE b.owner_id = auth.uid() OR p.id = auth.uid();

-- =====================================================
-- PASO 4: Si no tienes barbershop asignada, ejecuta esto
-- =====================================================
-- NOTA: Solo ejecutar si el paso 3 no muestra ninguna barbershop donde seas owner

-- Primero, ver todas las barbershops disponibles
SELECT 
    'Barbershops Disponibles' as info,
    b.id,
    b.name,
    b.owner_id,
    p.email as owner_email,
    p.full_name as owner_name
FROM barbershops b
LEFT JOIN profiles p ON p.id = b.owner_id
ORDER BY b.created_at DESC;

-- Luego, actualizar la barbershop deseada (reemplazar 'ID_DE_BARBERSHOP' con el ID real)
/*
UPDATE barbershops 
SET owner_id = auth.uid() 
WHERE id = 'ID_DE_BARBERSHOP'
RETURNING 
    'Barbershop actualizada' as info,
    id, 
    name, 
    owner_id as nuevo_owner_id;
*/

-- =====================================================
-- PASO 5: Verificación final
-- =====================================================
-- Ejecutar después de los cambios para confirmar que todo está correcto
SELECT 
    'Verificación Final' as info,
    p.id as user_id,
    p.email,
    p.role,
    b.id as barbershop_id,
    b.name as barbershop_name,
    CASE 
        WHEN p.role = 'owner' AND b.owner_id = p.id THEN '✅ Todo correcto - puedes gestionar feriados'
        WHEN p.role = 'owner' AND b.owner_id IS NULL THEN '⚠️ Eres owner pero no tienes barbershop asignada'
        WHEN p.role != 'owner' THEN '❌ El rol no es owner'
        ELSE '❌ Configuración incorrecta'
    END as estado_final
FROM profiles p
LEFT JOIN barbershops b ON b.owner_id = p.id
WHERE p.id = auth.uid();

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================
-- 1. Después de ejecutar estos cambios, cierra sesión y vuelve a iniciar sesión
-- 2. Los cambios de rol pueden tardar unos segundos en propagarse
-- 3. Si sigues teniendo problemas, verifica que las políticas RLS estén habilitadas