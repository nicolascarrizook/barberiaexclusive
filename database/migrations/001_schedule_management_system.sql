-- Migración: Sistema de Gestión de Horarios
-- Versión: 001
-- Fecha: 2025-01-29
-- Descripción: Implementa un sistema flexible de gestión de horarios para barberos
-- Compatible con PostgreSQL 15+ y Supabase

-- =====================================================
-- PASO 1: CREAR TIPOS ENUM
-- =====================================================

-- Tipo para los días de la semana
CREATE TYPE day_of_week AS ENUM (
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday'
);

-- Tipo para el estado de disponibilidad
CREATE TYPE availability_status AS ENUM (
    'available',    -- Disponible para citas
    'unavailable',  -- No disponible
    'break'        -- En descanso
);

-- =====================================================
-- PASO 2: CREAR TABLAS
-- =====================================================

-- Tabla para plantillas de horarios semanales
CREATE TABLE schedule_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barber_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint: Solo una plantilla activa por barbero
    CONSTRAINT unique_active_template UNIQUE (barber_id, is_active) WHERE is_active = true
);

-- Tabla para los bloques de tiempo de las plantillas
CREATE TABLE schedule_template_blocks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID NOT NULL REFERENCES schedule_templates(id) ON DELETE CASCADE,
    day_of_week day_of_week NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    block_type availability_status NOT NULL DEFAULT 'available',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints de validación
    CONSTRAINT valid_time_range CHECK (end_time > start_time),
    CONSTRAINT valid_block_duration CHECK (
        EXTRACT(EPOCH FROM (end_time - start_time)) >= 900 -- Mínimo 15 minutos
    )
);

-- Tabla para excepciones y modificaciones específicas por fecha
CREATE TABLE schedule_exceptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barber_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exception_date DATE NOT NULL,
    is_working_day BOOLEAN NOT NULL DEFAULT true, -- false = día no laborable
    custom_start_time TIME,
    custom_end_time TIME,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint: Una excepción por barbero por día
    CONSTRAINT unique_barber_date_exception UNIQUE (barber_id, exception_date),
    
    -- Constraint: Si es día laborable, debe tener horarios
    CONSTRAINT working_day_requires_times CHECK (
        (is_working_day = false) OR 
        (is_working_day = true AND custom_start_time IS NOT NULL AND custom_end_time IS NOT NULL)
    ),
    
    -- Constraint: Validar rango de tiempo
    CONSTRAINT valid_custom_time_range CHECK (
        custom_end_time IS NULL OR custom_start_time IS NULL OR custom_end_time > custom_start_time
    )
);

-- Tabla para bloques de tiempo en días con excepciones
CREATE TABLE schedule_exception_blocks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    exception_id UUID NOT NULL REFERENCES schedule_exceptions(id) ON DELETE CASCADE,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    block_type availability_status NOT NULL DEFAULT 'available',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_exception_time_range CHECK (end_time > start_time),
    CONSTRAINT valid_exception_block_duration CHECK (
        EXTRACT(EPOCH FROM (end_time - start_time)) >= 900 -- Mínimo 15 minutos
    )
);

