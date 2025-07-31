-- Migration: Integrate Working Hours with New System
-- Version: 005
-- Date: 2025-01-30
-- Description: Creates functions to bridge existing working_hours with new schedule system
-- Compatible with PostgreSQL 15+ and Supabase

-- =====================================================
-- PASO 1: CREAR FUNCIÓN PUENTE PARA WORKING_HOURS
-- =====================================================

-- Función para obtener horario efectivo de un barbero
-- Combina working_hours (plantilla semanal) con barber_breaks (descansos dinámicos)
CREATE OR REPLACE FUNCTION get_barber_effective_schedule(
    p_barber_id UUID,
    p_date DATE
)
RETURNS TABLE (
    start_time TIME,
    end_time TIME,
    block_type TEXT, -- 'available', 'break', 'unavailable'
    source TEXT -- 'working_hours', 'barber_break', 'special_date'
) AS $$
DECLARE
    v_day_of_week day_of_week;
    v_working_hours working_hours%ROWTYPE;
    v_special_date special_dates%ROWTYPE;
BEGIN
    -- Obtener día de la semana
    v_day_of_week := get_day_of_week(p_date);
    
    -- Verificar si hay una fecha especial (feriado o excepción)
    SELECT * INTO v_special_date
    FROM special_dates
    WHERE barber_id = p_barber_id
    AND date = p_date;
    
    -- Si es feriado, retornar no disponible
    IF v_special_date.is_holiday THEN
        RETURN QUERY
        SELECT 
            '00:00'::TIME as start_time,
            '23:59'::TIME as end_time,
            'unavailable'::TEXT as block_type,
            'special_date'::TEXT as source;
        RETURN;
    END IF;
    
    -- Si hay horario personalizado para esa fecha
    IF v_special_date.custom_hours IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            (v_special_date.custom_hours->>'start')::TIME,
            (v_special_date.custom_hours->>'end')::TIME,
            'available'::TEXT,
            'special_date'::TEXT;
            
        -- Agregar breaks si existen
        IF v_special_date.custom_hours->'breaks' IS NOT NULL THEN
            RETURN QUERY
            SELECT 
                ((break_data)->>'start')::TIME,
                ((break_data)->>'end')::TIME,
                'break'::TEXT,
                'special_date'::TEXT
            FROM jsonb_array_elements(v_special_date.custom_hours->'breaks') as break_data;
        END IF;
        RETURN;
    END IF;
    
    -- Obtener horario regular del barbero
    SELECT * INTO v_working_hours
    FROM working_hours
    WHERE barber_id = p_barber_id
    AND day_of_week = v_day_of_week;
    
    -- Si no trabaja ese día
    IF v_working_hours IS NULL OR NOT v_working_hours.is_working THEN
        RETURN QUERY
        SELECT 
            '00:00'::TIME,
            '23:59'::TIME,
            'unavailable'::TEXT,
            'working_hours'::TEXT;
        RETURN;
    END IF;
    
    -- Retornar bloques de disponibilidad
    -- Bloque antes del descanso (si existe)
    IF v_working_hours.break_start IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            v_working_hours.start_time,
            v_working_hours.break_start,
            'available'::TEXT,
            'working_hours'::TEXT;
    END IF;
    
    -- Bloque de descanso
    IF v_working_hours.break_start IS NOT NULL AND v_working_hours.break_end IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            v_working_hours.break_start,
            v_working_hours.break_end,
            'break'::TEXT,
            'working_hours'::TEXT;
    END IF;
    
    -- Bloque después del descanso (si existe) o bloque completo
    RETURN QUERY
    SELECT 
        COALESCE(v_working_hours.break_end, v_working_hours.start_time),
        v_working_hours.end_time,
        'available'::TEXT,
        'working_hours'::TEXT;
    
    -- Agregar descansos dinámicos del día
    RETURN QUERY
    SELECT 
        bb.start_time,
        bb.end_time,
        'break'::TEXT,
        'barber_break'::TEXT
    FROM barber_breaks bb
    WHERE bb.barber_id = p_barber_id
    AND bb.date = p_date
    ORDER BY bb.start_time;
    
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PASO 2: CREAR FUNCIÓN PARA MIGRAR WORKING_HOURS
-- =====================================================

-- Función para migrar datos de working_hours al nuevo sistema de plantillas
CREATE OR REPLACE FUNCTION migrate_working_hours_to_templates()
RETURNS void AS $$
DECLARE
    v_barber RECORD;
    v_template_id UUID;
    v_working_hour RECORD;
