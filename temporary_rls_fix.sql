-- =====================================================
-- FIX TEMPORAL PARA POLÍTICAS RLS EN SPECIAL_DATES
-- =====================================================

-- Este script crea una política más permisiva temporalmente
-- para permitir que owners que accidentalmente tienen rol 'customer'
-- puedan gestionar feriados mientras se arregla el problema de roles

-- PASO 1: Eliminar políticas existentes que están causando problemas
DROP POLICY IF EXISTS "Owners can manage special dates" ON special_dates;
DROP POLICY IF EXISTS "Barbers can manage own special dates" ON special_dates;

-- PASO 2: Crear política temporal más permisiva
-- Esta política permite gestionar feriados si:
-- 1. El usuario es owner de la barbería (rol correcto)
-- 2. O si el usuario está en la tabla barbershops como owner (incluso con rol incorrecto)
CREATE POLICY "Temporary permissive special dates policy" 
    ON special_dates FOR ALL 
    USING (
        -- Para barbershop_id especificado
        (
            barbershop_id IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM barbershops bs
                JOIN profiles p ON p.id = bs.owner_id
                WHERE bs.id = special_dates.barbershop_id
                AND bs.owner_id = auth.uid()
                -- Permitir tanto role='owner' como cualquier role si está en barbershops
                AND (p.role = 'owner' OR bs.owner_id = auth.uid())
            )
        ) OR
        -- Para barber_id especificado
        (
            barber_id IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM barbers b
                JOIN barbershops bs ON bs.id = b.barbershop_id
                JOIN profiles p ON p.id = bs.owner_id
                WHERE b.id = special_dates.barber_id
                AND (
                    -- Es el propio barbero
                    b.profile_id = auth.uid() OR
                    -- Es el owner de la barbería (independiente del rol en profiles)
                    bs.owner_id = auth.uid()
                )
            )
        )
    )
    WITH CHECK (
        -- Misma lógica para INSERT/UPDATE
        (
            barbershop_id IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM barbershops bs
                WHERE bs.id = barbershop_id
                AND bs.owner_id = auth.uid()
            )
        ) OR (
            barber_id IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM barbers b
                JOIN barbershops bs ON bs.id = b.barbershop_id
                WHERE b.id = barber_id
                AND (
                    b.profile_id = auth.uid() OR
                    bs.owner_id = auth.uid()
                )
            )
        )
    );

-- PASO 3: Verificar que la política se aplicó correctamente
SELECT 
    'POLÍTICAS ACTIVAS EN SPECIAL_DATES' as info,
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename = 'special_dates'
ORDER BY policyname;

-- PASO 4: Instrucciones para revertir después de arreglar roles
/*
-- EJECUTAR DESPUÉS DE CORREGIR LOS ROLES:

-- Eliminar política temporal
DROP POLICY IF EXISTS "Temporary permissive special dates policy" ON special_dates;

-- Restaurar políticas originales
CREATE POLICY "Owners can manage special dates" 
    ON special_dates FOR ALL 
    USING (
        (
            barbershop_id IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM barbershops bs
                JOIN profiles p ON p.id = bs.owner_id
                WHERE bs.id = special_dates.barbershop_id
                AND bs.owner_id = auth.uid()
                AND p.role = 'owner' -- Validación estricta de rol
            )
        ) OR (
            barber_id IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM barbers b
                JOIN barbershops bs ON bs.id = b.barbershop_id
                JOIN profiles p ON p.id = bs.owner_id
                WHERE b.id = special_dates.barber_id
                AND bs.owner_id = auth.uid()
                AND p.role = 'owner' -- Validación estricta de rol
            )
        )
    )
    WITH CHECK (
        -- Same logic as USING clause
    );

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
            WHERE b.id = barber_id
            AND b.profile_id = auth.uid()
        )
    );
*/