-- Migration: Fix Scheduling Architecture
-- Version: 005
-- Date: 2025-01-30
-- Description: Separates barbershop hours from individual barber schedules
-- Compatible with PostgreSQL 15+ and Supabase

-- =====================================================
-- PASO 1: CREAR TABLA DE HORARIOS DE BARBEROS
-- =====================================================

-- Tabla para horarios regulares de cada barbero
CREATE TABLE IF NOT EXISTS barber_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
    day_of_week day_of_week NOT NULL,
    is_working BOOLEAN DEFAULT true,
    start_time TIME,
    end_time TIME,
    break_start TIME,
    break_end TIME,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Un horario por día por barbero
    UNIQUE(barber_id, day_of_week),
    
    -- Validaciones
    CONSTRAINT valid_work_hours CHECK (
        is_working = false OR 
        (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
    ),
    CONSTRAINT valid_break_hours CHECK (
        (break_start IS NULL AND break_end IS NULL) OR
        (break_start IS NOT NULL AND break_end IS NOT NULL AND 
         break_start >= start_time AND break_end <= end_time AND
         break_end > break_start)
    )
);

-- Índices para optimización
CREATE INDEX idx_barber_schedules_barber ON barber_schedules(barber_id);
CREATE INDEX idx_barber_schedules_day ON barber_schedules(day_of_week);

-- =====================================================
-- PASO 2: MIGRAR DATOS EXISTENTES
-- =====================================================

-- Primero, copiar los horarios existentes de barbershop_hours a barber_schedules
-- para todos los barberos activos
INSERT INTO barber_schedules (barber_id, day_of_week, is_working, start_time, end_time, break_start, break_end)
SELECT 
    b.id as barber_id,
    bh.day_of_week,
    NOT bh.is_closed as is_working,
    bh.open_time as start_time,
    bh.close_time as end_time,
    bh.break_start,
    bh.break_end
FROM barbers b
CROSS JOIN barbershop_hours bh
WHERE b.is_active = true
  AND bh.barbershop_id = b.barbershop_id
ON CONFLICT (barber_id, day_of_week) DO NOTHING;

-- Si no hay horarios específicos de barbershop, usar los por defecto
INSERT INTO barber_schedules (barber_id, day_of_week, is_working, start_time, end_time, break_start, break_end)
SELECT 
    b.id as barber_id,
    bh.day_of_week,
    NOT bh.is_closed as is_working,
    bh.open_time as start_time,
    bh.close_time as end_time,
    bh.break_start,
    bh.break_end
FROM barbers b
CROSS JOIN barbershop_hours bh
WHERE b.is_active = true
  AND bh.barbershop_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM barber_schedules bs 
    WHERE bs.barber_id = b.id 
    AND bs.day_of_week = bh.day_of_week
  )
ON CONFLICT (barber_id, day_of_week) DO NOTHING;

-- =====================================================
-- PASO 3: MODIFICAR TABLA BARBER_BREAKS
-- =====================================================

-- Agregar tipo de break para diferenciar breaks regulares de excepcionales
DO $$ 
BEGIN
    -- Crear enum si no existe
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'break_type') THEN
        CREATE TYPE break_type AS ENUM ('temporary', 'vacation', 'sick', 'personal', 'training', 'other');
    END IF;
END $$;

-- Agregar columna break_type a barber_breaks
ALTER TABLE barber_breaks 
ADD COLUMN IF NOT EXISTS break_type break_type DEFAULT 'temporary';

-- =====================================================
-- PASO 4: REMOVER COLUMNAS DE BREAK DE BARBERSHOP_HOURS
-- =====================================================

-- Crear una nueva versión de la tabla sin las columnas de break
CREATE TABLE barbershop_hours_new (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    day_of_week day_of_week NOT NULL,
    is_closed BOOLEAN DEFAULT false,
    open_time TIME,
    close_time TIME,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Una entrada por día por barbería
    UNIQUE(barbershop_id, day_of_week),
    
    -- Validaciones
    CONSTRAINT valid_hours CHECK (
        is_closed = true OR 
        (open_time IS NOT NULL AND close_time IS NOT NULL AND close_time > open_time)
    )
);

