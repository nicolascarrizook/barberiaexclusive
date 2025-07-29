-- =====================================================
-- SEED DATA FOR DEVELOPMENT/TESTING
-- =====================================================

-- Insert test profiles
INSERT INTO profiles (id, email, phone, full_name, role) VALUES
    ('d7c2e8f0-1234-5678-9abc-def012345678', 'owner@test.com', '+541234567890', 'Juan Pérez', 'owner'),
    ('a1b2c3d4-5678-9abc-def0-123456789abc', 'barber1@test.com', '+541234567891', 'Carlos Rodríguez', 'barber'),
    ('b2c3d4e5-6789-abcd-ef01-23456789abcd', 'barber2@test.com', '+541234567892', 'Miguel Sánchez', 'barber'),
    ('c3d4e5f6-789a-bcde-f012-3456789abcde', 'customer1@test.com', '+541234567893', 'Ana Martínez', 'customer'),
    ('d4e5f6a7-89ab-cdef-0123-456789abcdef', 'customer2@test.com', '+541234567894', 'Laura Gómez', 'customer');

-- Insert test barbershop
INSERT INTO barbershops (
    id,
    name,
    slug,
    description,
    owner_id,
    address,
    city,
    state,
    zip_code,
    phone,
    email,
    settings
) VALUES (
    'e5f6a7b8-9abc-def0-1234-56789abcdef0',
    'Barbería Premium',
    'barberia-premium',
    'La mejor barbería de la ciudad con servicios de primera calidad',
    'd7c2e8f0-1234-5678-9abc-def012345678',
    'Av. Corrientes 1234',
    'Buenos Aires',
    'CABA',
    '1043',
    '+541134567890',
    'info@barberiapremium.com',
    '{
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
    }'::jsonb
);

-- Insert barbers
INSERT INTO barbers (
    id,
    profile_id,
    barbershop_id,
    display_name,
    bio,
    specialties,
    years_experience,
    commission_percentage
) VALUES
    (
        'f6a7b8c9-abcd-ef01-2345-6789abcdef01',
        'a1b2c3d4-5678-9abc-def0-123456789abc',
        'e5f6a7b8-9abc-def0-1234-56789abcdef0',
        'Carlos',
        'Especialista en cortes clásicos y modernos',
        ARRAY['Corte clásico', 'Barba', 'Afeitado tradicional'],
        8,
        60
    ),
    (
        'a7b8c9d0-bcde-f012-3456-789abcdef012',
        'b2c3d4e5-6789-abcd-ef01-23456789abcd',
        'e5f6a7b8-9abc-def0-1234-56789abcdef0',
        'Miguel',
        'Experto en estilos modernos y coloración',
        ARRAY['Corte moderno', 'Coloración', 'Diseños'],
        5,
        50
    );

-- Insert services
INSERT INTO services (
    id,
    barbershop_id,
    name,
    description,
    duration_minutes,
    price,
    category,
    order_index
) VALUES
    (
        'b8c9d0e1-cdef-0123-4567-89abcdef0123',
        'e5f6a7b8-9abc-def0-1234-56789abcdef0',
        'Corte de Cabello',
        'Corte de cabello personalizado según tu estilo',
        30,
        2500.00,
        'Cabello',
        1
    ),
    (
        'c9d0e1f2-def0-1234-5678-9abcdef01234',
        'e5f6a7b8-9abc-def0-1234-56789abcdef0',
        'Corte + Barba',
        'Servicio completo de corte de cabello y arreglo de barba',
        45,
        3500.00,
        'Combos',
        2
    ),
    (
        'd0e1f2a3-ef01-2345-6789-abcdef012345',
        'e5f6a7b8-9abc-def0-1234-56789abcdef0',
        'Afeitado Clásico',
        'Afeitado tradicional con navaja y toalla caliente',
        30,
        2000.00,
        'Barba',
        3
    ),
    (
        'e1f2a3b4-f012-3456-789a-bcdef0123456',
        'e5f6a7b8-9abc-def0-1234-56789abcdef0',
        'Coloración',
        'Coloración profesional de cabello',
        60,
        4500.00,
        'Especiales',
        4
    );

-- Associate services with barbers
INSERT INTO barber_services (barber_id, service_id) VALUES
    ('f6a7b8c9-abcd-ef01-2345-6789abcdef01', 'b8c9d0e1-cdef-0123-4567-89abcdef0123'),
    ('f6a7b8c9-abcd-ef01-2345-6789abcdef01', 'c9d0e1f2-def0-1234-5678-9abcdef01234'),
    ('f6a7b8c9-abcd-ef01-2345-6789abcdef01', 'd0e1f2a3-ef01-2345-6789-abcdef012345'),
    ('a7b8c9d0-bcde-f012-3456-789abcdef012', 'b8c9d0e1-cdef-0123-4567-89abcdef0123'),
    ('a7b8c9d0-bcde-f012-3456-789abcdef012', 'c9d0e1f2-def0-1234-5678-9abcdef01234'),
    ('a7b8c9d0-bcde-f012-3456-789abcdef012', 'e1f2a3b4-f012-3456-789a-bcdef0123456');

