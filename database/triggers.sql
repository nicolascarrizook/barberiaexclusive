-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_barbershops_updated_at BEFORE UPDATE ON barbershops
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_barbers_updated_at BEFORE UPDATE ON barbers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_working_hours_updated_at BEFORE UPDATE ON working_hours
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_waiting_list_updated_at BEFORE UPDATE ON waiting_list
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_promotions_updated_at BEFORE UPDATE ON promotions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to validate appointment slot availability
CREATE OR REPLACE FUNCTION validate_appointment_slot()
RETURNS TRIGGER AS $$
BEGIN
    -- Skip validation for cancelled appointments
    IF NEW.status IN ('cancelled', 'no_show') THEN
        RETURN NEW;
    END IF;

    -- Check if slot is available
    IF NOT check_slot_availability(
        NEW.barber_id, 
        NEW.start_time, 
        NEW.end_time,
        NEW.id
    ) THEN
        RAISE EXCEPTION 'Time slot is not available for this barber';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_appointment_before_insert
    BEFORE INSERT ON appointments
    FOR EACH ROW EXECUTE FUNCTION validate_appointment_slot();

CREATE TRIGGER validate_appointment_before_update
    BEFORE UPDATE ON appointments
    FOR EACH ROW 
    WHEN (OLD.start_time IS DISTINCT FROM NEW.start_time OR 
          OLD.end_time IS DISTINCT FROM NEW.end_time OR
          OLD.barber_id IS DISTINCT FROM NEW.barber_id)
    EXECUTE FUNCTION validate_appointment_slot();

-- Trigger to generate confirmation code for new appointments
CREATE OR REPLACE FUNCTION set_appointment_confirmation_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.confirmation_code IS NULL THEN
        NEW.confirmation_code := generate_confirmation_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_confirmation_code_before_insert
    BEFORE INSERT ON appointments
    FOR EACH ROW EXECUTE FUNCTION set_appointment_confirmation_code();