-- Tabla para el horario actual renderizado (vista materializada manual)
CREATE TABLE barber_schedules_current (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barber_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    schedule_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    block_type availability_status NOT NULL DEFAULT 'available',
    source VARCHAR(20) NOT NULL CHECK (source IN ('template', 'exception')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Índice único para evitar duplicados
    CONSTRAINT unique_barber_schedule_slot UNIQUE (barber_id, schedule_date, start_time, end_time)
);

-- =====================================================
-- PASO 3: CREAR ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

-- Índices para schedule_templates
CREATE INDEX idx_schedule_templates_barber_id ON schedule_templates(barber_id);
CREATE INDEX idx_schedule_templates_active ON schedule_templates(barber_id, is_active) WHERE is_active = true;

-- Índices para schedule_template_blocks
CREATE INDEX idx_template_blocks_template_id ON schedule_template_blocks(template_id);
CREATE INDEX idx_template_blocks_day ON schedule_template_blocks(template_id, day_of_week);
CREATE INDEX idx_template_blocks_time_range ON schedule_template_blocks(template_id, start_time, end_time);

-- Índices para schedule_exceptions
CREATE INDEX idx_schedule_exceptions_barber_date ON schedule_exceptions(barber_id, exception_date);
CREATE INDEX idx_schedule_exceptions_date ON schedule_exceptions(exception_date);

-- Índices para schedule_exception_blocks
CREATE INDEX idx_exception_blocks_exception_id ON schedule_exception_blocks(exception_id);

-- Índices para barber_schedules_current
CREATE INDEX idx_schedules_current_barber_date ON barber_schedules_current(barber_id, schedule_date);
CREATE INDEX idx_schedules_current_date ON barber_schedules_current(schedule_date);
CREATE INDEX idx_schedules_current_availability ON barber_schedules_current(schedule_date, block_type) 
    WHERE block_type = 'available';

-- =====================================================
-- PASO 4: CREAR FUNCIONES HELPER
-- =====================================================

-- Función para obtener el día de la semana de una fecha
CREATE OR REPLACE FUNCTION get_day_of_week(date_input DATE)
RETURNS day_of_week AS $$
BEGIN
    RETURN CASE EXTRACT(DOW FROM date_input)
        WHEN 0 THEN 'sunday'::day_of_week
        WHEN 1 THEN 'monday'::day_of_week
        WHEN 2 THEN 'tuesday'::day_of_week
        WHEN 3 THEN 'wednesday'::day_of_week
        WHEN 4 THEN 'thursday'::day_of_week
        WHEN 5 THEN 'friday'::day_of_week
        WHEN 6 THEN 'saturday'::day_of_week
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Función para verificar solapamiento de bloques de tiempo
CREATE OR REPLACE FUNCTION check_time_blocks_overlap(
    blocks jsonb
)
RETURNS BOOLEAN AS $$
DECLARE
    i INTEGER;
    j INTEGER;
    block_count INTEGER;
    block1 jsonb;
    block2 jsonb;
BEGIN
    block_count := jsonb_array_length(blocks);
    
    -- Verificar cada par de bloques
    FOR i IN 0..block_count-2 LOOP
        FOR j IN i+1..block_count-1 LOOP
            block1 := blocks->i;
            block2 := blocks->j;
            
            -- Verificar solapamiento
            IF (block1->>'start_time')::TIME < (block2->>'end_time')::TIME AND
               (block1->>'end_time')::TIME > (block2->>'start_time')::TIME THEN
                RETURN TRUE; -- Hay solapamiento
            END IF;
        END LOOP;
    END LOOP;
    
    RETURN FALSE; -- No hay solapamiento
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Función para generar el horario actual de un barbero
CREATE OR REPLACE FUNCTION generate_barber_schedule(
    p_barber_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    schedule_date DATE,
    start_time TIME,
    end_time TIME,
    block_type availability_status,
    source VARCHAR(20)
) AS $$
DECLARE
    current_date DATE;
    active_template_id UUID;
BEGIN
    -- Obtener la plantilla activa del barbero
    SELECT id INTO active_template_id
    FROM schedule_templates
    WHERE barber_id = p_barber_id AND is_active = true
    LIMIT 1;
    
    -- Si no hay plantilla activa, no generar nada
    IF active_template_id IS NULL THEN
        RETURN;
    END IF;
    
    -- Iterar por cada día en el rango
    current_date := p_start_date;
    WHILE current_date <= p_end_date LOOP
        -- Verificar si hay una excepción para este día
        IF EXISTS (
            SELECT 1 FROM schedule_exceptions
            WHERE barber_id = p_barber_id 
            AND exception_date = current_date
        ) THEN
            -- Si es un día no laborable, continuar
            IF (SELECT is_working_day FROM schedule_exceptions 
                WHERE barber_id = p_barber_id AND exception_date = current_date) = false THEN
                current_date := current_date + INTERVAL '1 day';
                CONTINUE;
            END IF;
            
            -- Retornar bloques de la excepción
            RETURN QUERY
            SELECT 
                current_date,
                eb.start_time,
                eb.end_time,
                eb.block_type,
                'exception'::VARCHAR(20)
            FROM schedule_exception_blocks eb
            JOIN schedule_exceptions e ON eb.exception_id = e.id
            WHERE e.barber_id = p_barber_id 
            AND e.exception_date = current_date
            ORDER BY eb.start_time;
        ELSE
            -- Retornar bloques de la plantilla
            RETURN QUERY
            SELECT 
                current_date,
                stb.start_time,
                stb.end_time,
                stb.block_type,
                'template'::VARCHAR(20)
            FROM schedule_template_blocks stb
            WHERE stb.template_id = active_template_id
            AND stb.day_of_week = get_day_of_week(current_date)
            ORDER BY stb.start_time;
        END IF;
        
        current_date := current_date + INTERVAL '1 day';
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar el horario actual (trigger)
CREATE OR REPLACE FUNCTION update_current_schedule()
RETURNS TRIGGER AS $$
DECLARE
    affected_barber_id UUID;
    start_date DATE;
    end_date DATE;
BEGIN
    -- Determinar el barbero afectado según la tabla
    IF TG_TABLE_NAME = 'schedule_templates' THEN
        affected_barber_id := COALESCE(NEW.barber_id, OLD.barber_id);
        start_date := CURRENT_DATE;
        end_date := CURRENT_DATE + INTERVAL '30 days';
    ELSIF TG_TABLE_NAME = 'schedule_exceptions' THEN
        affected_barber_id := COALESCE(NEW.barber_id, OLD.barber_id);
        start_date := COALESCE(NEW.exception_date, OLD.exception_date);
        end_date := start_date;
    ELSE
        RETURN NEW;
    END IF;
    
    -- Eliminar horarios actuales en el rango afectado
    DELETE FROM barber_schedules_current
    WHERE barber_id = affected_barber_id
    AND schedule_date BETWEEN start_date AND end_date;
    
    -- Regenerar horarios
    INSERT INTO barber_schedules_current (barber_id, schedule_date, start_time, end_time, block_type, source)
    SELECT 
        affected_barber_id,
        schedule_date,
        start_time,
        end_time,
        block_type,
        source
    FROM generate_barber_schedule(affected_barber_id, start_date, end_date);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PASO 5: CREAR TRIGGERS
-- =====================================================

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_schedule_templates_updated_at
    BEFORE UPDATE ON schedule_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedule_exceptions_updated_at
    BEFORE UPDATE ON schedule_exceptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_barber_schedules_current_updated_at
    BEFORE UPDATE ON barber_schedules_current
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Triggers para actualizar el horario actual
CREATE TRIGGER trigger_update_schedule_on_template_change
    AFTER INSERT OR UPDATE OR DELETE ON schedule_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_current_schedule();

CREATE TRIGGER trigger_update_schedule_on_template_block_change
    AFTER INSERT OR UPDATE OR DELETE ON schedule_template_blocks
    FOR EACH ROW
    EXECUTE FUNCTION update_current_schedule();

CREATE TRIGGER trigger_update_schedule_on_exception_change
    AFTER INSERT OR UPDATE OR DELETE ON schedule_exceptions
    FOR EACH ROW
    EXECUTE FUNCTION update_current_schedule();

CREATE TRIGGER trigger_update_schedule_on_exception_block_change
    AFTER INSERT OR UPDATE OR DELETE ON schedule_exception_blocks
    FOR EACH ROW
    EXECUTE FUNCTION update_current_schedule();

-- =====================================================
-- PASO 6: MIGRACIÓN DE DATOS EXISTENTES
-- =====================================================

-- Crear plantillas para barberos con horarios existentes
INSERT INTO schedule_templates (barber_id, name, is_active)
SELECT DISTINCT 
    barber_id,
    'Horario Principal' as name,
    true as is_active
FROM barber_schedules
WHERE break_start IS NOT NULL OR break_end IS NOT NULL;

-- Migrar bloques de disponibilidad (horario de trabajo)
WITH barber_work_hours AS (
    SELECT DISTINCT
        bs.barber_id,
        st.id as template_id,
        bs.start_time,
        bs.end_time,
        bs.break_start,
        bs.break_end,
        get_day_of_week(bs.date) as day_of_week
    FROM barber_schedules bs
    JOIN schedule_templates st ON st.barber_id = bs.barber_id
    WHERE st.is_active = true
)
-- Insertar bloques de trabajo (antes del descanso)
INSERT INTO schedule_template_blocks (template_id, day_of_week, start_time, end_time, block_type)
SELECT 
    template_id,
    day_of_week,
    start_time,
    break_start,
    'available'::availability_status
FROM barber_work_hours
WHERE break_start IS NOT NULL
  AND break_start > start_time
UNION ALL
-- Insertar bloques de descanso
SELECT 
    template_id,
    day_of_week,
    break_start,
    break_end,
    'break'::availability_status
FROM barber_work_hours
WHERE break_start IS NOT NULL 
  AND break_end IS NOT NULL
  AND break_end > break_start
UNION ALL
-- Insertar bloques de trabajo (después del descanso)
SELECT 
    template_id,
    day_of_week,
    break_end,
    end_time,
    'available'::availability_status
FROM barber_work_hours
WHERE break_end IS NOT NULL
  AND end_time > break_end
UNION ALL
-- Insertar bloques completos (sin descanso)
SELECT 
    template_id,
    day_of_week,
    start_time,
    end_time,
    'available'::availability_status
FROM barber_work_hours
WHERE break_start IS NULL OR break_end IS NULL;

-- Generar horarios actuales para los próximos 30 días
INSERT INTO barber_schedules_current (barber_id, schedule_date, start_time, end_time, block_type, source)
SELECT 
    barber_id,
    schedule_date,
    start_time,
    end_time,
    block_type,
    source
FROM (
    SELECT DISTINCT barber_id 
    FROM schedule_templates 
    WHERE is_active = true
) barberos
CROSS JOIN LATERAL generate_barber_schedule(
    barberos.barber_id, 
    CURRENT_DATE, 
    CURRENT_DATE + INTERVAL '30 days'
);

-- =====================================================
-- PASO 7: CONFIGURAR POLÍTICAS RLS
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE schedule_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_template_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_exception_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_schedules_current ENABLE ROW LEVEL SECURITY;

-- Políticas para schedule_templates
CREATE POLICY "Barberos pueden ver todas las plantillas"
    ON schedule_templates FOR SELECT
    USING (true);

CREATE POLICY "Barberos pueden gestionar sus propias plantillas"
    ON schedule_templates FOR ALL
    USING (auth.uid() = barber_id)
    WITH CHECK (auth.uid() = barber_id);

-- Políticas para schedule_template_blocks
CREATE POLICY "Todos pueden ver bloques de plantillas"
    ON schedule_template_blocks FOR SELECT
    USING (true);

CREATE POLICY "Barberos pueden gestionar bloques de sus plantillas"
    ON schedule_template_blocks FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM schedule_templates st
            WHERE st.id = template_id
            AND st.barber_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM schedule_templates st
            WHERE st.id = template_id
            AND st.barber_id = auth.uid()
        )
    );