-- Copiar datos sin las columnas de break
INSERT INTO barbershop_hours_new (id, barbershop_id, day_of_week, is_closed, open_time, close_time, created_at, updated_at)
SELECT id, barbershop_id, day_of_week, is_closed, open_time, close_time, created_at, updated_at
FROM barbershop_hours;

-- Renombrar tablas
ALTER TABLE barbershop_hours RENAME TO barbershop_hours_old;
ALTER TABLE barbershop_hours_new RENAME TO barbershop_hours;

-- Recrear índices
CREATE INDEX idx_barbershop_hours_barbershop ON barbershop_hours(barbershop_id);
CREATE INDEX idx_barbershop_hours_day ON barbershop_hours(day_of_week);

-- =====================================================
-- PASO 5: CREAR FUNCIONES HELPER ACTUALIZADAS
-- =====================================================

-- Función para obtener el horario efectivo de un barbero
CREATE OR REPLACE FUNCTION get_barber_schedule(
    p_barber_id UUID,
    p_date DATE
)
RETURNS TABLE (
    is_working BOOLEAN,
    start_time TIME,
    end_time TIME,
    break_start TIME,
    break_end TIME,
    barbershop_open TIME,
    barbershop_close TIME,
    barbershop_closed BOOLEAN
) AS $$
DECLARE
    v_day_of_week day_of_week;
    v_barbershop_id UUID;
BEGIN
    -- Obtener día de la semana
    v_day_of_week := get_day_of_week(p_date);
    
    -- Obtener barbershop_id del barbero
    SELECT barbershop_id INTO v_barbershop_id
    FROM barbers
    WHERE id = p_barber_id;
    
    -- Retornar horario combinado
    RETURN QUERY
    SELECT 
        bs.is_working,
        bs.start_time,
        bs.end_time,
        bs.break_start,
        bs.break_end,
        bh.open_time as barbershop_open,
        bh.close_time as barbershop_close,
        bh.is_closed as barbershop_closed
    FROM barber_schedules bs
    LEFT JOIN barbershop_hours bh ON (
        bh.barbershop_id = v_barbershop_id 
        AND bh.day_of_week = v_day_of_week
    )
    WHERE bs.barber_id = p_barber_id
    AND bs.day_of_week = v_day_of_week;
END;
$$ LANGUAGE plpgsql;

-- Función para validar que el horario del barbero esté dentro del horario de la barbería
CREATE OR REPLACE FUNCTION validate_barber_schedule_within_barbershop()
RETURNS TRIGGER AS $$
DECLARE
    v_barbershop_id UUID;
    v_barbershop_hours RECORD;
BEGIN
    -- Obtener barbershop_id
    SELECT barbershop_id INTO v_barbershop_id
    FROM barbers
    WHERE id = NEW.barber_id;
    
    -- Obtener horario de la barbería
    SELECT * INTO v_barbershop_hours
    FROM barbershop_hours
    WHERE barbershop_id = v_barbershop_id
    AND day_of_week = NEW.day_of_week;
    
    -- Si no hay horario específico, buscar el por defecto
    IF v_barbershop_hours IS NULL THEN
        SELECT * INTO v_barbershop_hours
        FROM barbershop_hours
        WHERE barbershop_id IS NULL
        AND day_of_week = NEW.day_of_week;
    END IF;
    
    -- Validar solo si el barbero está trabajando y la barbería está abierta
    IF NEW.is_working AND v_barbershop_hours IS NOT NULL AND NOT v_barbershop_hours.is_closed THEN
        -- Verificar que el horario del barbero esté dentro del horario de la barbería
        IF NEW.start_time < v_barbershop_hours.open_time OR 
           NEW.end_time > v_barbershop_hours.close_time THEN
            RAISE EXCEPTION 'El horario del barbero debe estar dentro del horario de apertura de la barbería';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PASO 6: CREAR TRIGGERS