-- Trigger to handle appointment status changes
CREATE OR REPLACE FUNCTION handle_appointment_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Set cancelled_at when appointment is cancelled
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        NEW.cancelled_at := NOW();
    END IF;

    -- Set completed_at when appointment is completed
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_at := NOW();
    END IF;

    -- Create notification for status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO notifications (
            recipient_id,
            type,
            channel,
            subject,
            content,
            metadata,
            scheduled_for
        ) VALUES (
            NEW.customer_id,
            CASE 
                WHEN NEW.status = 'confirmed' THEN 'appointment_confirmation'
                WHEN NEW.status = 'cancelled' THEN 'appointment_cancellation'
                ELSE 'general'
            END,
            'in_app',
            CASE 
                WHEN NEW.status = 'confirmed' THEN 'Turno confirmado'
                WHEN NEW.status = 'cancelled' THEN 'Turno cancelado'
                WHEN NEW.status = 'completed' THEN 'Turno completado'
                ELSE 'Actualización de turno'
            END,
            CASE 
                WHEN NEW.status = 'confirmed' THEN 'Tu turno ha sido confirmado'
                WHEN NEW.status = 'cancelled' THEN 'Tu turno ha sido cancelado'
                WHEN NEW.status = 'completed' THEN 'Gracias por tu visita'
                ELSE 'El estado de tu turno ha cambiado'
            END,
            jsonb_build_object(
                'appointment_id', NEW.id,
                'old_status', OLD.status,
                'new_status', NEW.status
            ),
            NOW()
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_appointment_status_before_update
    BEFORE UPDATE ON appointments
    FOR EACH ROW 
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION handle_appointment_status_change();

-- Trigger to update barber rating after review
CREATE OR REPLACE FUNCTION trigger_update_barber_rating()
RETURNS TRIGGER AS $$
BEGIN
    -- Update rating when review is created or updated
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.rating != NEW.rating) THEN
        PERFORM update_barber_rating(NEW.barber_id);
    END IF;
    
    -- Update rating when review is deleted
    IF TG_OP = 'DELETE' THEN
        PERFORM update_barber_rating(OLD.barber_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rating_after_review_change
    AFTER INSERT OR UPDATE OR DELETE ON reviews
    FOR EACH ROW EXECUTE FUNCTION trigger_update_barber_rating();

-- Trigger to increment promotion usage count
CREATE OR REPLACE FUNCTION increment_promotion_usage()
RETURNS TRIGGER AS $$
BEGIN
    -- Only increment for paid appointments
    IF EXISTS (
        SELECT 1 FROM payments p
        WHERE p.appointment_id = NEW.id
        AND p.status = 'paid'
    ) THEN
        UPDATE promotions
        SET uses_count = uses_count + 1
        WHERE id = (NEW.metadata->>'promotion_id')::UUID;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_promotion_on_payment
    AFTER UPDATE ON payments
    FOR EACH ROW
    WHEN (OLD.status != 'paid' AND NEW.status = 'paid')
    EXECUTE FUNCTION increment_promotion_usage();

-- Trigger to create analytics event
CREATE OR REPLACE FUNCTION log_analytics_event()
RETURNS TRIGGER AS $$
BEGIN
    -- Log appointment creation
    IF TG_TABLE_NAME = 'appointments' AND TG_OP = 'INSERT' THEN
        INSERT INTO analytics_events (
            barbershop_id,
            user_id,
            event_type,
            event_data
        ) VALUES (
            NEW.barbershop_id,
            NEW.customer_id,
            'appointment_created',
            jsonb_build_object(
                'appointment_id', NEW.id,
                'barber_id', NEW.barber_id,
                'service_id', NEW.service_id,
                'start_time', NEW.start_time
            )
        );
    END IF;
    
    -- Log review creation
    IF TG_TABLE_NAME = 'reviews' AND TG_OP = 'INSERT' THEN
        INSERT INTO analytics_events (
            barbershop_id,
            user_id,
            event_type,
            event_data
        ) VALUES (
            NEW.barbershop_id,
            NEW.customer_id,
            'review_created',
            jsonb_build_object(
                'review_id', NEW.id,
                'barber_id', NEW.barber_id,
                'rating', NEW.rating
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_appointment_analytics
    AFTER INSERT ON appointments
    FOR EACH ROW EXECUTE FUNCTION log_analytics_event();

CREATE TRIGGER log_review_analytics
    AFTER INSERT ON reviews
    FOR EACH ROW EXECUTE FUNCTION log_analytics_event();

-- Trigger to handle profile creation from auth.users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Trigger to check waiting list when appointment is cancelled
CREATE OR REPLACE FUNCTION notify_waiting_list()
RETURNS TRIGGER AS $$
DECLARE
    v_waiting RECORD;
BEGIN
    -- Only process if appointment was cancelled
    IF NEW.status != 'cancelled' OR OLD.status = 'cancelled' THEN
        RETURN NEW;
    END IF;

    -- Find customers in waiting list for this time slot
    FOR v_waiting IN
        SELECT DISTINCT w.*, p.email, p.phone
        FROM waiting_list w
        JOIN profiles p ON p.id = w.customer_id
        WHERE w.barbershop_id = NEW.barbershop_id
            AND w.is_active = true
            AND (
                w.barber_id IS NULL OR 
                w.barber_id = NEW.barber_id
            )
            AND (
                w.service_id IS NULL OR 
                w.service_id = NEW.service_id
            )
            AND w.preferred_date = NEW.start_time::DATE
            AND (
                w.preferred_time_start IS NULL OR
                (
                    NEW.start_time::TIME >= w.preferred_time_start AND
                    NEW.start_time::TIME <= COALESCE(w.preferred_time_end, '23:59:59'::TIME)
                )
            )
        ORDER BY w.created_at
        LIMIT 5
    LOOP
        -- Create notification
        INSERT INTO notifications (
            recipient_id,
            type,
            channel,
            subject,
            content,
            metadata,
            scheduled_for
        ) VALUES (
            v_waiting.customer_id,
            'general',
            'email',
            'Turno disponible',
            'Un turno que coincide con tus preferencias está disponible',
            jsonb_build_object(
                'appointment_time', NEW.start_time,
                'barber_id', NEW.barber_id,
                'service_id', NEW.service_id,
                'waiting_list_id', v_waiting.id
            ),
            NOW()
        );
        
        -- Mark as notified
        UPDATE waiting_list
        SET notified_at = NOW()
        WHERE id = v_waiting.id;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notify_waiting_list_on_cancellation
    AFTER UPDATE ON appointments
    FOR EACH ROW
    WHEN (OLD.status != 'cancelled' AND NEW.status = 'cancelled')
    EXECUTE FUNCTION notify_waiting_list();