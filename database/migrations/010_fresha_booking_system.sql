-- =====================================================
-- FRESHA-STYLE BOOKING SYSTEM MIGRATION
-- Complete replacement of broken booking system
-- Features: Multiple services, waitlist, notifications, analytics
-- =====================================================

BEGIN;

-- Drop old broken appointments table if exists
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS appointment_services CASCADE;
DROP TABLE IF EXISTS availability_cache CASCADE;
DROP TABLE IF EXISTS booking_attempts CASCADE;

-- =====================================================
-- CORE APPOINTMENTS TABLE - FRESHA STYLE
-- =====================================================

CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- References principales
    barbershop_id UUID NOT NULL REFERENCES barbershops(id),
    barber_id UUID NOT NULL REFERENCES barbers(id),
    customer_id UUID NOT NULL REFERENCES profiles(id),
    
    -- Timestamps con timezone
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    
    -- Estado y tracking
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    confirmation_code VARCHAR(10) UNIQUE NOT NULL,
    
    -- Datos financieros
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    tip_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    
    -- Pagos
    payment_status VARCHAR(20) DEFAULT 'pending',
    payment_method VARCHAR(30),
    paid_at TIMESTAMPTZ,
    
    -- Metadata
    source VARCHAR(20) NOT NULL DEFAULT 'online', 
    notes TEXT,
    internal_notes TEXT,
    customer_requests TEXT,
    
    -- Cancelación
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID,
    cancellation_reason TEXT,
    cancellation_fee DECIMAL(10,2) DEFAULT 0,
    
    -- No-show tracking
    marked_no_show BOOLEAN DEFAULT FALSE,
    no_show_fee DECIMAL(10,2) DEFAULT 0,
    
    -- Ratings y feedback
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    rated_at TIMESTAMPTZ,
    
    -- Datos de creación
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    
    -- Constraints
    CONSTRAINT valid_times CHECK (end_at > start_at),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'confirmed', 'arrived', 'in_progress', 'completed', 'cancelled', 'no_show'))
);

-- =====================================================
-- APPOINTMENT SERVICES - MULTIPLE SERVICES PER APPOINTMENT
-- =====================================================

CREATE TABLE appointment_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id),
    
    -- Orden y timing
    order_index INTEGER NOT NULL,
    start_offset_minutes INTEGER NOT NULL DEFAULT 0, -- minutos desde el inicio del appointment
    duration_minutes INTEGER NOT NULL,
    
    -- Pricing
    unit_price DECIMAL(10,2) NOT NULL,
    quantity INTEGER DEFAULT 1,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    final_price DECIMAL(10,2) NOT NULL,
    
    -- Staff assignment (para servicios que requieren múltiple staff)
    performed_by UUID REFERENCES barbers(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- AVAILABILITY SYSTEM - OPTIMIZED FOR PERFORMANCE
-- =====================================================

CREATE TABLE availability_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barber_id UUID NOT NULL REFERENCES barbers(id),
    
    -- Reglas recurrentes
    day_of_week INTEGER, -- 0-6, NULL para reglas especiales
    start_time TIME,
    end_time TIME,
    
    -- Reglas de fecha específica
    specific_date DATE,
    
    -- Tipo de regla
    rule_type VARCHAR(20) NOT NULL, -- 'working', 'break', 'blocked'
    
    -- Metadata
    title VARCHAR(100),
    recurrence_pattern JSONB, -- para patrones complejos
    
    -- Validez
    valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_rule_type CHECK (rule_type IN ('working', 'break', 'blocked'))
);

-- =====================================================
-- PRE-CALCULATED SLOTS FOR PERFORMANCE (FRESHA STYLE)
-- =====================================================

CREATE TABLE availability_slots (
    barber_id UUID NOT NULL REFERENCES barbers(id),
    slot_date DATE NOT NULL,
    slot_time TIME NOT NULL,
    
    -- Estado del slot
    is_available BOOLEAN DEFAULT TRUE,
    appointment_id UUID REFERENCES appointments(id),
    block_reason VARCHAR(50), -- 'appointment', 'break', 'blocked', etc
    
    -- Capacidad (para servicios simultáneos si se permite)
    capacity INTEGER DEFAULT 1,
    used_capacity INTEGER DEFAULT 0,
    
    -- Cache metadata
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (barber_id, slot_date, slot_time)
);

-- =====================================================
-- CALENDAR BLOCKS (VACATIONS, EVENTS, ETC)
-- =====================================================

CREATE TABLE calendar_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID REFERENCES barbershops(id),
    barber_id UUID REFERENCES barbers(id),
    
    -- Timing
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    all_day BOOLEAN DEFAULT FALSE,
    
    -- Detalles
    block_type VARCHAR(30) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Recurrencia
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_rule JSONB,
    recurrence_end DATE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID NOT NULL,
    
    CONSTRAINT valid_block_type CHECK (block_type IN ('vacation', 'sick_leave', 'personal', 'training', 'meeting', 'other'))
);

-- =====================================================
-- INTELLIGENT WAITLIST
-- =====================================================

