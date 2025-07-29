-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

-- Function to check if a time slot is available
CREATE OR REPLACE FUNCTION check_slot_availability(
    p_barber_id UUID,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ,
    p_exclude_appointment_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_conflicts INTEGER;
    v_is_working BOOLEAN;
    v_day_of_week TEXT;
    v_date DATE;
    v_start_time TIME;
    v_end_time TIME;
BEGIN
    -- Extract date and time components
    v_date := p_start_time::DATE;
    v_start_time := p_start_time::TIME;
    v_end_time := p_end_time::TIME;
    v_day_of_week := LOWER(TO_CHAR(p_start_time, 'day'))::day_of_week;

    -- Check if barber works on this day
    SELECT 
        CASE 
            WHEN sd.is_holiday THEN false
            WHEN sd.custom_hours IS NOT NULL THEN 
                v_start_time >= (sd.custom_hours->>'start')::TIME AND
                v_end_time <= (sd.custom_hours->>'end')::TIME
            ELSE 
                wh.is_working AND
                v_start_time >= wh.start_time AND
                v_end_time <= wh.end_time AND
                NOT (
                    wh.break_start IS NOT NULL AND 
                    wh.break_end IS NOT NULL AND
                    (
                        (v_start_time >= wh.break_start AND v_start_time < wh.break_end) OR
                        (v_end_time > wh.break_start AND v_end_time <= wh.break_end) OR
                        (v_start_time <= wh.break_start AND v_end_time >= wh.break_end)
                    )
                )
        END INTO v_is_working
    FROM barbers b
    LEFT JOIN working_hours wh ON wh.barber_id = b.id AND wh.day_of_week = v_day_of_week
    LEFT JOIN special_dates sd ON sd.barber_id = b.id AND sd.date = v_date
    WHERE b.id = p_barber_id;

    IF NOT v_is_working OR v_is_working IS NULL THEN
        RETURN false;
    END IF;

    -- Check for conflicting appointments
    SELECT COUNT(*) INTO v_conflicts
    FROM appointments
    WHERE barber_id = p_barber_id
        AND status NOT IN ('cancelled', 'no_show')
        AND id != COALESCE(p_exclude_appointment_id, '00000000-0000-0000-0000-000000000000'::UUID)
        AND (
            (start_time <= p_start_time AND end_time > p_start_time) OR
            (start_time < p_end_time AND end_time >= p_end_time) OR
            (start_time >= p_start_time AND end_time <= p_end_time)
        );

    RETURN v_conflicts = 0;
END;
$$ LANGUAGE plpgsql;

-- Function to get available time slots for a barber on a specific date
CREATE OR REPLACE FUNCTION get_available_slots(
    p_barber_id UUID,
    p_date DATE,
    p_service_duration INTEGER,
    p_buffer_time INTEGER DEFAULT 0
)
RETURNS TABLE (
    slot_start TIMESTAMPTZ,
    slot_end TIMESTAMPTZ
) AS $$
DECLARE
    v_working_start TIME;
    v_working_end TIME;
    v_break_start TIME;
    v_break_end TIME;
    v_current_time TIMESTAMPTZ;
    v_end_time TIMESTAMPTZ;
    v_slot_duration INTERVAL;
    v_day_of_week day_of_week;
    v_is_working BOOLEAN;
    v_appointments CURSOR FOR
        SELECT start_time, end_time
        FROM appointments
        WHERE barber_id = p_barber_id
            AND start_time::DATE = p_date
            AND status NOT IN ('cancelled', 'no_show')
        ORDER BY start_time;
BEGIN
    v_slot_duration := (p_service_duration + p_buffer_time) * INTERVAL '1 minute';
    v_day_of_week := LOWER(TO_CHAR(p_date, 'day'))::day_of_week;

    -- Get working hours for the day
    SELECT 
        COALESCE(sd.custom_hours->>'start', wh.start_time)::TIME,
        COALESCE(sd.custom_hours->>'end', wh.end_time)::TIME,
        CASE WHEN sd.custom_hours IS NOT NULL 
            THEN (sd.custom_hours->'breaks'->0->>'start')::TIME 
            ELSE wh.break_start 
        END,
        CASE WHEN sd.custom_hours IS NOT NULL 
            THEN (sd.custom_hours->'breaks'->0->>'end')::TIME 
            ELSE wh.break_end 
        END,
        COALESCE(NOT sd.is_holiday, wh.is_working)
    INTO v_working_start, v_working_end, v_break_start, v_break_end, v_is_working
    FROM barbers b
    LEFT JOIN working_hours wh ON wh.barber_id = b.id AND wh.day_of_week = v_day_of_week
    LEFT JOIN special_dates sd ON sd.barber_id = b.id AND sd.date = p_date
    WHERE b.id = p_barber_id;

    IF NOT v_is_working OR v_working_start IS NULL THEN
        RETURN;
    END IF;

    v_current_time := p_date + v_working_start;
    v_end_time := p_date + v_working_end;

    -- Iterate through the day
    FOR appt IN v_appointments LOOP
        -- Add slots before the appointment
        WHILE v_current_time + v_slot_duration <= appt.start_time LOOP
            -- Skip break times
            IF v_break_start IS NOT NULL AND v_break_end IS NOT NULL THEN
                IF NOT (
                    (v_current_time::TIME >= v_break_start AND v_current_time::TIME < v_break_end) OR
                    ((v_current_time + v_slot_duration)::TIME > v_break_start AND 
                     (v_current_time + v_slot_duration)::TIME <= v_break_end)
                ) THEN
                    slot_start := v_current_time;
                    slot_end := v_current_time + v_slot_duration;
                    RETURN NEXT;
                END IF;
            ELSE
                slot_start := v_current_time;
                slot_end := v_current_time + v_slot_duration;
                RETURN NEXT;
            END IF;
            v_current_time := v_current_time + INTERVAL '15 minutes'; -- 15-minute increments
        END LOOP;
        
        v_current_time := appt.end_time;
    END LOOP;

    -- Add remaining slots after last appointment
    WHILE v_current_time + v_slot_duration <= v_end_time LOOP
        -- Skip break times
        IF v_break_start IS NOT NULL AND v_break_end IS NOT NULL THEN
            IF NOT (
                (v_current_time::TIME >= v_break_start AND v_current_time::TIME < v_break_end) OR
                ((v_current_time + v_slot_duration)::TIME > v_break_start AND 
                 (v_current_time + v_slot_duration)::TIME <= v_break_end)
            ) THEN
                slot_start := v_current_time;
                slot_end := v_current_time + v_slot_duration;
                RETURN NEXT;
            END IF;
        ELSE
            slot_start := v_current_time;
            slot_end := v_current_time + v_slot_duration;
            RETURN NEXT;
        END IF;
        v_current_time := v_current_time + INTERVAL '15 minutes';
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to find alternative slots when requested time is not available
CREATE OR REPLACE FUNCTION suggest_alternative_slots(
    p_barber_id UUID,
    p_requested_time TIMESTAMPTZ,
    p_service_duration INTEGER,
    p_date_flexibility INTEGER DEFAULT 3, -- days before and after
    p_max_suggestions INTEGER DEFAULT 5
)
RETURNS TABLE (
    slot_start TIMESTAMPTZ,
    slot_end TIMESTAMPTZ,
    date_diff INTEGER,
    time_diff INTEGER
) AS $$
DECLARE
    v_requested_date DATE;
    v_requested_time TIME;
    v_search_date DATE;
    v_slot RECORD;
BEGIN
    v_requested_date := p_requested_time::DATE;
    v_requested_time := p_requested_time::TIME;
    
    -- Search for available slots around the requested time
    FOR i IN -p_date_flexibility..p_date_flexibility LOOP
        v_search_date := v_requested_date + i;
        
        -- Skip past dates
        IF v_search_date < CURRENT_DATE THEN
            CONTINUE;
        END IF;
        
        FOR v_slot IN 
            SELECT s.slot_start, s.slot_end
            FROM get_available_slots(p_barber_id, v_search_date, p_service_duration) s
            WHERE (v_search_date > CURRENT_DATE OR s.slot_start > NOW())
            ORDER BY ABS(EXTRACT(EPOCH FROM (s.slot_start::TIME - v_requested_time)))
            LIMIT p_max_suggestions
        LOOP
            slot_start := v_slot.slot_start;
            slot_end := v_slot.slot_end;
            date_diff := ABS(i);
            time_diff := ABS(EXTRACT(EPOCH FROM (v_slot.slot_start::TIME - v_requested_time))::INTEGER / 60);
            RETURN NEXT;
            
            IF (SELECT COUNT(*) FROM suggest_alternative_slots) >= p_max_suggestions THEN
                RETURN;
            END IF;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate appointment price with promotions
CREATE OR REPLACE FUNCTION calculate_appointment_price(
    p_service_id UUID,
    p_barber_id UUID,
    p_promotion_code TEXT DEFAULT NULL
)
RETURNS TABLE (
    base_price DECIMAL(10,2),
    discount_amount DECIMAL(10,2),
    final_price DECIMAL(10,2),
    promotion_id UUID,
    promotion_name TEXT
) AS $$
DECLARE
    v_base_price DECIMAL(10,2);
    v_discount DECIMAL(10,2) := 0;
    v_promo RECORD;
BEGIN
    -- Get base price (custom price from barber_services or default from services)
    SELECT COALESCE(bs.custom_price, s.price)
    INTO v_base_price
    FROM services s
    LEFT JOIN barber_services bs ON bs.service_id = s.id AND bs.barber_id = p_barber_id
    WHERE s.id = p_service_id;

    -- Check for applicable promotion
    IF p_promotion_code IS NOT NULL THEN
        SELECT p.* INTO v_promo
        FROM promotions p
        JOIN services s ON s.id = p_service_id
        WHERE p.code = p_promotion_code
            AND p.is_active = true
            AND NOW() BETWEEN p.start_date AND p.end_date
            AND (p.max_uses IS NULL OR p.uses_count < p.max_uses)
            AND (p.applicable_services IS NULL OR p_service_id = ANY(p.applicable_services))
            AND (p.applicable_barbers IS NULL OR p_barber_id = ANY(p.applicable_barbers))
            AND (p.minimum_amount IS NULL OR v_base_price >= p.minimum_amount)
            AND p.barbershop_id = s.barbershop_id;

        IF FOUND THEN
            IF v_promo.discount_percentage IS NOT NULL THEN
                v_discount := v_base_price * v_promo.discount_percentage / 100;
            ELSE
                v_discount := LEAST(v_promo.discount_amount, v_base_price);
            END IF;
            
            promotion_id := v_promo.id;
            promotion_name := v_promo.name;
        END IF;
    END IF;

    base_price := v_base_price;
    discount_amount := v_discount;
    final_price := v_base_price - v_discount;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to generate confirmation code
CREATE OR REPLACE FUNCTION generate_confirmation_code()
RETURNS TEXT AS $$
DECLARE
    v_code TEXT;
    v_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate 6-character alphanumeric code
        v_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT), 1, 6));
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM appointments WHERE confirmation_code = v_code) INTO v_exists;
        
        EXIT WHEN NOT v_exists;
    END LOOP;
    
    RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- Function to update barber rating after review
