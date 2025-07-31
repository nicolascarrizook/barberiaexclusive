-- Migration: Barbershop Hours System
-- Version: 004
-- Date: 2025-01-30
-- Description: Implements barbershop-level hours and barber breaks tables
-- Compatible with PostgreSQL 15+ and Supabase

-- =====================================================
-- PASO 1: CREAR TABLA DE HORARIOS DE BARBERÍA
-- =====================================================

-- Tabla para horarios por defecto de la barbería
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
    
    -- Una entrada por día por barbería (null = horario por defecto del sistema)
    UNIQUE(barbershop_id, day_of_week),
    
    -- Validaciones
    CONSTRAINT valid_hours CHECK (
        is_closed = true OR 
        (open_time IS NOT NULL AND close_time IS NOT NULL AND close_time > open_time)
    ),
    CONSTRAINT valid_break CHECK (
        (break_start IS NULL AND break_end IS NULL) OR
        (break_start IS NOT NULL AND break_end IS NOT NULL AND 
         break_start >= open_time AND break_end <= close_time AND
         break_end > break_start)
    )
);

-- Índices para optimización
CREATE INDEX idx_barbershop_hours_barbershop ON barbershop_hours(barbershop_id);
CREATE INDEX idx_barbershop_hours_day ON barbershop_hours(day_of_week);

-- =====================================================
-- PASO 2: CREAR TABLA DE DESCANSOS DE BARBEROS
-- =====================================================

-- Tabla para descansos dinámicos de barberos
CREATE TABLE IF NOT EXISTS barber_breaks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    reason TEXT,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Validaciones
    CONSTRAINT valid_break_time CHECK (end_time > start_time),
    CONSTRAINT valid_break_duration CHECK (
        EXTRACT(EPOCH FROM (end_time - start_time)) >= 900 -- Mínimo 15 minutos
    ),
    CONSTRAINT valid_recurrence CHECK (
        (is_recurring = false) OR 
        (is_recurring = true AND recurrence_end_date IS NOT NULL AND recurrence_end_date > date)
    )
);

-- Índices para búsquedas eficientes
CREATE INDEX idx_barber_breaks_barber ON barber_breaks(barber_id);
CREATE INDEX idx_barber_breaks_date ON barber_breaks(date);
CREATE INDEX idx_barber_breaks_barber_date ON barber_breaks(barber_id, date);

-- =====================================================
-- PASO 3: CREAR TABLAS DE GESTIÓN DE CAPACIDAD
-- =====================================================

-- Configuración de capacidad por franja horaria
CREATE TABLE IF NOT EXISTS capacity_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    time_slot TIME NOT NULL,
    day_of_week day_of_week,
    max_capacity INTEGER NOT NULL,
    current_capacity INTEGER DEFAULT 0,
    peak_hour_multiplier DECIMAL(3,2) DEFAULT 1.0,
    allow_overbooking BOOLEAN DEFAULT false,
    overbooking_limit INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Una configuración por slot de tiempo y día (opcional)
    UNIQUE(barbershop_id, time_slot, day_of_week),
    
    -- Validaciones
    CONSTRAINT valid_capacity CHECK (max_capacity > 0),
    CONSTRAINT valid_multiplier CHECK (peak_hour_multiplier >= 0.5 AND peak_hour_multiplier <= 3.0),
    CONSTRAINT valid_overbooking CHECK (
        (allow_overbooking = false AND overbooking_limit = 0) OR
        (allow_overbooking = true AND overbooking_limit >= 0)
    ),
    CONSTRAINT valid_current_capacity CHECK (current_capacity >= 0)
);

-- Configuración de horas pico
CREATE TABLE IF NOT EXISTS peak_hours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    day_of_week day_of_week NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.5,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Validaciones
    CONSTRAINT valid_peak_hours CHECK (end_time > start_time),
    CONSTRAINT valid_peak_multiplier CHECK (multiplier >= 1.0 AND multiplier <= 3.0)
);

-- Índices para capacidad
CREATE INDEX idx_capacity_config_barbershop ON capacity_config(barbershop_id);
CREATE INDEX idx_capacity_config_slot ON capacity_config(barbershop_id, time_slot);
CREATE INDEX idx_peak_hours_barbershop ON peak_hours(barbershop_id);
CREATE INDEX idx_peak_hours_active ON peak_hours(barbershop_id, is_active);

