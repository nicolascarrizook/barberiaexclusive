-- =====================================================
-- SCRIPT PARA INVESTIGAR Y RESOLVER EL PROBLEMA DE ROLES
-- =====================================================

-- PASO 1: Verificar el estado actual del usuario
SELECT 
    'ESTADO ACTUAL DEL USUARIO' as info,
    id,
    email,
    full_name,
    role,
    is_active,
    created_at,
    updated_at
FROM profiles 
WHERE id = auth.uid();

-- PASO 2: Verificar si el usuario es owner de alguna barbería
SELECT 
    'BARBERÍAS DONDE ES OWNER' as info,
    bs.id as barbershop_id,
    bs.name as barbershop_name,
    bs.owner_id,
    bs.is_active,
    bs.created_at
FROM barbershops bs
WHERE bs.owner_id = auth.uid();

-- PASO 3: Verificar si el usuario está registrado como barbero
SELECT 
    'REGISTRO COMO BARBERO' as info,
    b.id as barber_id,
    b.full_name,
    b.profile_id,
    bs.name as barbershop_name,
    b.is_active
FROM barbers b
JOIN barbershops bs ON bs.id = b.barbershop_id
WHERE b.profile_id = auth.uid();

-- PASO 4: Buscar inconsistencias (usuarios que son owners pero tienen rol customer)
SELECT 
    'INCONSISTENCIAS DETECTADAS' as info,
    p.id,
    p.email,
    p.role as current_role,
    'DEBERÍA SER OWNER' as should_be_role,
    bs.name as owns_barbershop
FROM profiles p
JOIN barbershops bs ON bs.owner_id = p.id
WHERE p.role != 'owner'
ORDER BY p.email;

-- PASO 5: FIX - Actualizar rol a owner si tiene barberías
-- EJECUTAR SOLO SI CONFIRMAS QUE ES CORRECTO
/*
UPDATE profiles 
SET 
    role = 'owner',
    updated_at = NOW()
WHERE id IN (
    SELECT p.id 
    FROM profiles p
    JOIN barbershops bs ON bs.owner_id = p.id
    WHERE p.role != 'owner'
)
AND id = auth.uid(); -- Solo actualizar el usuario actual por seguridad
*/

-- PASO 6: Verificar el resultado después del fix
/*
SELECT 
    'DESPUÉS DEL FIX' as info,
    p.id,
    p.email,
    p.role,
    bs.name as barbershop_name
FROM profiles p
LEFT JOIN barbershops bs ON bs.owner_id = p.id
WHERE p.id = auth.uid();
*/

-- PASO 7: Probar inserción de feriado después del fix
/*
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
    'Prueba después del fix de rol'
FROM barbershops bs
WHERE bs.owner_id = auth.uid()
LIMIT 1;
*/

-- NOTA: Descomenta las secciones marcadas con /* */ después de verificar
-- que todo está correcto y que efectivamente el usuario debería ser owner.