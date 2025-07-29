-- Barbershop Booking System - Database Schema
-- Version: 1.0.0
-- Database: PostgreSQL 15+ with Supabase extensions

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- For location-based features

-- Clean up existing schema (development only)
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- =====================================================
-- ENUMS AND CUSTOM TYPES
-- =====================================================

-- User roles
CREATE TYPE user_role AS ENUM ('customer', 'barber', 'admin', 'owner');

-- Appointment status
CREATE TYPE appointment_status AS ENUM (
    'pending',
    'confirmed', 
    'in_progress',
    'completed',
    'cancelled',
    'no_show'
);

-- Payment status
CREATE TYPE payment_status AS ENUM (
    'pending',
    'paid',
    'partially_paid',
    'refunded',
    'cancelled'
);

-- Payment method
CREATE TYPE payment_method AS ENUM (
    'cash',
    'credit_card',
    'debit_card',
    'mobile_payment',
    'other'
);

-- Notification type
CREATE TYPE notification_type AS ENUM (
    'appointment_reminder',
    'appointment_confirmation',
    'appointment_cancellation',
    'appointment_rescheduled',
    'promotion',
    'general'
);

-- Notification channel
CREATE TYPE notification_channel AS ENUM ('email', 'sms', 'push', 'in_app');

-- Day of week
CREATE TYPE day_of_week AS ENUM (
    'monday',
    'tuesday', 
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday'
);

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    role user_role NOT NULL DEFAULT 'customer',
    is_active BOOLEAN DEFAULT true,
    preferred_language TEXT DEFAULT 'es',
    notification_preferences JSONB DEFAULT '{
        "email": true,
        "sms": true,
        "push": true,
        "appointment_reminders": true,
        "promotions": false
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT phone_format CHECK (phone ~ '^\+?[1-9]\d{1,14}$' OR phone IS NULL)
);

-- Barbershops table
CREATE TABLE barbershops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    logo_url TEXT,
    cover_image_url TEXT,
    owner_id UUID NOT NULL REFERENCES profiles(id),
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT,
    country TEXT DEFAULT 'AR',
    location GEOGRAPHY(POINT, 4326), -- PostGIS point for geolocation
    phone TEXT NOT NULL,
    email TEXT,
    website TEXT,
    social_media JSONB DEFAULT '{}'::jsonb,
    settings JSONB DEFAULT '{
        "appointment_duration_default": 30,
        "appointment_buffer_time": 15,
        "max_advance_booking_days": 30,
        "min_advance_booking_hours": 2,
        "cancellation_policy_hours": 24,
        "require_deposit": false,
        "deposit_percentage": 0,
        "auto_confirm_appointments": false,
        "allow_walk_ins": true,
        "time_zone": "America/Argentina/Buenos_Aires"
    }'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9-]+$')
);

-- Barbers table
CREATE TABLE barbers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    bio TEXT,
    specialties TEXT[],
    years_experience INTEGER,
    instagram_handle TEXT,
    is_active BOOLEAN DEFAULT true,
    commission_percentage DECIMAL(5,2) DEFAULT 0,
    can_accept_tips BOOLEAN DEFAULT true,
    rating DECIMAL(3,2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id, barbershop_id),
    CONSTRAINT commission_range CHECK (commission_percentage >= 0 AND commission_percentage <= 100),
    CONSTRAINT rating_range CHECK (rating >= 0 AND rating <= 5)
);

-- Services table
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    category TEXT,
    image_url TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT duration_positive CHECK (duration_minutes > 0),
    CONSTRAINT price_non_negative CHECK (price >= 0)
);

-- Barber services (many-to-many)
CREATE TABLE barber_services (
    barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    custom_price DECIMAL(10,2),
    custom_duration_minutes INTEGER,
    is_available BOOLEAN DEFAULT true,
    PRIMARY KEY (barber_id, service_id),
    CONSTRAINT custom_price_non_negative CHECK (custom_price IS NULL OR custom_price >= 0),
    CONSTRAINT custom_duration_positive CHECK (custom_duration_minutes IS NULL OR custom_duration_minutes > 0)
);

-- Working hours template
CREATE TABLE working_hours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
    day_of_week day_of_week NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_working BOOLEAN DEFAULT true,
    break_start TIME,
    break_end TIME,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(barber_id, day_of_week),
    CONSTRAINT valid_hours CHECK (start_time < end_time),
    CONSTRAINT valid_break CHECK (
        (break_start IS NULL AND break_end IS NULL) OR
        (break_start IS NOT NULL AND break_end IS NOT NULL AND break_start < break_end AND break_start >= start_time AND break_end <= end_time)
    )
);