CREATE OR REPLACE FUNCTION update_barber_rating(p_barber_id UUID)
RETURNS VOID AS $$
DECLARE
    v_avg_rating DECIMAL(3,2);
    v_total_reviews INTEGER;
BEGIN
    SELECT 
        AVG(rating)::DECIMAL(3,2),
        COUNT(*)
    INTO v_avg_rating, v_total_reviews
    FROM reviews
    WHERE barber_id = p_barber_id
        AND is_visible = true;

    UPDATE barbers
    SET 
        rating = COALESCE(v_avg_rating, 0),
        total_reviews = COALESCE(v_total_reviews, 0),
        updated_at = NOW()
    WHERE id = p_barber_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get barbershop statistics
CREATE OR REPLACE FUNCTION get_barbershop_stats(
    p_barbershop_id UUID,
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    total_appointments INTEGER,
    completed_appointments INTEGER,
    cancelled_appointments INTEGER,
    no_show_appointments INTEGER,
    total_revenue DECIMAL(10,2),
    average_rating DECIMAL(3,2),
    total_customers INTEGER,
    new_customers INTEGER,
    returning_customers INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_appointments,
        COUNT(*) FILTER (WHERE a.status = 'completed')::INTEGER as completed_appointments,
        COUNT(*) FILTER (WHERE a.status = 'cancelled')::INTEGER as cancelled_appointments,
        COUNT(*) FILTER (WHERE a.status = 'no_show')::INTEGER as no_show_appointments,
        COALESCE(SUM(p.amount + p.tip_amount) FILTER (WHERE p.status = 'paid'), 0) as total_revenue,
        AVG(r.rating)::DECIMAL(3,2) as average_rating,
        COUNT(DISTINCT a.customer_id)::INTEGER as total_customers,
        COUNT(DISTINCT a.customer_id) FILTER (
            WHERE NOT EXISTS (
                SELECT 1 FROM appointments a2 
                WHERE a2.customer_id = a.customer_id 
                AND a2.barbershop_id = p_barbershop_id
                AND a2.created_at < p_start_date
            )
        )::INTEGER as new_customers,
        COUNT(DISTINCT a.customer_id) FILTER (
            WHERE EXISTS (
                SELECT 1 FROM appointments a2 
                WHERE a2.customer_id = a.customer_id 
                AND a2.barbershop_id = p_barbershop_id
                AND a2.created_at < p_start_date
            )
        )::INTEGER as returning_customers
    FROM appointments a
    LEFT JOIN payments p ON p.appointment_id = a.id
    LEFT JOIN reviews r ON r.appointment_id = a.id
    WHERE a.barbershop_id = p_barbershop_id
        AND a.start_time::DATE BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM notifications
    WHERE created_at < NOW() - INTERVAL '90 days'
        AND (sent_at IS NOT NULL OR error_message IS NOT NULL);
    
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

-- Function to mark no-shows automatically
CREATE OR REPLACE FUNCTION mark_no_shows()
RETURNS INTEGER AS $$
DECLARE
    v_updated INTEGER;
BEGIN
    UPDATE appointments
    SET 
        status = 'no_show',
        no_show_marked_at = NOW(),
        updated_at = NOW()
    WHERE status = 'confirmed'
        AND end_time < NOW() - INTERVAL '30 minutes';
    
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated;
END;
$$ LANGUAGE plpgsql;