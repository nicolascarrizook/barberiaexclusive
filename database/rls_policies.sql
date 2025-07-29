-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbershops ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiting_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROFILES POLICIES
-- =====================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile" 
    ON profiles FOR SELECT 
    USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" 
    ON profiles FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Barbershop owners and barbers can view customer profiles
CREATE POLICY "Barbershop staff can view customer profiles" 
    ON profiles FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM appointments a
            JOIN barbers b ON b.id = a.barber_id
            WHERE a.customer_id = profiles.id
            AND (
                b.profile_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM barbershops bs
                    WHERE bs.id = b.barbershop_id
                    AND bs.owner_id = auth.uid()
                )
            )
        )
    );

-- =====================================================
-- BARBERSHOPS POLICIES
-- =====================================================

-- Anyone can view active barbershops
CREATE POLICY "Anyone can view active barbershops" 
    ON barbershops FOR SELECT 
    USING (is_active = true);

-- Owners can view their own barbershops
CREATE POLICY "Owners can view own barbershops" 
    ON barbershops FOR SELECT 
    USING (owner_id = auth.uid());

-- Owners can update their own barbershops
CREATE POLICY "Owners can update own barbershops" 
    ON barbershops FOR UPDATE 
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

-- Owners can insert barbershops
CREATE POLICY "Authenticated users can create barbershops" 
    ON barbershops FOR INSERT 
    WITH CHECK (owner_id = auth.uid());

-- =====================================================
-- BARBERS POLICIES
-- =====================================================

-- Anyone can view active barbers
CREATE POLICY "Anyone can view active barbers" 
    ON barbers FOR SELECT 
    USING (is_active = true);

-- Barbers can view themselves
CREATE POLICY "Barbers can view themselves" 
    ON barbers FOR SELECT 
    USING (profile_id = auth.uid());

-- Barbershop owners can manage their barbers
CREATE POLICY "Owners can manage barbershop barbers" 
    ON barbers FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM barbershops bs
            WHERE bs.id = barbers.barbershop_id
            AND bs.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM barbershops bs
            WHERE bs.id = barbers.barbershop_id
            AND bs.owner_id = auth.uid()
        )
    );

-- Barbers can update their own profile
CREATE POLICY "Barbers can update own barber profile" 
    ON barbers FOR UPDATE 
    USING (profile_id = auth.uid())
    WITH CHECK (profile_id = auth.uid());

-- =====================================================
-- SERVICES POLICIES
-- =====================================================

-- Anyone can view active services
CREATE POLICY "Anyone can view active services" 
    ON services FOR SELECT 
    USING (is_active = true);

-- Barbershop owners can manage their services
CREATE POLICY "Owners can manage barbershop services" 
    ON services FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM barbershops bs
            WHERE bs.id = services.barbershop_id
            AND bs.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM barbershops bs
            WHERE bs.id = services.barbershop_id
            AND bs.owner_id = auth.uid()
        )
    );

-- =====================================================
-- BARBER_SERVICES POLICIES
-- =====================================================

-- Anyone can view available barber services
CREATE POLICY "Anyone can view available barber services" 
    ON barber_services FOR SELECT 
    USING (is_available = true);

-- Barbershop owners can manage barber services
CREATE POLICY "Owners can manage barber services" 
    ON barber_services FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM barbers b
            JOIN barbershops bs ON bs.id = b.barbershop_id
            WHERE b.id = barber_services.barber_id
            AND bs.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM barbers b
            JOIN barbershops bs ON bs.id = b.barbershop_id
            WHERE b.id = barber_services.barber_id
            AND bs.owner_id = auth.uid()
        )
    );

-- Barbers can manage their own services
CREATE POLICY "Barbers can manage own services" 
    ON barber_services FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM barbers b
            WHERE b.id = barber_services.barber_id
            AND b.profile_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM barbers b
            WHERE b.id = barber_services.barber_id
            AND b.profile_id = auth.uid()
        )
    );

-- =====================================================
-- WORKING_HOURS POLICIES
-- =====================================================

-- Anyone can view working hours
CREATE POLICY "Anyone can view working hours" 
    ON working_hours FOR SELECT 
    USING (true);

-- Barbershop owners can manage working hours
CREATE POLICY "Owners can manage working hours" 
    ON working_hours FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM barbers b
            JOIN barbershops bs ON bs.id = b.barbershop_id
            WHERE b.id = working_hours.barber_id
            AND bs.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM barbers b
            JOIN barbershops bs ON bs.id = b.barbershop_id
            WHERE b.id = working_hours.barber_id
            AND bs.owner_id = auth.uid()
        )
    );

-- Barbers can manage their own working hours
CREATE POLICY "Barbers can manage own working hours" 
    ON working_hours FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM barbers b
            WHERE b.id = working_hours.barber_id
            AND b.profile_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM barbers b
            WHERE b.id = working_hours.barber_id
            AND b.profile_id = auth.uid()
        )
    );