BEGIN
    -- Para cada barbero con horarios definidos
    FOR v_barber IN 
        SELECT DISTINCT barber_id 
        FROM working_hours 
        WHERE is_working = true
    LOOP
        -- Verificar si ya tiene una plantilla
        SELECT id INTO v_template_id
        FROM schedule_templates
        WHERE barber_id = v_barber.barber_id
        AND is_active = true;
        
        -- Si no tiene plantilla, crear una
        IF v_template_id IS NULL THEN
            INSERT INTO schedule_templates (barber_id, name, is_active)
            VALUES (v_barber.barber_id, 'Horario Principal', true)
            RETURNING id INTO v_template_id;
        END IF;
        
        -- Migrar cada día de trabajo
        FOR v_working_hour IN 
            SELECT * FROM working_hours 
            WHERE barber_id = v_barber.barber_id 
            AND is_working = true
        LOOP
            -- Insertar bloque de trabajo antes del descanso
            IF v_working_hour.break_start IS NOT NULL THEN
                INSERT INTO schedule_template_blocks (
                    template_id, day_of_week, start_time, end_time, block_type
                )
                VALUES (
                    v_template_id, 
                    v_working_hour.day_of_week,
                    v_working_hour.start_time,
                    v_working_hour.break_start,
                    'available'::availability_status
                )
                ON CONFLICT DO NOTHING;
            END IF;
            
            -- Insertar bloque de descanso
            IF v_working_hour.break_start IS NOT NULL AND v_working_hour.break_end IS NOT NULL THEN
                INSERT INTO schedule_template_blocks (
                    template_id, day_of_week, start_time, end_time, block_type
                )
                VALUES (
                    v_template_id, 
                    v_working_hour.day_of_week,
                    v_working_hour.break_start,
                    v_working_hour.break_end,
                    'break'::availability_status
                )
                ON CONFLICT DO NOTHING;
            END IF;
            
            -- Insertar bloque de trabajo después del descanso o completo
            INSERT INTO schedule_template_blocks (
                template_id, day_of_week, start_time, end_time, block_type
            )
            VALUES (
                v_template_id, 
                v_working_hour.day_of_week,
                COALESCE(v_working_hour.break_end, v_working_hour.start_time),
                v_working_hour.end_time,
                'available'::availability_status
            )
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PASO 3: CREAR VISTA UNIFICADA DE DISPONIBILIDAD
-- =====================================================

-- Vista que combina todos los sistemas de horarios
CREATE OR REPLACE VIEW v_unified_availability AS
WITH barber_schedule AS (
    -- Obtener horario base del barbero
    SELECT 
        b.id as barber_id,
        b.barbershop_id,
        wh.day_of_week,
        wh.start_time,
        wh.end_time,
        wh.break_start,
        wh.break_end,
        wh.is_working
    FROM barbers b
    LEFT JOIN working_hours wh ON wh.barber_id = b.id
    WHERE b.is_active = true
),
barbershop_schedule AS (
    -- Obtener horario de la barbería
    SELECT 
        bs.id as barbershop_id,
        bh.day_of_week,
        bh.is_closed,
        bh.open_time,
        bh.close_time,
        bh.break_start as shop_break_start,
        bh.break_end as shop_break_end
    FROM barbershops bs
    LEFT JOIN barbershop_hours bh ON bh.barbershop_id = bs.id
    WHERE bs.is_active = true
)
SELECT 
    bs.barber_id,
    bs.barbershop_id,
    bs.day_of_week,
    -- Usar horario del barbero si existe, sino usar el de la barbería
    CASE 
        WHEN bs.is_working = false THEN true
        WHEN bsh.is_closed THEN true
        ELSE false
    END as is_closed,
    -- Hora de inicio efectiva (la más tardía entre barbero y barbería)
    GREATEST(
        COALESCE(bs.start_time, bsh.open_time),
        COALESCE(bsh.open_time, bs.start_time)
    ) as effective_start_time,
    -- Hora de fin efectiva (la más temprana entre barbero y barbería)
    LEAST(
        COALESCE(bs.end_time, bsh.close_time),
        COALESCE(bsh.close_time, bs.end_time)
    ) as effective_end_time,
    -- Descansos (combinar si ambos existen)
    CASE 
        WHEN bs.break_start IS NOT NULL THEN bs.break_start
        WHEN bsh.shop_break_start IS NOT NULL THEN bsh.shop_break_start
        ELSE NULL
    END as break_start,
    CASE 
        WHEN bs.break_end IS NOT NULL THEN bs.break_end
        WHEN bsh.shop_break_end IS NOT NULL THEN bsh.shop_break_end
        ELSE NULL
    END as break_end
FROM barber_schedule bs
JOIN barbershop_schedule bsh ON bs.barbershop_id = bsh.barbershop_id 
    AND bs.day_of_week = bsh.day_of_week;

-- =====================================================
-- PASO 4: FUNCIÓN PARA VERIFICAR CONFLICTOS
-- =====================================================

CREATE OR REPLACE FUNCTION check_schedule_conflicts(
    p_barber_id UUID,
    p_date DATE,
    p_start_time TIME,
    p_end_time TIME
)
RETURNS TABLE (
    has_conflict BOOLEAN,
    conflict_type TEXT,
    conflict_details TEXT
) AS $$
DECLARE
    v_conflicts_count INTEGER := 0;
    v_conflict_type TEXT;
    v_conflict_details TEXT;
