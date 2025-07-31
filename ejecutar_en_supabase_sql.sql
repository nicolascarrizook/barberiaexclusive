-- =====================================================
-- SOLUCIÓN PARA ERROR RLS AL GUARDAR FERIADOS
-- Ejecutar este script completo en Supabase SQL Editor
-- =====================================================

-- Paso 1: Verificar el estado actual de las políticas
SELECT 
    '🔍 ANTES - Políticas actuales:' as info,
    polname as policy_name,
    CASE polcmd 
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'ALL'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        ELSE polcmd::text
    END as command
FROM pg_policy
WHERE polrelid = 'special_dates'::regclass;

-- Paso 2: Eliminar políticas existentes
DROP POLICY IF EXISTS "Anyone can view special dates" ON special_dates;
DROP POLICY IF EXISTS "Owners can manage special dates" ON special_dates;
DROP POLICY IF EXISTS "Barbers can manage own special dates" ON special_dates;

-- Paso 3: Crear las políticas correctas

-- Política 1: Todos pueden VER los feriados
CREATE POLICY "Anyone can view special dates" 
    ON special_dates FOR SELECT 
    USING (true);

-- Política 2: Los OWNERS pueden gestionar (crear, editar, eliminar) feriados
CREATE POLICY "Owners can manage special dates" 
    ON special_dates FOR ALL 
    USING (
        (
            barbershop_id IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM barbershops bs
                WHERE bs.id = special_dates.barbershop_id
                AND bs.owner_id = auth.uid()
            )
        ) OR (
            barber_id IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM barbers b
                JOIN barbershops bs ON bs.id = b.barbershop_id
                WHERE b.id = special_dates.barber_id
                AND bs.owner_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        (
            barbershop_id IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM barbershops bs
                WHERE bs.id = special_dates.barbershop_id
                AND bs.owner_id = auth.uid()
            )
        ) OR (
            barber_id IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM barbers b
                JOIN barbershops bs ON bs.id = b.barbershop_id
                WHERE b.id = special_dates.barber_id
                AND bs.owner_id = auth.uid()
            )
        )
    );

-- Política 3: Los BARBEROS pueden gestionar sus propias fechas especiales
CREATE POLICY "Barbers can manage own special dates" 
    ON special_dates FOR ALL 
    USING (
        barber_id IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM barbers b
            WHERE b.id = special_dates.barber_id
            AND b.profile_id = auth.uid()
        )
    )
    WITH CHECK (
        barber_id IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM barbers b
            WHERE b.id = special_dates.barber_id
            AND b.profile_id = auth.uid()
        )
    );

-- Paso 4: Verificar las nuevas políticasL
SELECT 
    '✅ DESPUÉS - Políticas creadas:' as info,
    polname as policy_name,
    CASE polcmd 
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'ALL (INSERT, UPDATE, DELETE)'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        ELSE polcmd::text
    END as command
FROM pg_policy
WHERE polrelid = 'special_dates'::regclass
ORDER BY polname;

-- Paso 5: Verificar que RLS esté habilitado en la tabla
SELECT 
    '🔒 Estado de RLS:' as info,
    schemaname,
    tablename,
    rowsecurity,
    CASE 
        WHEN rowsecurity THEN '✅ RLS Habilitado'
        ELSE '❌ RLS Deshabilitado - EJECUTAR: ALTER TABLE special_dates ENABLE ROW LEVEL SECURITY;'
    END as status
FROM pg_tables
WHERE tablename = 'special_dates';

-- Paso 6: Verificar los permisos del usuario actual
SELECT 
    '👤 Tu usuario y permisos:' as info,
    p.id as user_id,
    p.email,
    p.role,
    b.id as barbershop_id,
    b.name as barbershop_name,
    CASE 
        WHEN p.role = 'owner' AND b.id IS NOT NULL THEN '✅ Puedes gestionar feriados'
        WHEN p.role = 'owner' AND b.id IS NULL THEN '⚠️ Eres owner pero no tienes barbershop'
        WHEN p.role = 'barber' THEN '✅ Puedes gestionar tus días libres'
        ELSE '❌ No tienes permisos para gestionar feriados'
    END as permission_status
FROM profiles p
LEFT JOIN barbershops b ON b.owner_id = p.id
WHERE p.id = auth.uid();

-- =====================================================
-- RESULTADO ESPERADO:
-- - Deberías ver 3 políticas creadas
-- - RLS debe estar habilitado
-- - Tu usuario debe mostrar "✅ Puedes gestionar feriados"
-- =====================================================