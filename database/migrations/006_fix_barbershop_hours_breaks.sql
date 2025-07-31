-- Migration: Fix barbershop hours - Remove break columns
-- Version: 006
-- Date: 2025-01-30
-- Description: Removes break_start and break_end from barbershop_hours as breaks should be individual per barber

-- =====================================================
-- PASO 1: ELIMINAR COLUMNAS DE DESCANSO
-- =====================================================

-- Eliminar las columnas de descanso de barbershop_hours
ALTER TABLE barbershop_hours 
DROP COLUMN IF EXISTS break_start,
DROP COLUMN IF EXISTS break_end;

-- =====================================================
-- PASO 2: ACTUALIZAR FUNCIÓN get_effective_barbershop_hours
-- =====================================================

-- Recrear la función sin las columnas de descanso
CREATE OR REPLACE FUNCTION get_effective_barbershop_hours(
    p_barbershop_id UUID,
    p_day_of_week day_of_week
)
RETURNS TABLE (
    is_closed BOOLEAN,
    open_time TIME,
    close_time TIME,
    is_default BOOLEAN
) AS $$
BEGIN
    -- Primero buscar horario específico de la barbería
    RETURN QUERY
    SELECT 
        bh.is_closed,
        bh.open_time,
        bh.close_time,
        false as is_default
    FROM barbershop_hours bh
    WHERE bh.barbershop_id = p_barbershop_id
    AND bh.day_of_week = p_day_of_week;
    
    -- Si no se encuentra, buscar horario por defecto
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            bh.is_closed,
            bh.open_time,
            bh.close_time,
            true as is_default
        FROM barbershop_hours bh
        WHERE bh.barbershop_id IS NULL
        AND bh.day_of_week = p_day_of_week;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PASO 3: ACTUALIZAR DATOS POR DEFECTO
-- =====================================================

-- Actualizar los horarios por defecto del sistema (sin descansos)
DELETE FROM barbershop_hours WHERE barbershop_id IS NULL;

INSERT INTO barbershop_hours (barbershop_id, day_of_week, is_closed, open_time, close_time)
VALUES 
    (NULL, 'monday', false, '09:00', '20:00'),
    (NULL, 'tuesday', false, '09:00', '20:00'),
    (NULL, 'wednesday', false, '09:00', '20:00'),
    (NULL, 'thursday', false, '09:00', '20:00'),
    (NULL, 'friday', false, '09:00', '20:00'),
    (NULL, 'saturday', false, '10:00', '18:00'),
    (NULL, 'sunday', true, NULL, NULL);

-- =====================================================
-- PASO 4: ACTUALIZAR COMENTARIOS
-- =====================================================

COMMENT ON TABLE barbershop_hours IS 'Horarios de operación de las barberías. Define únicamente horarios de apertura y cierre. Los descansos son individuales por barbero.';

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

DO $$
BEGIN
    -- Verificar que las columnas fueron eliminadas
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'barbershop_hours' 
        AND column_name IN ('break_start', 'break_end')
    ) THEN
        RAISE WARNING 'Las columnas de descanso aún existen en barbershop_hours';
    ELSE
        RAISE NOTICE 'Migración completada exitosamente: columnas de descanso eliminadas';
    END IF;
END $$;

-- =====================================================
-- NOTA DE ROLLBACK
-- =====================================================
-- Para revertir esta migración:
-- ALTER TABLE barbershop_hours 
-- ADD COLUMN break_start TIME,
-- ADD COLUMN break_end TIME;
-- 
-- Y restaurar la función get_effective_barbershop_hours original