BEGIN
    -- Verificar conflicto con citas existentes
    SELECT COUNT(*) INTO v_conflicts_count
    FROM appointments
    WHERE barber_id = p_barber_id
    AND DATE(start_time) = p_date
    AND status IN ('scheduled', 'confirmed', 'in_progress')
    AND (
        (start_time::TIME < p_end_time AND end_time::TIME > p_start_time)
    );
    
    IF v_conflicts_count > 0 THEN
        RETURN QUERY
        SELECT 
            true,
            'appointment'::TEXT,
            format('Conflicto con %s cita(s) existente(s)', v_conflicts_count);
        RETURN;
    END IF;
    
    -- Verificar conflicto con descansos programados
    SELECT COUNT(*) INTO v_conflicts_count
    FROM barber_breaks
    WHERE barber_id = p_barber_id
    AND date = p_date
    AND (start_time < p_end_time AND end_time > p_start_time);
    
    IF v_conflicts_count > 0 THEN
        RETURN QUERY
        SELECT 
            true,
            'break'::TEXT,
            'Conflicto con descanso programado';
        RETURN;
    END IF;
    
    -- Verificar si está dentro del horario laboral
    IF NOT EXISTS (
        SELECT 1
        FROM get_barber_effective_schedule(p_barber_id, p_date) s
        WHERE s.block_type = 'available'
        AND s.start_time <= p_start_time
        AND s.end_time >= p_end_time
    ) THEN
        RETURN QUERY
        SELECT 
            true,
            'schedule'::TEXT,
            'Fuera del horario laboral del barbero';
        RETURN;
    END IF;
    
    -- No hay conflictos
    RETURN QUERY
    SELECT 
        false,
        NULL::TEXT,
        NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PASO 5: CREAR ÍNDICES ADICIONALES
-- =====================================================

-- Índices para mejorar las consultas de disponibilidad
CREATE INDEX IF NOT EXISTS idx_appointments_barber_date_time 
    ON appointments(barber_id, DATE(start_time), start_time::TIME);

CREATE INDEX IF NOT EXISTS idx_special_dates_barber_date 
    ON special_dates(barber_id, date);

CREATE INDEX IF NOT EXISTS idx_working_hours_barber_day 
    ON working_hours(barber_id, day_of_week);

-- =====================================================
-- PASO 6: FUNCIONES DE UTILIDAD ADICIONALES
-- =====================================================

-- Función para obtener slots disponibles considerando todos los sistemas
CREATE OR REPLACE FUNCTION get_available_slots_unified(
    p_barber_id UUID,
    p_date DATE,
    p_service_duration INTEGER, -- en minutos
    p_slot_interval INTEGER DEFAULT 15 -- intervalo entre slots
)
RETURNS TABLE (
    slot_start TIME,
    slot_end TIME,
    is_available BOOLEAN,
    unavailable_reason TEXT
) AS $$
DECLARE
    v_schedule RECORD;
    v_current_time TIME;
    v_slot_end TIME;
BEGIN
    -- Obtener bloques disponibles del barbero
    FOR v_schedule IN 
        SELECT * FROM get_barber_effective_schedule(p_barber_id, p_date)
        WHERE block_type = 'available'
        ORDER BY start_time
    LOOP
        v_current_time := v_schedule.start_time;
        
        -- Generar slots dentro de cada bloque disponible
        WHILE v_current_time + (p_service_duration * INTERVAL '1 minute') <= v_schedule.end_time LOOP
            v_slot_end := v_current_time + (p_service_duration * INTERVAL '1 minute');
            
            -- Verificar conflictos para este slot
            RETURN QUERY
            WITH conflict_check AS (
                SELECT * FROM check_schedule_conflicts(
                    p_barber_id, 
                    p_date, 
                    v_current_time, 
                    v_slot_end
                )
            )
            SELECT 
                v_current_time,
                v_slot_end,
                NOT cc.has_conflict,
                cc.conflict_details
            FROM conflict_check cc;
            
            v_current_time := v_current_time + (p_slot_interval * INTERVAL '1 minute');
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMENTARIOS ADICIONALES
-- =====================================================

COMMENT ON FUNCTION get_barber_effective_schedule IS 'Obtiene el horario efectivo de un barbero combinando working_hours, special_dates y barber_breaks';
COMMENT ON FUNCTION migrate_working_hours_to_templates IS 'Migra datos existentes de working_hours al nuevo sistema de plantillas';
COMMENT ON FUNCTION check_schedule_conflicts IS 'Verifica conflictos de horario para una franja de tiempo específica';
COMMENT ON VIEW v_unified_availability IS 'Vista unificada que combina horarios de barberos y barberías';

-- =====================================================
-- FIN DE LA MIGRACIÓN
-- =====================================================