-- =====================================================

-- Trigger para updated_at en barber_schedules
CREATE TRIGGER update_barber_schedules_updated_at
    BEFORE UPDATE ON barber_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para validar horarios de barberos
CREATE TRIGGER validate_barber_schedule
    BEFORE INSERT OR UPDATE ON barber_schedules
    FOR EACH ROW
    EXECUTE FUNCTION validate_barber_schedule_within_barbershop();

-- =====================================================
-- PASO 7: CONFIGURAR RLS
-- =====================================================

-- Habilitar RLS
ALTER TABLE barber_schedules ENABLE ROW LEVEL SECURITY;

-- Políticas para barber_schedules
CREATE POLICY "Todos pueden ver horarios de barberos"
    ON barber_schedules FOR SELECT
    USING (true);

CREATE POLICY "Barberos pueden gestionar su propio horario"
    ON barber_schedules FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM barbers
            WHERE id = barber_id
            AND profile_id = auth.uid()
        )
    );

CREATE POLICY "Owners pueden gestionar horarios de sus barberos"
    ON barber_schedules FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM barbers b
            JOIN barbershops bs ON b.barbershop_id = bs.id
            WHERE b.id = barber_id
            AND bs.owner_id = auth.uid()
        )
    );

-- Actualizar políticas de barbershop_hours (ya no necesitan permisos de breaks)
DROP POLICY IF EXISTS "Owners pueden gestionar horarios de su barbería" ON barbershop_hours;

CREATE POLICY "Owners pueden gestionar horarios de su barbería"
    ON barbershop_hours FOR ALL
    USING (
        barbershop_id IS NULL OR -- Horarios por defecto solo admin
        EXISTS (
            SELECT 1 FROM barbershops
            WHERE id = barbershop_id
            AND owner_id = auth.uid()
        )
    );

-- =====================================================
-- PASO 8: CREAR VISTA PARA DISPONIBILIDAD REAL
-- =====================================================

CREATE OR REPLACE VIEW v_barber_availability AS
SELECT 
    b.id as barber_id,
    b.barbershop_id,
    bs.day_of_week,
    bs.is_working,
    bs.start_time,
    bs.end_time,
    bs.break_start,
    bs.break_end,
    bh.is_closed as barbershop_closed,
    bh.open_time as barbershop_open,
    bh.close_time as barbershop_close,
    CASE 
        WHEN NOT bs.is_working OR bh.is_closed THEN 'unavailable'
        WHEN bs.start_time > bh.open_time THEN 'starts_late'
        WHEN bs.end_time < bh.close_time THEN 'ends_early'
        ELSE 'available'
    END as availability_status
FROM barbers b
JOIN barber_schedules bs ON b.id = bs.barber_id
LEFT JOIN barbershop_hours bh ON (
    b.barbershop_id = bh.barbershop_id 
    AND bs.day_of_week = bh.day_of_week
)
WHERE b.is_active = true;

-- =====================================================
-- PASO 9: LIMPIEZA
-- =====================================================

-- Eliminar la tabla antigua después de verificar que todo funciona
-- NOTA: Ejecutar esto manualmente después de confirmar que la migración fue exitosa
-- DROP TABLE IF EXISTS barbershop_hours_old;

-- =====================================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- =====================================================

COMMENT ON TABLE barber_schedules IS 'Horarios regulares de trabajo de cada barbero, incluyendo sus breaks personales';
COMMENT ON TABLE barbershop_hours IS 'Horarios de operación del negocio. Define cuándo está abierta la barbería';
COMMENT ON COLUMN barber_schedules.is_working IS 'Si el barbero trabaja este día de la semana';
COMMENT ON COLUMN barber_schedules.break_start IS 'Hora de inicio del break regular del barbero (ej: almuerzo)';
COMMENT ON COLUMN barber_breaks.break_type IS 'Tipo de break: temporary (puntual), vacation, sick, personal, etc.';

-- =====================================================
-- FIN DE LA MIGRACIÓN
-- =====================================================