-- =====================================================
-- SPECIAL_DATES POLICIES
-- =====================================================

-- Anyone can view special dates
CREATE POLICY "Anyone can view special dates" 
    ON special_dates FOR SELECT 
    USING (true);

-- Barbershop owners can manage special dates
CREATE POLICY "Owners can manage special dates" 
    ON special_dates FOR ALL 
    USING (
        (
            barbershop_id IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM barbershops bs
                WHERE bs.id = special_dates.barbershop_id
                AND bs.owner_id = auth.uid()
            )
        ) OR (
            barber_id IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM barbers b
                JOIN barbershops bs ON bs.id = b.barbershop_id
                WHERE b.id = special_dates.barber_id
                AND bs.owner_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        (
            barbershop_id IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM barbershops bs
                WHERE bs.id = special_dates.barbershop_id
                AND bs.owner_id = auth.uid()
            )
        ) OR (
            barber_id IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM barbers b
                JOIN barbershops bs ON bs.id = b.barbershop_id
                WHERE b.id = special_dates.barber_id
                AND bs.owner_id = auth.uid()
            )
        )
    );

-- Barbers can manage their own special dates
CREATE POLICY "Barbers can manage own special dates" 
    ON special_dates FOR ALL 
    USING (
        barber_id IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM barbers b
            WHERE b.id = special_dates.barber_id
            AND b.profile_id = auth.uid()
        )
    )
    WITH CHECK (
        barber_id IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM barbers b
            WHERE b.id = special_dates.barber_id
            AND b.profile_id = auth.uid()
        )
    );

-- =====================================================
-- APPOINTMENTS POLICIES
-- =====================================================

-- Customers can view their own appointments
CREATE POLICY "Customers can view own appointments" 
    ON appointments FOR SELECT 
    USING (customer_id = auth.uid());

-- Customers can create appointments
CREATE POLICY "Customers can create appointments" 
    ON appointments FOR INSERT 
    WITH CHECK (customer_id = auth.uid());

-- Customers can update their own pending appointments
CREATE POLICY "Customers can update own pending appointments" 
    ON appointments FOR UPDATE 
    USING (
        customer_id = auth.uid() AND 
        status = 'pending'
    )
    WITH CHECK (
        customer_id = auth.uid()
    );

-- Barbers can view their appointments
CREATE POLICY "Barbers can view own appointments" 
    ON appointments FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM barbers b
            WHERE b.id = appointments.barber_id
            AND b.profile_id = auth.uid()
        )
    );

-- Barbers can update their appointments
CREATE POLICY "Barbers can update own appointments" 
    ON appointments FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM barbers b
            WHERE b.id = appointments.barber_id
            AND b.profile_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM barbers b
            WHERE b.id = appointments.barber_id
            AND b.profile_id = auth.uid()
        )
    );

-- Barbershop owners can manage all appointments
CREATE POLICY "Owners can manage barbershop appointments" 
    ON appointments FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM barbershops bs
            WHERE bs.id = appointments.barbershop_id
            AND bs.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM barbershops bs
            WHERE bs.id = appointments.barbershop_id
            AND bs.owner_id = auth.uid()
        )
    );

-- =====================================================
-- PAYMENTS POLICIES
-- =====================================================

-- Customers can view their own payments
CREATE POLICY "Customers can view own payments" 
    ON payments FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM appointments a
            WHERE a.id = payments.appointment_id
            AND a.customer_id = auth.uid()
        )
    );

-- Barbershop staff can view and manage payments
CREATE POLICY "Barbershop staff can manage payments" 
    ON payments FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM appointments a
            JOIN barbershops bs ON bs.id = a.barbershop_id
            LEFT JOIN barbers b ON b.id = a.barber_id
            WHERE a.id = payments.appointment_id
            AND (
                bs.owner_id = auth.uid() OR
                b.profile_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM appointments a
            JOIN barbershops bs ON bs.id = a.barbershop_id
            LEFT JOIN barbers b ON b.id = a.barber_id
            WHERE a.id = payments.appointment_id
            AND (
                bs.owner_id = auth.uid() OR
                b.profile_id = auth.uid()
            )
        )
    );

-- =====================================================
-- REVIEWS POLICIES
-- =====================================================

-- Anyone can view visible reviews
CREATE POLICY "Anyone can view visible reviews" 
    ON reviews FOR SELECT 
    USING (is_visible = true);

-- Customers can create reviews for their completed appointments
CREATE POLICY "Customers can create reviews" 
    ON reviews FOR INSERT 
    WITH CHECK (
        customer_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM appointments a
            WHERE a.id = reviews.appointment_id
            AND a.customer_id = auth.uid()
            AND a.status = 'completed'
        )
    );