-- Special dates (holidays, special schedules)
CREATE TABLE special_dates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    barber_id UUID REFERENCES barbers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    is_holiday BOOLEAN DEFAULT false,
    custom_hours JSONB, -- {"start": "10:00", "end": "18:00", "breaks": [{"start": "13:00", "end": "14:00"}]}
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT has_entity CHECK (
        (barbershop_id IS NOT NULL AND barber_id IS NULL) OR
        (barbershop_id IS NULL AND barber_id IS NOT NULL)
    )
);

-- Appointments table
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id),
    barber_id UUID NOT NULL REFERENCES barbers(id),
    customer_id UUID NOT NULL REFERENCES profiles(id),
    service_id UUID NOT NULL REFERENCES services(id),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status appointment_status NOT NULL DEFAULT 'pending',
    price DECIMAL(10,2) NOT NULL,
    notes TEXT,
    internal_notes TEXT, -- Only visible to barber/admin
    confirmation_code TEXT UNIQUE,
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES profiles(id),
    cancellation_reason TEXT,
    no_show_marked_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    reminder_sent BOOLEAN DEFAULT false,
    reminder_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_time_range CHECK (start_time < end_time),
    CONSTRAINT future_appointment CHECK (start_time > NOW()),
    CONSTRAINT price_non_negative CHECK (price >= 0)
);

-- Create indexes for appointment queries
CREATE INDEX idx_appointments_barbershop_date ON appointments(barbershop_id, start_time);
CREATE INDEX idx_appointments_barber_date ON appointments(barber_id, start_time);
CREATE INDEX idx_appointments_customer_date ON appointments(customer_id, start_time);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_start_time ON appointments(start_time);

-- Payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID NOT NULL REFERENCES appointments(id),
    amount DECIMAL(10,2) NOT NULL,
    tip_amount DECIMAL(10,2) DEFAULT 0,
    status payment_status NOT NULL DEFAULT 'pending',
    method payment_method,
    transaction_id TEXT,
    processed_at TIMESTAMPTZ,
    notes TEXT,
    refund_amount DECIMAL(10,2) DEFAULT 0,
    refunded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT amount_positive CHECK (amount > 0),
    CONSTRAINT tip_non_negative CHECK (tip_amount >= 0),
    CONSTRAINT refund_non_negative CHECK (refund_amount >= 0)
);

-- Reviews table
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID NOT NULL REFERENCES appointments(id),
    customer_id UUID NOT NULL REFERENCES profiles(id),
    barber_id UUID NOT NULL REFERENCES barbers(id),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id),
    rating INTEGER NOT NULL,
    comment TEXT,
    is_visible BOOLEAN DEFAULT true,
    reply TEXT,
    replied_at TIMESTAMPTZ,
    replied_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(appointment_id),
    CONSTRAINT rating_valid CHECK (rating >= 1 AND rating <= 5)
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID NOT NULL REFERENCES profiles(id),
    type notification_type NOT NULL,
    channel notification_channel NOT NULL,
    subject TEXT,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    scheduled_for TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification templates
CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    channel notification_channel NOT NULL,
    language TEXT DEFAULT 'es',
    subject_template TEXT,
    content_template TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(barbershop_id, type, channel, language)
);

-- Waiting list
CREATE TABLE waiting_list (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id),
    customer_id UUID NOT NULL REFERENCES profiles(id),
    barber_id UUID REFERENCES barbers(id),
    service_id UUID REFERENCES services(id),
    preferred_date DATE NOT NULL,
    preferred_time_start TIME,
    preferred_time_end TIME,
    flexibility_days INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    notified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT flexibility_non_negative CHECK (flexibility_days >= 0)
);

-- Promotions table
CREATE TABLE promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    discount_percentage DECIMAL(5,2),
    discount_amount DECIMAL(10,2),
    code TEXT UNIQUE,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    max_uses INTEGER,
    uses_count INTEGER DEFAULT 0,
    applicable_services UUID[],
    applicable_barbers UUID[],
    minimum_amount DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_dates CHECK (start_date < end_date),
    CONSTRAINT has_discount CHECK (
        (discount_percentage IS NOT NULL AND discount_percentage > 0 AND discount_percentage <= 100) OR
        (discount_amount IS NOT NULL AND discount_amount > 0)
    ),
    CONSTRAINT max_uses_positive CHECK (max_uses IS NULL OR max_uses > 0)
);

-- Analytics events table
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbershop_id UUID REFERENCES barbershops(id),
    user_id UUID REFERENCES profiles(id),
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create partition for analytics by month
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX idx_analytics_events_barbershop ON analytics_events(barbershop_id);
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);