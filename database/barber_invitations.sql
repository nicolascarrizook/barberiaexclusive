-- =====================================================
-- BARBER INVITATIONS AND PROVISIONAL BARBERS TABLES
-- =====================================================

-- Create barber_invitations table for tracking all types of invitations
CREATE TABLE IF NOT EXISTS barber_invitations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id uuid NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  email text,
  display_name text NOT NULL,
  invitation_type text NOT NULL CHECK (invitation_type IN ('email', 'manual')),
  invitation_code text UNIQUE,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at timestamptz NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  created_by uuid NOT NULL REFERENCES profiles(id),
  claimed_by uuid REFERENCES profiles(id),
  claimed_at timestamptz,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Create provisional_barbers table for manual barber creation
CREATE TABLE IF NOT EXISTS provisional_barbers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id uuid NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  invitation_id uuid NOT NULL REFERENCES barber_invitations(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  bio text,
  specialties text[],
  years_experience integer,
  instagram_handle text,
  commission_percentage decimal(5,2) NOT NULL DEFAULT 50.00,
  can_accept_tips boolean DEFAULT true,
  working_hours jsonb,
  is_active boolean DEFAULT false,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  UNIQUE(barbershop_id, invitation_id)
);

-- Create indexes for performance
CREATE INDEX idx_barber_invitations_barbershop_id ON barber_invitations(barbershop_id);
CREATE INDEX idx_barber_invitations_status ON barber_invitations(status);
CREATE INDEX idx_barber_invitations_invitation_code ON barber_invitations(invitation_code) WHERE invitation_code IS NOT NULL;
CREATE INDEX idx_barber_invitations_email ON barber_invitations(email) WHERE email IS NOT NULL;
CREATE INDEX idx_provisional_barbers_barbershop_id ON provisional_barbers(barbershop_id);
CREATE INDEX idx_provisional_barbers_invitation_id ON provisional_barbers(invitation_id);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE barber_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE provisional_barbers ENABLE ROW LEVEL SECURITY;

-- Barber Invitations Policies

-- Barbershop owners can view their invitations
CREATE POLICY "Owners can view barbershop invitations" 
    ON barber_invitations FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM barbershops bs
            WHERE bs.id = barber_invitations.barbershop_id
            AND bs.owner_id = auth.uid()
        )
    );

-- Barbershop owners can create invitations
CREATE POLICY "Owners can create barbershop invitations" 
    ON barber_invitations FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM barbershops bs
            WHERE bs.id = barber_invitations.barbershop_id
            AND bs.owner_id = auth.uid()
        ) AND created_by = auth.uid()
    );

-- Barbershop owners can update their invitations
CREATE POLICY "Owners can update barbershop invitations" 
    ON barber_invitations FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM barbershops bs
            WHERE bs.id = barber_invitations.barbershop_id
            AND bs.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM barbershops bs
            WHERE bs.id = barber_invitations.barbershop_id
            AND bs.owner_id = auth.uid()
        )
    );

-- Users can view invitations by code (for claiming)
CREATE POLICY "Users can view invitations by code" 
    ON barber_invitations FOR SELECT 
    USING (
        invitation_code IS NOT NULL AND
        status = 'pending' AND
        expires_at > NOW()
    );

-- Users can claim invitations
CREATE POLICY "Users can claim invitations" 
    ON barber_invitations FOR UPDATE 
    USING (
        invitation_code IS NOT NULL AND
        status = 'pending' AND
        expires_at > NOW() AND
        claimed_by IS NULL
    )
    WITH CHECK (
        claimed_by = auth.uid() AND
        status = 'accepted'
    );

-- Provisional Barbers Policies

-- Barbershop owners can view their provisional barbers
CREATE POLICY "Owners can view provisional barbers" 
    ON provisional_barbers FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM barbershops bs
            WHERE bs.id = provisional_barbers.barbershop_id
            AND bs.owner_id = auth.uid()
        )
    );

-- Barbershop owners can create provisional barbers
CREATE POLICY "Owners can create provisional barbers" 
    ON provisional_barbers FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM barbershops bs
            WHERE bs.id = provisional_barbers.barbershop_id
            AND bs.owner_id = auth.uid()
        ) AND created_by = auth.uid()
    );