-- =====================================================
-- PASO 4: CREAR TRIGGERS DE ACTUALIZACIÓN
-- =====================================================

-- Trigger para updated_at en barbershop_hours
CREATE TRIGGER update_barbershop_hours_updated_at
    BEFORE UPDATE ON barbershop_hours
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para updated_at en barber_breaks
CREATE TRIGGER update_barber_breaks_updated_at
    BEFORE UPDATE ON barber_breaks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para updated_at en capacity_config
CREATE TRIGGER update_capacity_config_updated_at
    BEFORE UPDATE ON capacity_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para updated_at en peak_hours
CREATE TRIGGER update_peak_hours_updated_at
    BEFORE UPDATE ON peak_hours
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PASO 5: CREAR FUNCIONES HELPER
-- =====================================================

-- Función para obtener el horario efectivo de una barbería
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

-- Función para verificar capacidad disponible
CREATE OR REPLACE FUNCTION check_capacity_available(
    p_barbershop_id UUID,
    p_date DATE,
    p_time TIME
)
RETURNS TABLE (
    available BOOLEAN,
    current_capacity INTEGER,
    max_capacity INTEGER,
    with_overbooking INTEGER
) AS $$
DECLARE
    v_day_of_week day_of_week;
    v_config capacity_config%ROWTYPE;
    v_peak_multiplier DECIMAL(3,2) DEFAULT 1.0;
    v_appointment_count INTEGER;
BEGIN
    -- Obtener día de la semana
    v_day_of_week := get_day_of_week(p_date);
    
    -- Obtener configuración de capacidad
    SELECT * INTO v_config
    FROM capacity_config
    WHERE barbershop_id = p_barbershop_id
    AND time_slot = p_time
    AND (day_of_week = v_day_of_week OR day_of_week IS NULL)
    AND is_active = true
    ORDER BY day_of_week DESC NULLS LAST
    LIMIT 1;
    
    -- Si no hay configuración, usar valores por defecto
    IF v_config IS NULL THEN
        -- Contar barberos activos como capacidad base
        SELECT COUNT(*) INTO v_config.max_capacity
        FROM barbers
        WHERE barbershop_id = p_barbershop_id
        AND is_active = true;
        
        v_config.allow_overbooking := false;
        v_config.overbooking_limit := 0;
    END IF;
    
    -- Verificar si es hora pico
    SELECT multiplier INTO v_peak_multiplier
    FROM peak_hours
    WHERE barbershop_id = p_barbershop_id
    AND day_of_week = v_day_of_week
    AND start_time <= p_time
    AND end_time > p_time
    AND is_active = true
    LIMIT 1;
    
    -- Aplicar multiplicador de hora pico
    v_config.max_capacity := CEIL(v_config.max_capacity * COALESCE(v_peak_multiplier, 1.0));
    
    -- Contar citas actuales
    SELECT COUNT(*) INTO v_appointment_count
    FROM appointments
    WHERE barbershop_id = p_barbershop_id
    AND DATE(start_time) = p_date
    AND start_time::TIME <= p_time
    AND end_time::TIME > p_time
    AND status IN ('scheduled', 'confirmed', 'in_progress');
    
    -- Retornar resultado
    RETURN QUERY
    SELECT 
        v_appointment_count < v_config.max_capacity as available,
        v_appointment_count as current_capacity,
        v_config.max_capacity::INTEGER as max_capacity,
        (v_config.max_capacity + v_config.overbooking_limit)::INTEGER as with_overbooking;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PASO 6: CONFIGURAR RLS (Row Level Security)
-- =====================================================

-- Habilitar RLS
ALTER TABLE barbershop_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacity_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE peak_hours ENABLE ROW LEVEL SECURITY;

-- Políticas para barbershop_hours
CREATE POLICY "Todos pueden ver horarios de barbería"
    ON barbershop_hours FOR SELECT
    USING (true);

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

-- Políticas para barber_breaks
CREATE POLICY "Todos pueden ver descansos"
    ON barber_breaks FOR SELECT
    USING (true);

CREATE POLICY "Barberos pueden gestionar sus propios descansos"
    ON barber_breaks FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM barbers
            WHERE id = barber_id
            AND profile_id = auth.uid()
        )
    );

