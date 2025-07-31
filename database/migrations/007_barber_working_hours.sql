-- Migration: Barber Working Hours
-- Version: 007
-- Date: 2025-01-30
-- Description: Creates barber-specific working hours table to replace break times at barbershop level
-- Status: PENDING - To be applied after UI updates are complete

-- =====================================================
-- IMPORTANT: This migration is currently PENDING
-- Do not apply until the UI changes are fully tested
-- =====================================================

-- =====================================================
-- PASO 1: CREAR TABLA DE HORARIOS DE TRABAJO DE BARBEROS
-- =====================================================

-- Tabla para horarios de trabajo individuales de cada barbero
CREATE TABLE IF NOT EXISTS barber_working_hours (
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
    
    -- Un registro por día por barbero
    UNIQUE(barber_id, day_of_week),
    
    -- Validaciones
    CONSTRAINT valid_working_hours CHECK (
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
CREATE INDEX idx_barber_working_hours_barber ON barber_working_hours(barber_id);
CREATE INDEX idx_barber_working_hours_day ON barber_working_hours(day_of_week);

-- =====================================================
-- PASO 2: MIGRAR DATOS EXISTENTES
-- =====================================================

-- Copiar horarios de barbershop_hours como horarios por defecto para todos los barberos
INSERT INTO barber_working_hours (barber_id, day_of_week, is_working, start_time, end_time, break_start, break_end)
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

-- Para barberos sin horarios específicos de barbería, usar horarios por defecto
INSERT INTO barber_working_hours (barber_id, day_of_week, is_working, start_time, end_time, break_start, break_end)
SELECT 
    b.id as barber_id,
    bh.day_of_week,
    NOT bh.is_closed as is_working,
    bh.open_time as start_time,
    bh.close_time as end_time,
    '13:00'::TIME as break_start,  -- Horario de almuerzo por defecto
    '14:00'::TIME as break_end
FROM barbers b
CROSS JOIN barbershop_hours bh
WHERE b.is_active = true
  AND bh.barbershop_id IS NULL  -- Horarios por defecto del sistema
  AND NOT EXISTS (
    SELECT 1 FROM barber_working_hours bwh 
    WHERE bwh.barber_id = b.id AND bwh.day_of_week = bh.day_of_week
  )
ON CONFLICT (barber_id, day_of_week) DO NOTHING;

-- =====================================================
-- PASO 3: ACTUALIZAR COLUMNAS DE BARBERSHOP_HOURS
-- =====================================================

-- Comentar que estas columnas están deprecadas (no las eliminamos por compatibilidad)
COMMENT ON COLUMN barbershop_hours.break_start IS 'DEPRECATED: Los descansos ahora se gestionan a nivel de barbero en barber_working_hours';
COMMENT ON COLUMN barbershop_hours.break_end IS 'DEPRECATED: Los descansos ahora se gestionan a nivel de barbero en barber_working_hours';

-- =====================================================
-- PASO 4: CREAR FUNCIÓN PARA VALIDAR HORARIOS
-- =====================================================

-- Función para validar que el horario del barbero esté dentro del horario de la barbería
CREATE OR REPLACE FUNCTION validate_barber_working_hours()
RETURNS TRIGGER AS $$
DECLARE
    v_barbershop_hours barbershop_hours%ROWTYPE;
    v_barbershop_id UUID;
BEGIN
    -- Obtener el ID de la barbería del barbero
    SELECT barbershop_id INTO v_barbershop_id
    FROM barbers
    WHERE id = NEW.barber_id;

    -- Si el barbero no está trabajando, no hay nada que validar
    IF NOT NEW.is_working THEN
        RETURN NEW;
    END IF;

    -- Obtener el horario de la barbería para ese día
    SELECT * INTO v_barbershop_hours
    FROM barbershop_hours
    WHERE barbershop_id = v_barbershop_id
    AND day_of_week = NEW.day_of_week;

    -- Si no hay horario específico, buscar el horario por defecto
    IF v_barbershop_hours IS NULL THEN
        SELECT * INTO v_barbershop_hours
        FROM barbershop_hours
        WHERE barbershop_id IS NULL
        AND day_of_week = NEW.day_of_week;
    END IF;

    -- Validar que la barbería no esté cerrada ese día
    IF v_barbershop_hours.is_closed THEN
        RAISE EXCEPTION 'No se puede trabajar el % porque la barbería está cerrada', NEW.day_of_week;
    END IF;

    -- Validar que el horario del barbero esté dentro del horario de la barbería
    IF NEW.start_time < v_barbershop_hours.open_time OR 
       NEW.end_time > v_barbershop_hours.close_time THEN
        RAISE EXCEPTION 'El horario del barbero (% - %) debe estar dentro del horario de la barbería (% - %)',
            NEW.start_time, NEW.end_time, 
            v_barbershop_hours.open_time, v_barbershop_hours.close_time;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para validar horarios
CREATE TRIGGER validate_barber_hours_trigger
    BEFORE INSERT OR UPDATE ON barber_working_hours
    FOR EACH ROW
    EXECUTE FUNCTION validate_barber_working_hours();

-- =====================================================
-- PASO 5: ACTUALIZAR TRIGGERS
-- =====================================================

-- Trigger para updated_at
CREATE TRIGGER update_barber_working_hours_updated_at
    BEFORE UPDATE ON barber_working_hours
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PASO 6: CONFIGURAR RLS (Row Level Security)
-- =====================================================

-- Habilitar RLS
ALTER TABLE barber_working_hours ENABLE ROW LEVEL SECURITY;

-- Políticas para barber_working_hours
CREATE POLICY "Todos pueden ver horarios de barberos"
    ON barber_working_hours FOR SELECT
    USING (true);

CREATE POLICY "Barberos pueden gestionar sus propios horarios"
    ON barber_working_hours FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM barbers
            WHERE id = barber_id
            AND profile_id = auth.uid()
        )
    );