CREATE TABLE waitlist_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id),
    customer_id UUID NOT NULL REFERENCES profiles(id),
    
    -- Preferencias
    service_ids UUID[] NOT NULL,
    preferred_barber_ids UUID[],
    any_barber BOOLEAN DEFAULT FALSE,
    
    -- Ventanas de tiempo
    earliest_date DATE NOT NULL,
    latest_date DATE NOT NULL,
    preferred_times JSONB, -- {monday: {from: "09:00", to: "17:00"}, ...}
    any_time BOOLEAN DEFAULT FALSE,
    
    -- Estado
    status VARCHAR(20) DEFAULT 'active',
    matched_appointment_id UUID REFERENCES appointments(id),
    
    -- Comunicación
    notification_preference VARCHAR(20) DEFAULT 'both', -- 'email', 'sms', 'both'
    last_notified_at TIMESTAMPTZ,
    notification_count INTEGER DEFAULT 0,
    
    -- Metadata
    priority INTEGER DEFAULT 0,
    notes TEXT,
    expires_at DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_waitlist_status CHECK (status IN ('active', 'matched', 'booked', 'expired', 'cancelled'))
);

-- =====================================================
-- BOOKING SETTINGS - BUSINESS RULES
-- =====================================================

CREATE TABLE booking_settings (
    barbershop_id UUID PRIMARY KEY REFERENCES barbershops(id),
    
    -- Ventanas de reserva
    advance_booking_days INTEGER DEFAULT 60,
    same_day_booking_cutoff TIME DEFAULT '18:00',
    minimum_notice_hours INTEGER DEFAULT 2,
    
    -- Políticas de cancelación
    free_cancellation_hours INTEGER DEFAULT 24,
    cancellation_fee_percent DECIMAL(5,2) DEFAULT 0,
    no_show_fee_amount DECIMAL(10,2) DEFAULT 0,
    
    -- Configuración de slots
    slot_duration_minutes INTEGER DEFAULT 15,
    buffer_time_minutes INTEGER DEFAULT 0,
    cleanup_time_minutes INTEGER DEFAULT 5,
    
    -- Reglas de negocio
    allow_back_to_back BOOLEAN DEFAULT TRUE,
    allow_double_booking BOOLEAN DEFAULT FALSE,
    max_advance_bookings_per_customer INTEGER DEFAULT 3,
    require_deposit BOOLEAN DEFAULT FALSE,
    deposit_amount DECIMAL(10,2) DEFAULT 0,
    
    -- Horarios especiales
    holiday_schedules JSONB,
    special_hours JSONB,
    
    -- Notificaciones
    reminder_hours INTEGER[] DEFAULT ARRAY[24, 2],
    enable_sms_reminders BOOLEAN DEFAULT TRUE,
    enable_email_reminders BOOLEAN DEFAULT TRUE,
    enable_waitlist_notifications BOOLEAN DEFAULT TRUE,
    
    -- Integraciones
    google_calendar_sync BOOLEAN DEFAULT FALSE,
    apple_calendar_sync BOOLEAN DEFAULT FALSE,
    
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- AUDIT TRAIL - COMPLETE CHANGE HISTORY
-- =====================================================

CREATE TABLE appointment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointments(id),
    
    -- Cambio realizado
    action VARCHAR(50) NOT NULL,
    field_name VARCHAR(50),
    old_value TEXT,
    new_value TEXT,
    
    -- Quién y cuándo
    performed_by UUID NOT NULL,
    performed_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Context
    reason TEXT,
    ip_address INET,
    user_agent TEXT
);

-- =====================================================
-- INDICES CRÍTICOS PARA PERFORMANCE
-- =====================================================

-- Appointments
CREATE INDEX idx_appointments_barber_date ON appointments(barber_id, start_at);
CREATE INDEX idx_appointments_customer ON appointments(customer_id, start_at DESC);
CREATE INDEX idx_appointments_status ON appointments(status) WHERE status IN ('pending', 'confirmed');
CREATE INDEX idx_appointments_date_range ON appointments(start_at, end_at);
CREATE INDEX idx_appointments_confirmation_code ON appointments(confirmation_code);

-- Availability
CREATE INDEX idx_availability_slots_lookup ON availability_slots(barber_id, slot_date, is_available) WHERE is_available = true;
CREATE INDEX idx_availability_slots_date ON availability_slots(slot_date);

-- Services
CREATE INDEX idx_appointment_services_appointment ON appointment_services(appointment_id);
CREATE INDEX idx_appointment_services_order ON appointment_services(appointment_id, order_index);

-- Waitlist
CREATE INDEX idx_waitlist_active ON waitlist_entries(barbershop_id, status) WHERE status = 'active';

-- =====================================================
-- TRIGGERS PARA MANTENER CONSISTENCIA
-- =====================================================

-- Auto-update appointment total when services change
CREATE OR REPLACE FUNCTION update_appointment_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE appointments 
    SET 
        total_amount = (
            SELECT COALESCE(SUM(final_price), 0)
            FROM appointment_services
            WHERE appointment_id = COALESCE(NEW.appointment_id, OLD.appointment_id)
        ) + COALESCE(tip_amount, 0) - COALESCE(discount_amount, 0),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.appointment_id, OLD.appointment_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_appointment_total
    AFTER INSERT OR UPDATE OR DELETE ON appointment_services
    FOR EACH ROW EXECUTE FUNCTION update_appointment_total();

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INITIAL BOOKING SETTINGS FOR EXISTING BARBERSHOPS
-- =====================================================

INSERT INTO booking_settings (barbershop_id)
SELECT id FROM barbershops
ON CONFLICT (barbershop_id) DO NOTHING;

COMMIT;