-- Barbershop owners can update their provisional barbers
CREATE POLICY "Owners can update provisional barbers" 
    ON provisional_barbers FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM barbershops bs
            WHERE bs.id = provisional_barbers.barbershop_id
            AND bs.owner_id = auth.uid()
        )
    );

-- Barbershop owners can delete their provisional barbers
CREATE POLICY "Owners can delete provisional barbers" 
    ON provisional_barbers FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM barbershops bs
            WHERE bs.id = provisional_barbers.barbershop_id
            AND bs.owner_id = auth.uid()
        )
    );

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to generate unique invitation codes
CREATE OR REPLACE FUNCTION generate_invitation_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    code text;
    code_exists boolean;
BEGIN
    LOOP
        -- Generate a 6-character alphanumeric code
        code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
        
        -- Check if code already exists
        SELECT EXISTS(
            SELECT 1 FROM barber_invitations 
            WHERE invitation_code = code
        ) INTO code_exists;
        
        EXIT WHEN NOT code_exists;
    END LOOP;
    
    RETURN code;
END;
$$;

-- Function to claim an invitation and create barber record
CREATE OR REPLACE FUNCTION claim_barber_invitation(
    p_invitation_code text,
    p_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invitation record;
    v_provisional record;
    v_barber_id uuid;
    v_result json;
BEGIN
    -- Get the invitation
    SELECT * INTO v_invitation
    FROM barber_invitations
    WHERE invitation_code = p_invitation_code
    AND status = 'pending'
    AND expires_at > NOW()
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or expired invitation code';
    END IF;
    
    -- Check if user already claimed an invitation
    IF v_invitation.claimed_by IS NOT NULL THEN
        RAISE EXCEPTION 'Invitation already claimed';
    END IF;
    
    -- Update the invitation
    UPDATE barber_invitations
    SET status = 'accepted',
        claimed_by = p_user_id,
        claimed_at = NOW(),
        updated_at = NOW()
    WHERE id = v_invitation.id;
    
    -- If manual invitation, get provisional barber data
    IF v_invitation.invitation_type = 'manual' THEN
        SELECT * INTO v_provisional
        FROM provisional_barbers
        WHERE invitation_id = v_invitation.id;
        
        -- Create barber record with provisional data
        INSERT INTO barbers (
            profile_id,
            barbershop_id,
            display_name,
            bio,
            specialties,
            years_experience,
            instagram_handle,
            commission_percentage,
            can_accept_tips,
            is_active
        ) VALUES (
            p_user_id,
            v_invitation.barbershop_id,
            COALESCE(v_provisional.display_name, v_invitation.display_name),
            v_provisional.bio,
            v_provisional.specialties,
            v_provisional.years_experience,
            v_provisional.instagram_handle,
            COALESCE(v_provisional.commission_percentage, 50),
            COALESCE(v_provisional.can_accept_tips, true),
            true
        )
        RETURNING id INTO v_barber_id;
        
        -- TODO: Also copy working hours if provided
    ELSE
        -- Email invitation - create basic barber record
        INSERT INTO barbers (
            profile_id,
            barbershop_id,
            display_name,
            commission_percentage,
            is_active
        ) VALUES (
            p_user_id,
            v_invitation.barbershop_id,
            v_invitation.display_name,
            50,
            true
        )
        RETURNING id INTO v_barber_id;
    END IF;
    
    -- Update user's role to barber
    UPDATE profiles
    SET role = 'barber',
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Return result
    v_result := json_build_object(
        'success', true,
        'barber_id', v_barber_id,
        'barbershop_id', v_invitation.barbershop_id,
        'invitation_type', v_invitation.invitation_type
    );
    
    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END;
$$;

-- Trigger to set invitation code for manual invitations
CREATE OR REPLACE FUNCTION set_invitation_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.invitation_type = 'manual' AND NEW.invitation_code IS NULL THEN
        NEW.invitation_code := generate_invitation_code();
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER set_invitation_code_trigger
    BEFORE INSERT ON barber_invitations
    FOR EACH ROW
    EXECUTE FUNCTION set_invitation_code();

-- Trigger to update timestamps
CREATE TRIGGER update_barber_invitations_updated_at
    BEFORE UPDATE ON barber_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_provisional_barbers_updated_at
    BEFORE UPDATE ON provisional_barbers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();