-- Políticas para schedule_exceptions
CREATE POLICY "Todos pueden ver excepciones"
    ON schedule_exceptions FOR SELECT
    USING (true);

CREATE POLICY "Barberos pueden gestionar sus propias excepciones"
    ON schedule_exceptions FOR ALL
    USING (auth.uid() = barber_id)
    WITH CHECK (auth.uid() = barber_id);

-- Políticas para schedule_exception_blocks
CREATE POLICY "Todos pueden ver bloques de excepciones"
    ON schedule_exception_blocks FOR SELECT
    USING (true);

CREATE POLICY "Barberos pueden gestionar bloques de sus excepciones"
    ON schedule_exception_blocks FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM schedule_exceptions se
            WHERE se.id = exception_id
            AND se.barber_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM schedule_exceptions se
            WHERE se.id = exception_id
            AND se.barber_id = auth.uid()
        )
    );

-- Políticas para barber_schedules_current
CREATE POLICY "Todos pueden ver horarios actuales"
    ON barber_schedules_current FOR SELECT
    USING (true);

CREATE POLICY "Solo el sistema puede modificar horarios actuales"
    ON barber_schedules_current FOR ALL
    USING (false)
    WITH CHECK (false);

-- =====================================================
-- PASO 8: CREAR VISTAS ÚTILES
-- =====================================================

