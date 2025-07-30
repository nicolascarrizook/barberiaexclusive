-- Rollback Migration: Fix Scheduling Architecture
-- Version: 005_rollback
-- Date: 2025-01-30
-- Description: Reverts changes from migration 005 if needed

-- =====================================================
-- PASO 1: RESTAURAR TABLA BARBERSHOP_HOURS ORIGINAL
-- =====================================================

-- Renombrar la tabla actual a temporal
ALTER TABLE barbershop_hours RENAME TO barbershop_hours_new;

-- Restaurar la tabla antigua (si existe)
ALTER TABLE barbershop_hours_old RENAME TO barbershop_hours;

-- Si no existe la tabla antigua, crear una nueva con las columnas de break
CREATE TABLE IF NOT EXISTS barbershop_hours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    day_of_week day_of_week NOT NULL,
    is_closed BOOLEAN DEFAULT false,
    open_time TIME,
    close_time TIME,
    break_start TIME,
    break_end TIME,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(barbershop_id, day_of_week)
);

-- Copiar datos de vuelta incluyendo los breaks desde barber_schedules
INSERT INTO barbershop_hours (id, barbershop_id, day_of_week, is_closed, open_time, close_time, break_start, break_end, created_at, updated_at)
SELECT 
    bh.id,
    bh.barbershop_id,
    bh.day_of_week,
    bh.is_closed,
    bh.open_time,
    bh.close_time,
    -- Tomar el break del primer barbero activo como referencia
    (SELECT bs.break_start FROM barber_schedules bs 
     JOIN barbers b ON bs.barber_id = b.id 
     WHERE b.barbershop_id = bh.barbershop_id 
     AND bs.day_of_week = bh.day_of_week 
     AND b.is_active = true 
     LIMIT 1),
    (SELECT bs.break_end FROM barber_schedules bs 
     JOIN barbers b ON bs.barber_id = b.id 
     WHERE b.barbershop_id = bh.barbershop_id 
     AND bs.day_of_week = bh.day_of_week 
     AND b.is_active = true 
     LIMIT 1),
    bh.created_at,
    bh.updated_at
FROM barbershop_hours_new bh
ON CONFLICT (barbershop_id, day_of_week) DO NOTHING;

-- =====================================================
-- PASO 2: ELIMINAR TABLAS NUEVAS
-- =====================================================

DROP TABLE IF EXISTS barber_schedules CASCADE;

-- =====================================================
-- PASO 3: RESTAURAR FUNCIONES ORIGINALES
-- =====================================================

-- Eliminar funciones nuevas
DROP FUNCTION IF EXISTS get_barber_schedule(UUID, DATE);
DROP FUNCTION IF EXISTS validate_barber_schedule_within_barbershop();

-- Restaurar función original get_effective_barbershop_hours si fue modificada
CREATE OR REPLACE FUNCTION get_effective_barbershop_hours(
    p_barbershop_id UUID,
    p_day_of_week day_of_week
)
RETURNS TABLE (
    is_closed BOOLEAN,
    open_time TIME,
    close_time TIME,
    break_start TIME,
    break_end TIME,
    is_default BOOLEAN
) AS $$
BEGIN
    -- Primero buscar horario específico de la barbería
    RETURN QUERY
    SELECT 
        bh.is_closed,
        bh.open_time,
        bh.close_time,
        bh.break_start,
        bh.break_end,
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
            bh.break_start,
            bh.break_end,
            true as is_default
        FROM barbershop_hours bh
        WHERE bh.barbershop_id IS NULL
        AND bh.day_of_week = p_day_of_week;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PASO 4: REMOVER COLUMNA BREAK_TYPE DE BARBER_BREAKS
-- =====================================================

ALTER TABLE barber_breaks DROP COLUMN IF EXISTS break_type;

-- =====================================================
-- PASO 5: ELIMINAR TIPO ENUM
-- =====================================================

DROP TYPE IF EXISTS break_type;

-- =====================================================
-- PASO 6: LIMPIAR
-- =====================================================

DROP TABLE IF EXISTS barbershop_hours_new;
DROP VIEW IF EXISTS v_barber_availability;

-- =====================================================
-- FIN DEL ROLLBACK
-- =====================================================