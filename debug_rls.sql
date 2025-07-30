-- Script de diagnóstico para el problema de RLS en special_dates
-- Ejecutar en el SQL Editor de Supabase

-- 1. Verificar el usuario actual y su información
SELECT 
    auth.uid() as current_user_id,
    auth.email() as current_email;

-- 2. Verificar el perfil del usuario actual
SELECT 
    id,
    email,
    full_name,
    role,
    is_active
FROM profiles 
WHERE id = auth.uid();

-- 3. Verificar las barberías donde el usuario es owner
SELECT 
    id,
    name,
    owner_id,
    is_active
FROM barbershops 
WHERE owner_id = auth.uid();

-- 4. Verificar si el usuario tiene alguna relación con barberías
SELECT 
    bs.id as barbershop_id,
    bs.name as barbershop_name,
    bs.owner_id,
    p.email as owner_email,
    p.role as owner_role
FROM barbershops bs
JOIN profiles p ON p.id = bs.owner_id
WHERE bs.owner_id = auth.uid() OR auth.uid() IN (
    SELECT b.profile_id 
    FROM barbers b 
    WHERE b.barbershop_id = bs.id
);

-- 5. Probar la política de RLS manualmente
-- Reemplazar 'BARBERSHOP_ID_AQUI' con el ID real de la barbería
DO $$
DECLARE
    barbershop_uuid UUID := 'BARBERSHOP_ID_AQUI'::UUID; -- CAMBIAR POR EL ID REAL
    test_date DATE := '2024-12-25';
    current_user_id UUID := auth.uid();
BEGIN
    -- Verificar si el usuario puede insertar
    RAISE NOTICE 'Usuario actual: %', current_user_id;
    RAISE NOTICE 'Barbershop ID: %', barbershop_uuid;
    
    -- Verificar la condición de la política RLS
    IF EXISTS (
        SELECT 1 FROM barbershops bs
        WHERE bs.id = barbershop_uuid
        AND bs.owner_id = current_user_id
    ) THEN
        RAISE NOTICE 'Usuario ES owner de la barbería - Debería poder insertar';
    ELSE
        RAISE NOTICE 'Usuario NO es owner de la barbería - Por eso falla RLS';
    END IF;
END $$;

-- 6. Verificar políticas RLS activas en special_dates
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
WHERE tablename = 'special_dates'
ORDER BY policyname;

-- 7. Intentar inserción de prueba (ajustar barbershop_id)
-- NOTA: Comentar/descomentar según necesites
/*
INSERT INTO special_dates (
    barbershop_id,
    date,
    is_holiday,
    reason
) VALUES (
    'BARBERSHOP_ID_AQUI'::UUID, -- CAMBIAR POR EL ID REAL
    '2024-12-25',
    true,
    'Prueba de Navidad'
);
*/