CREATE POLICY "Owners pueden gestionar descansos de sus barberos"
    ON barber_breaks FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM barbers b
            JOIN barbershops bs ON b.barbershop_id = bs.id
            WHERE b.id = barber_id
            AND bs.owner_id = auth.uid()
        )
    );

-- Políticas para capacity_config
CREATE POLICY "Todos pueden ver configuración de capacidad"
    ON capacity_config FOR SELECT
    USING (true);

CREATE POLICY "Owners pueden gestionar capacidad de su barbería"
    ON capacity_config FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM barbershops
            WHERE id = barbershop_id
            AND owner_id = auth.uid()
        )
    );

-- Políticas para peak_hours
CREATE POLICY "Todos pueden ver horas pico"
    ON peak_hours FOR SELECT
    USING (true);

CREATE POLICY "Owners pueden gestionar horas pico de su barbería"
    ON peak_hours FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM barbershops
            WHERE id = barbershop_id
            AND owner_id = auth.uid()
        )
    );

-- =====================================================
-- PASO 7: INSERTAR HORARIOS POR DEFECTO
-- =====================================================

-- Horarios por defecto del sistema (barbershop_id = NULL)
INSERT INTO barbershop_hours (barbershop_id, day_of_week, is_closed, open_time, close_time, break_start, break_end)
VALUES 
    (NULL, 'monday', false, '09:00', '20:00', '13:00', '14:00'),
    (NULL, 'tuesday', false, '09:00', '20:00', '13:00', '14:00'),
    (NULL, 'wednesday', false, '09:00', '20:00', '13:00', '14:00'),
    (NULL, 'thursday', false, '09:00', '20:00', '13:00', '14:00'),
    (NULL, 'friday', false, '09:00', '20:00', '13:00', '14:00'),
    (NULL, 'saturday', false, '10:00', '18:00', NULL, NULL),
    (NULL, 'sunday', true, NULL, NULL, NULL, NULL)
ON CONFLICT (barbershop_id, day_of_week) DO NOTHING;

-- =====================================================
-- PASO 8: CREAR VISTAS ÚTILES
-- =====================================================

-- Vista para disponibilidad con capacidad
CREATE OR REPLACE VIEW v_availability_with_capacity AS
SELECT 
    a.barbershop_id,
    a.date,
    a.time_slot,
    a.total_barbers,
    a.available_barbers,
    c.available as has_capacity,
    c.current_capacity,
    c.max_capacity,
    c.with_overbooking as max_with_overbooking,
    CASE 
        WHEN c.current_capacity >= c.max_capacity THEN 'full'
        WHEN c.current_capacity >= c.max_capacity * 0.8 THEN 'high'
        WHEN c.current_capacity >= c.max_capacity * 0.5 THEN 'medium'
        ELSE 'low'
    END as utilization_level
FROM (
    -- Subconsulta para disponibilidad de barberos
    SELECT 
        b.barbershop_id,
        CURRENT_DATE as date,
        '09:00'::TIME as time_slot,
        COUNT(*) as total_barbers,
        COUNT(*) FILTER (WHERE b.is_active = true) as available_barbers
    FROM barbers b
    GROUP BY b.barbershop_id
) a
CROSS JOIN LATERAL check_capacity_available(
    a.barbershop_id, 
    a.date, 
    a.time_slot
) c;

-- =====================================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- =====================================================

COMMENT ON TABLE barbershop_hours IS 'Horarios de operación de las barberías. NULL en barbershop_id indica horario por defecto del sistema.';
COMMENT ON TABLE barber_breaks IS 'Descansos programados de los barberos, puede ser recurrente o único.';
COMMENT ON TABLE capacity_config IS 'Configuración de capacidad máxima por franja horaria y día.';
COMMENT ON TABLE peak_hours IS 'Definición de horas pico con multiplicadores de capacidad.';

COMMENT ON COLUMN barbershop_hours.barbershop_id IS 'NULL indica horario por defecto para todas las barberías.';
COMMENT ON COLUMN barber_breaks.is_recurring IS 'Si es true, el descanso se repite hasta recurrence_end_date.';
COMMENT ON COLUMN capacity_config.peak_hour_multiplier IS 'Multiplicador aplicado durante horas pico (1.0 = sin cambio).';
COMMENT ON COLUMN peak_hours.multiplier IS 'Factor por el cual se multiplica la capacidad base durante estas horas.';

-- =====================================================
-- FIN DE LA MIGRACIÓN
-- =====================================================