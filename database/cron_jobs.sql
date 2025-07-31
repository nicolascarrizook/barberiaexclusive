-- =====================================================
-- CRON JOBS CONFIGURATION
-- Requires pg_cron extension
-- =====================================================

-- Schedule notification processing every 5 minutes
SELECT cron.schedule(
    'process-notifications',
    '*/5 * * * *',
    $$
    SELECT net.http_post(
        url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/notifications/process',
        headers := jsonb_build_object(
            'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
            'Content-Type', 'application/json'
        ),
        body := jsonb_build_object('limit', 50)
    );
    $$
);

-- Schedule appointment reminders check every hour
SELECT cron.schedule(
    'send-appointment-reminders',
    '0 * * * *',
    $$
    SELECT net.http_post(
        url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/notifications/reminders',
        headers := jsonb_build_object(
            'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
            'Content-Type', 'application/json'
        ),
        body := '{}'
    );
    $$
);

-- Schedule no-show marking every 30 minutes
SELECT cron.schedule(
    'mark-no-shows',
    '*/30 * * * *',
    'SELECT mark_no_shows();'
);

-- Schedule old notification cleanup daily at 3 AM
SELECT cron.schedule(
    'cleanup-old-notifications',
    '0 3 * * *',
    'SELECT cleanup_old_notifications();'
);

-- Schedule analytics aggregation daily at 2 AM
SELECT cron.schedule(
    'aggregate-daily-analytics',
    '0 2 * * *',
    $$
    INSERT INTO analytics_daily_summary (
        barbershop_id,
        date,
        total_appointments,
        completed_appointments,
        cancelled_appointments,
        total_revenue,
        new_customers,
        returning_customers
    )
    SELECT 
        a.barbershop_id,
        CURRENT_DATE - INTERVAL '1 day',
        COUNT(*),
        COUNT(*) FILTER (WHERE a.status = 'completed'),
        COUNT(*) FILTER (WHERE a.status = 'cancelled'),
        COALESCE(SUM(p.amount + p.tip_amount) FILTER (WHERE p.status = 'paid'), 0),
        COUNT(DISTINCT a.customer_id) FILTER (
            WHERE NOT EXISTS (
                SELECT 1 FROM appointments a2 
                WHERE a2.customer_id = a.customer_id 
                AND a2.barbershop_id = a.barbershop_id
                AND a2.created_at < (CURRENT_DATE - INTERVAL '1 day')
            )
        ),
        COUNT(DISTINCT a.customer_id) FILTER (
            WHERE EXISTS (
                SELECT 1 FROM appointments a2 
                WHERE a2.customer_id = a.customer_id 
                AND a2.barbershop_id = a.barbershop_id
                AND a2.created_at < (CURRENT_DATE - INTERVAL '1 day')
            )
        )
    FROM appointments a
    LEFT JOIN payments p ON p.appointment_id = a.id
    WHERE a.start_time::DATE = CURRENT_DATE - INTERVAL '1 day'
    GROUP BY a.barbershop_id
    ON CONFLICT (barbershop_id, date) DO UPDATE
    SET 
        total_appointments = EXCLUDED.total_appointments,
        completed_appointments = EXCLUDED.completed_appointments,
        cancelled_appointments = EXCLUDED.cancelled_appointments,
        total_revenue = EXCLUDED.total_revenue,
        new_customers = EXCLUDED.new_customers,
        returning_customers = EXCLUDED.returning_customers,
        updated_at = NOW();
    $$
);

-- Schedule waiting list check every hour
SELECT cron.schedule(
    'check-waiting-list',
    '0 * * * *',
    $$
    -- Check for new availability and notify waiting list
    WITH available_slots AS (
        SELECT DISTINCT
            wl.id as waiting_list_id,
            wl.customer_id,
            s.slot_start,
            s.slot_end
        FROM waiting_list wl
        CROSS JOIN LATERAL get_available_slots(
            COALESCE(wl.barber_id, b.id),
            wl.preferred_date,
            COALESCE(srv.duration_minutes, 30)
        ) s
        JOIN barbers b ON b.barbershop_id = wl.barbershop_id
        LEFT JOIN services srv ON srv.id = wl.service_id
        WHERE wl.is_active = true
            AND wl.notified_at IS NULL
            AND wl.preferred_date >= CURRENT_DATE
            AND wl.preferred_date <= CURRENT_DATE + wl.flexibility_days
            AND (
                wl.preferred_time_start IS NULL OR
                s.slot_start::TIME >= wl.preferred_time_start
            )
            AND (
                wl.preferred_time_end IS NULL OR
                s.slot_start::TIME <= wl.preferred_time_end
            )
        LIMIT 20
    )
    INSERT INTO notifications (
        recipient_id,
        type,
        channel,
        subject,
        content,
        metadata,
        scheduled_for
    )
    SELECT 
        customer_id,
        'general',
        'email',
        'Horario disponible para tu turno',
        'Hay un horario disponible que coincide con tus preferencias',
        jsonb_build_object(
            'waiting_list_id', waiting_list_id,
            'slot_start', slot_start,
            'slot_end', slot_end
        ),
        NOW()
    FROM available_slots;
    
    -- Mark as notified
    UPDATE waiting_list
    SET notified_at = NOW()
    WHERE id IN (SELECT waiting_list_id FROM available_slots);
    $$
);

-- View all scheduled jobs
SELECT * FROM cron.job;