-- Insert working hours for barbers
INSERT INTO working_hours (barber_id, day_of_week, start_time, end_time, break_start, break_end) VALUES
    -- Carlos
    ('f6a7b8c9-abcd-ef01-2345-6789abcdef01', 'monday', '09:00', '20:00', '13:00', '14:00'),
    ('f6a7b8c9-abcd-ef01-2345-6789abcdef01', 'tuesday', '09:00', '20:00', '13:00', '14:00'),
    ('f6a7b8c9-abcd-ef01-2345-6789abcdef01', 'wednesday', '09:00', '20:00', '13:00', '14:00'),
    ('f6a7b8c9-abcd-ef01-2345-6789abcdef01', 'thursday', '09:00', '20:00', '13:00', '14:00'),
    ('f6a7b8c9-abcd-ef01-2345-6789abcdef01', 'friday', '09:00', '20:00', '13:00', '14:00'),
    ('f6a7b8c9-abcd-ef01-2345-6789abcdef01', 'saturday', '09:00', '18:00', NULL, NULL),
    ('f6a7b8c9-abcd-ef01-2345-6789abcdef01', 'sunday', '10:00', '14:00', NULL, NULL),
    -- Miguel
    ('a7b8c9d0-bcde-f012-3456-789abcdef012', 'monday', '10:00', '21:00', '14:00', '15:00'),
    ('a7b8c9d0-bcde-f012-3456-789abcdef012', 'tuesday', '10:00', '21:00', '14:00', '15:00'),
    ('a7b8c9d0-bcde-f012-3456-789abcdef012', 'wednesday', '10:00', '21:00', '14:00', '15:00'),
    ('a7b8c9d0-bcde-f012-3456-789abcdef012', 'thursday', '10:00', '21:00', '14:00', '15:00'),
    ('a7b8c9d0-bcde-f012-3456-789abcdef012', 'friday', '10:00', '21:00', '14:00', '15:00'),
    ('a7b8c9d0-bcde-f012-3456-789abcdef012', 'saturday', '10:00', '19:00', NULL, NULL),
    ('a7b8c9d0-bcde-f012-3456-789abcdef012', 'sunday', NULL, NULL, NULL, NULL); -- No trabaja los domingos

-- Insert promotions
INSERT INTO promotions (
    barbershop_id,
    name,
    description,
    discount_percentage,
    code,
    start_date,
    end_date,
    max_uses
) VALUES
    (
        'e5f6a7b8-9abc-def0-1234-56789abcdef0',
        'Descuento Nuevo Cliente',
        '20% de descuento en tu primer corte',
        20,
        'NUEVO20',
        NOW(),
        NOW() + INTERVAL '90 days',
        100
    ),
    (
        'e5f6a7b8-9abc-def0-1234-56789abcdef0',
        'Promo Combo',
        '15% de descuento en servicios combo',
        15,
        'COMBO15',
        NOW(),
        NOW() + INTERVAL '30 days',
        50
    );

-- Insert notification templates
INSERT INTO notification_templates (
    barbershop_id,
    type,
    channel,
    language,
    subject_template,
    content_template
) VALUES
    (
        'e5f6a7b8-9abc-def0-1234-56789abcdef0',
        'appointment_confirmation',
        'email',
        'es',
        'Confirmación de turno - {{barbershop_name}}',
        'Hola {{customer_name}},\n\nTu turno ha sido confirmado:\n\nFecha: {{appointment_date}}\nHora: {{appointment_time}}\nServicio: {{service_name}}\nBarbero: {{barber_name}}\nCódigo de confirmación: {{confirmation_code}}\n\nTe esperamos!\n\n{{barbershop_name}}\n{{barbershop_address}}\n{{barbershop_phone}}'
    ),
    (
        'e5f6a7b8-9abc-def0-1234-56789abcdef0',
        'appointment_reminder',
        'sms',
        'es',
        NULL,
        'Recordatorio: Tienes un turno mañana a las {{appointment_time}} en {{barbershop_name}} con {{barber_name}}. Código: {{confirmation_code}}'
    ),
    (
        'e5f6a7b8-9abc-def0-1234-56789abcdef0',
        'appointment_cancellation',
        'email',
        'es',
        'Turno cancelado - {{barbershop_name}}',
        'Hola {{customer_name}},\n\nTu turno del {{appointment_date}} a las {{appointment_time}} ha sido cancelado.\n\nSi deseas reagendar, puedes hacerlo desde nuestra plataforma o contactarnos.\n\n{{barbershop_name}}\n{{barbershop_phone}}'
    );

-- Insert some sample appointments (future dates)
INSERT INTO appointments (
    barbershop_id,
    barber_id,
    customer_id,
    service_id,
    start_time,
    end_time,
    status,
    price,
    notes
) VALUES
    (
        'e5f6a7b8-9abc-def0-1234-56789abcdef0',
        'f6a7b8c9-abcd-ef01-2345-6789abcdef01',
        'c3d4e5f6-789a-bcde-f012-3456789abcde',
        'b8c9d0e1-cdef-0123-4567-89abcdef0123',
        NOW() + INTERVAL '2 days' + TIME '10:00',
        NOW() + INTERVAL '2 days' + TIME '10:30',
        'confirmed',
        2500.00,
        'Corte corto, estilo ejecutivo'
    ),
    (
        'e5f6a7b8-9abc-def0-1234-56789abcdef0',
        'a7b8c9d0-bcde-f012-3456-789abcdef012',
        'd4e5f6a7-89ab-cdef-0123-456789abcdef',
        'c9d0e1f2-def0-1234-5678-9abcdef01234',
        NOW() + INTERVAL '3 days' + TIME '15:00',
        NOW() + INTERVAL '3 days' + TIME '15:45',
        'pending',
        3500.00,
        NULL
    );