CREATE POLICY "Owners pueden gestionar horarios de sus barberos"
    ON barber_working_hours FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM barbers b
            JOIN barbershops bs ON b.barbershop_id = bs.id
            WHERE b.id = barber_id
            AND bs.owner_id = auth.uid()
        )
    );

CREATE POLICY "Admins pueden gestionar todos los horarios"
    ON barber_working_hours FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- =====================================================
-- PASO 7: CREAR VISTAS ÚTILES
-- =====================================================

-- Vista para obtener disponibilidad completa del barbero
CREATE OR REPLACE VIEW v_barber_availability AS
SELECT 
    b.id as barber_id,
    b.display_name as barber_name,
    b.barbershop_id,
    bwh.day_of_week,
    bwh.is_working,
    bwh.start_time,
    bwh.end_time,
    bwh.break_start,
    bwh.break_end,
    bh.open_time as barbershop_open,
    bh.close_time as barbershop_close,
    bh.is_closed as barbershop_closed
FROM barbers b
LEFT JOIN barber_working_hours bwh ON b.id = bwh.barber_id
LEFT JOIN barbershop_hours bh ON (
    b.barbershop_id = bh.barbershop_id 
    AND bwh.day_of_week = bh.day_of_week
)
WHERE b.is_active = true;

-- =====================================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- =====================================================

COMMENT ON TABLE barber_working_hours IS 'Horarios de trabajo individuales de cada barbero, incluyendo sus descansos diarios';
COMMENT ON COLUMN barber_working_hours.is_working IS 'Indica si el barbero trabaja ese día de la semana';
COMMENT ON COLUMN barber_working_hours.break_start IS 'Hora de inicio del descanso/almuerzo del barbero';
COMMENT ON COLUMN barber_working_hours.break_end IS 'Hora de fin del descanso/almuerzo del barbero';

-- =====================================================
-- FIN DE LA MIGRACIÓN
-- =====================================================