-- =====================================================
-- SCRIPT DE APLICACIÓN DE MIGRACIONES
-- Fecha: 2025-01-30
-- Descripción: Aplica las migraciones necesarias para el sistema de horarios
-- =====================================================

-- IMPORTANTE: Ejecutar en el siguiente orden:

-- 1. Primero aplicar la migración 004 (barbershop_hours_system)
-- Esta crea las tablas: barbershop_hours, barber_breaks, capacity_config, peak_hours

-- 2. Luego aplicar la migración 007 (barber_working_hours)
-- Esta crea la tabla: barber_working_hours

-- 3. Verificar que las tablas se crearon correctamente
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('barbershop_hours', 'barber_breaks', 'capacity_config', 'peak_hours', 'barber_working_hours')
        THEN 'NUEVA TABLA - OK'
        ELSE 'TABLA EXISTENTE'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'barbershop_hours',
    'barber_breaks', 
    'capacity_config',
    'peak_hours',
    'barber_working_hours',
    'working_hours' -- tabla antigua
)
ORDER BY table_name;

-- 4. Verificar que los datos por defecto se insertaron
SELECT * FROM barbershop_hours WHERE barbershop_id IS NULL ORDER BY day_of_week;

-- 5. Verificar las políticas RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename IN ('barbershop_hours', 'barber_breaks', 'capacity_config', 'peak_hours', 'barber_working_hours')
ORDER BY tablename, policyname;