-- Vista para obtener la disponibilidad de un barbero por día
CREATE OR REPLACE VIEW v_barber_availability AS
SELECT 
    bsc.barber_id,
    u.full_name as barber_name,
    bsc.schedule_date,
    bsc.start_time,
    bsc.end_time,
    bsc.block_type,
    bsc.source,
    EXTRACT(EPOCH FROM (bsc.end_time - bsc.start_time)) / 60 as duration_minutes
FROM barber_schedules_current bsc
JOIN auth.users u ON u.id = bsc.barber_id
WHERE bsc.schedule_date >= CURRENT_DATE
ORDER BY bsc.barber_id, bsc.schedule_date, bsc.start_time;

-- Vista para obtener el resumen de disponibilidad por día
CREATE OR REPLACE VIEW v_daily_availability_summary AS
SELECT 
    schedule_date,
    barber_id,
    COUNT(*) FILTER (WHERE block_type = 'available') as available_blocks,
    COUNT(*) FILTER (WHERE block_type = 'break') as break_blocks,
    SUM(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600) 
        FILTER (WHERE block_type = 'available') as available_hours,
    MIN(start_time) FILTER (WHERE block_type = 'available') as first_available_time,
    MAX(end_time) FILTER (WHERE block_type = 'available') as last_available_time