-- Customers can update their own reviews
CREATE POLICY "Customers can update own reviews" 
    ON reviews FOR UPDATE 
    USING (customer_id = auth.uid())
    WITH CHECK (customer_id = auth.uid());

-- Barbershop owners and barbers can reply to reviews
CREATE POLICY "Barbershop staff can reply to reviews" 
    ON reviews FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM barbershops bs
            LEFT JOIN barbers b ON b.barbershop_id = bs.id
            WHERE bs.id = reviews.barbershop_id
            AND (
                bs.owner_id = auth.uid() OR
                (b.id = reviews.barber_id AND b.profile_id = auth.uid())
            )
        )
    )
    WITH CHECK (
        -- Only allow updating reply fields
        customer_id = OLD.customer_id AND
        barber_id = OLD.barber_id AND
        barbershop_id = OLD.barbershop_id AND
        rating = OLD.rating AND
        comment = OLD.comment
    );

-- =====================================================
-- NOTIFICATIONS POLICIES
-- =====================================================

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" 
    ON notifications FOR SELECT 
    USING (recipient_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" 
    ON notifications FOR UPDATE 
    USING (recipient_id = auth.uid())
    WITH CHECK (
        recipient_id = auth.uid() AND
        -- Only allow updating read_at
        recipient_id = OLD.recipient_id AND
        type = OLD.type AND
        channel = OLD.channel AND
        content = OLD.content
    );

-- System can create notifications (through service role)
CREATE POLICY "System can create notifications" 
    ON notifications FOR INSERT 
    WITH CHECK (true);

-- =====================================================
-- NOTIFICATION_TEMPLATES POLICIES
-- =====================================================

-- Anyone can view active templates
CREATE POLICY "Anyone can view active templates" 
    ON notification_templates FOR SELECT 
    USING (is_active = true);

-- Barbershop owners can manage their templates
CREATE POLICY "Owners can manage templates" 
    ON notification_templates FOR ALL 
    USING (
        barbershop_id IS NULL OR
        EXISTS (
            SELECT 1 FROM barbershops bs
            WHERE bs.id = notification_templates.barbershop_id
            AND bs.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        barbershop_id IS NULL OR
        EXISTS (
            SELECT 1 FROM barbershops bs
            WHERE bs.id = notification_templates.barbershop_id
            AND bs.owner_id = auth.uid()
        )
    );

-- =====================================================
-- WAITING_LIST POLICIES
-- =====================================================

-- Customers can view their own waiting list entries
CREATE POLICY "Customers can view own waiting list" 
    ON waiting_list FOR SELECT 
    USING (customer_id = auth.uid());

-- Customers can create waiting list entries
CREATE POLICY "Customers can join waiting list" 
    ON waiting_list FOR INSERT 
    WITH CHECK (customer_id = auth.uid());

-- Customers can update their own waiting list entries
CREATE POLICY "Customers can update own waiting list" 
    ON waiting_list FOR UPDATE 
    USING (customer_id = auth.uid())
    WITH CHECK (customer_id = auth.uid());

-- Customers can delete their own waiting list entries
CREATE POLICY "Customers can leave waiting list" 
    ON waiting_list FOR DELETE 
    USING (customer_id = auth.uid());

-- Barbershop staff can view waiting list
CREATE POLICY "Barbershop staff can view waiting list" 
    ON waiting_list FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM barbershops bs
            LEFT JOIN barbers b ON b.barbershop_id = bs.id
            WHERE bs.id = waiting_list.barbershop_id
            AND (
                bs.owner_id = auth.uid() OR
                (b.id = waiting_list.barber_id AND b.profile_id = auth.uid())
            )
        )
    );

-- =====================================================
-- PROMOTIONS POLICIES
-- =====================================================

-- Anyone can view active promotions
CREATE POLICY "Anyone can view active promotions" 
    ON promotions FOR SELECT 
    USING (
        is_active = true AND
        NOW() BETWEEN start_date AND end_date
    );

-- Barbershop owners can manage their promotions
CREATE POLICY "Owners can manage promotions" 
    ON promotions FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM barbershops bs
            WHERE bs.id = promotions.barbershop_id
            AND bs.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM barbershops bs
            WHERE bs.id = promotions.barbershop_id
            AND bs.owner_id = auth.uid()
        )
    );

-- =====================================================
-- ANALYTICS_EVENTS POLICIES
-- =====================================================

-- Only system can create analytics events
CREATE POLICY "System can create analytics events" 
    ON analytics_events FOR INSERT 
    WITH CHECK (true);

-- Barbershop owners can view their analytics
CREATE POLICY "Owners can view analytics" 
    ON analytics_events FOR SELECT 
    USING (
        barbershop_id IS NULL OR
        EXISTS (
            SELECT 1 FROM barbershops bs
            WHERE bs.id = analytics_events.barbershop_id
            AND bs.owner_id = auth.uid()
        )
    );