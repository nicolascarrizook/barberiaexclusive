// Temporary types for barber invitations until database.generated.ts is updated
export interface BarberInvitation {
  id: string;
  barbershop_id: string;
  email?: string | null;
  display_name: string;
  invitation_type: 'email' | 'manual';
  invitation_code?: string | null;
  message?: string | null;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expires_at: string;
  created_by: string;
  claimed_by?: string | null;
  claimed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProvisionalBarber {
  id: string;
  barbershop_id: string;
  invitation_id: string;
  display_name: string;
  bio?: string | null;
  specialties?: string[] | null;
  years_experience?: number | null;
  instagram_handle?: string | null;
  commission_percentage: number;
  can_accept_tips: boolean;
  working_hours?: any | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}