FROM barber_schedules_current
WHERE schedule_date >= CURRENT_DATE
GROUP BY schedule_date, barber_id;

-- =====================================================
-- PASO 9: FUNCIONES DE UTILIDAD ADICIONALES
-- =====================================================

-- Función para verificar si un barbero está disponible en un momento específico
CREATE OR REPLACE FUNCTION is_barber_available(
    p_barber_id UUID,
    p_date DATE,
    p_time TIME
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM barber_schedules_current
        WHERE barber_id = p_barber_id
        AND schedule_date = p_date
        AND start_time <= p_time
        AND end_time > p_time
        AND block_type = 'available'
    );
END;
$$ LANGUAGE plpgsql;

-- Función para obtener los próximos slots disponibles de un barbero
CREATE OR REPLACE FUNCTION get_next_available_slots(
    p_barber_id UUID,
    p_duration_minutes INTEGER,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    slot_date DATE,
    slot_start_time TIME,
    slot_end_time TIME
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bsc.schedule_date,
        bsc.start_time + (n * INTERVAL '15 minutes') as slot_start,
        bsc.start_time + (n * INTERVAL '15 minutes') + (p_duration_minutes * INTERVAL '1 minute') as slot_end
    FROM barber_schedules_current bsc
    CROSS JOIN generate_series(0, 
        (EXTRACT(EPOCH FROM (bsc.end_time - bsc.start_time)) / 900)::INTEGER - 
        (p_duration_minutes / 15.0)::INTEGER
    ) as n
    WHERE bsc.barber_id = p_barber_id
    AND bsc.block_type = 'available'
    AND bsc.schedule_date >= CURRENT_DATE
    AND (bsc.schedule_date > CURRENT_DATE OR 
         bsc.start_time + (n * INTERVAL '15 minutes') > CURRENT_TIME)
    AND NOT EXISTS (
        -- Verificar que no haya citas existentes
        SELECT 1 FROM appointments a
        WHERE a.barber_id = p_barber_id
        AND a.appointment_date = bsc.schedule_date
        AND a.status IN ('scheduled', 'in_progress')
        AND (
            (a.start_time < bsc.start_time + (n * INTERVAL '15 minutes') + (p_duration_minutes * INTERVAL '1 minute')
             AND a.end_time > bsc.start_time + (n * INTERVAL '15 minutes'))
        )
    )
    ORDER BY bsc.schedule_date, slot_start
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PASO 10: COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

-- Comentarios en las tablas
COMMENT ON TABLE schedule_templates IS 'Plantillas de horarios semanales para barberos. Cada barbero puede tener múltiples plantillas pero solo una activa.';
COMMENT ON TABLE schedule_template_blocks IS 'Bloques de tiempo que componen una plantilla de horario. Cada bloque define disponibilidad o descanso.';
COMMENT ON TABLE schedule_exceptions IS 'Excepciones y modificaciones específicas por fecha que sobrescriben la plantilla activa.';
COMMENT ON TABLE schedule_exception_blocks IS 'Bloques de tiempo para días con excepciones. Similar a template_blocks pero para días específicos.';
COMMENT ON TABLE barber_schedules_current IS 'Horario actual renderizado. Se actualiza automáticamente cuando cambian plantillas o excepciones.';

-- Comentarios en las columnas importantes
COMMENT ON COLUMN schedule_templates.is_active IS 'Solo puede haber una plantilla activa por barbero. Se usa para generar el horario actual.';
COMMENT ON COLUMN schedule_template_blocks.block_type IS 'Tipo de bloque: available (disponible para citas), break (descanso), unavailable (no disponible).';
COMMENT ON COLUMN schedule_exceptions.is_working_day IS 'Si es false, el barbero no trabaja ese día. Si es true, usa los bloques definidos.';
COMMENT ON COLUMN barber_schedules_current.source IS 'Origen del bloque: template (de la plantilla) o exception (de una excepción).';

-- =====================================================
-- PASO 11: DATOS DE EJEMPLO (OPCIONAL)
-- =====================================================

-- Descomenta las siguientes líneas para insertar datos de ejemplo
/*
-- Crear una plantilla de ejemplo
INSERT INTO schedule_templates (barber_id, name, is_active)
VALUES ('11111111-1111-1111-1111-111111111111', 'Horario Estándar', true);

-- Agregar bloques de tiempo a la plantilla
INSERT INTO schedule_template_blocks (template_id, day_of_week, start_time, end_time, block_type)
SELECT 
    st.id,
    day,
    '09:00'::TIME,
    '13:00'::TIME,
    'available'::availability_status
FROM schedule_templates st
CROSS JOIN unnest(ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday']::day_of_week[]) as day
WHERE st.name = 'Horario Estándar'
UNION ALL
SELECT 
    st.id,
    day,
    '13:00'::TIME,
    '14:00'::TIME,
    'break'::availability_status
FROM schedule_templates st
CROSS JOIN unnest(ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday']::day_of_week[]) as day
WHERE st.name = 'Horario Estándar'
UNION ALL
SELECT 
    st.id,
    day,
    '14:00'::TIME,
    '19:00'::TIME,
    'available'::availability_status
FROM schedule_templates st
CROSS JOIN unnest(ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday']::day_of_week[]) as day
WHERE st.name = 'Horario Estándar';
*/

-- =====================================================
-- FIN DE LA MIGRACIÓN
-- =====================================================