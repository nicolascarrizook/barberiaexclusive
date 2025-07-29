export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      analytics_events: {
        Row: {
          barbershop_id: string | null
          created_at: string
          event_data: Json
          event_type: string
          id: string
          ip_address: unknown | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          barbershop_id?: string | null
          created_at?: string
          event_data?: Json
          event_type: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          barbershop_id?: string | null
          created_at?: string
          event_data?: Json
          event_type?: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
      }
      appointments: {
        Row: {
          barber_id: string
          barbershop_id: string
          cancelled_at: string | null
          cancelled_by: string | null
          cancellation_reason: string | null
          completed_at: string | null
          confirmation_code: string | null
          created_at: string
          customer_id: string
          end_time: string
          id: string
          internal_notes: string | null
          no_show_marked_at: string | null
          notes: string | null
          price: number
          reminder_sent: boolean
          reminder_sent_at: string | null
          service_id: string
          start_time: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          barber_id: string
          barbershop_id: string
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancellation_reason?: string | null
          completed_at?: string | null
          confirmation_code?: string | null
          created_at?: string
          customer_id: string
          end_time: string
          id?: string
          internal_notes?: string | null
          no_show_marked_at?: string | null
          notes?: string | null
          price: number
          reminder_sent?: boolean
          reminder_sent_at?: string | null
          service_id: string
          start_time: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
          barber_id?: string
          barbershop_id?: string
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancellation_reason?: string | null
          completed_at?: string | null
          confirmation_code?: string | null
          created_at?: string
          customer_id?: string
          end_time?: string
          id?: string
          internal_notes?: string | null
          no_show_marked_at?: string | null
          notes?: string | null
          price?: number
          reminder_sent?: boolean
          reminder_sent_at?: string | null
          service_id?: string
          start_time?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
      }
      barber_services: {
        Row: {
          barber_id: string
          custom_duration_minutes: number | null
          custom_price: number | null
          is_available: boolean
          service_id: string
        }
        Insert: {
          barber_id: string
          custom_duration_minutes?: number | null
          custom_price?: number | null
          is_available?: boolean
          service_id: string
        }
        Update: {
          barber_id?: string
          custom_duration_minutes?: number | null
          custom_price?: number | null
          is_available?: boolean
          service_id?: string
        }
      }
      barbers: {
        Row: {
          barbershop_id: string
          bio: string | null
          can_accept_tips: boolean
          commission_percentage: number
          created_at: string
          display_name: string
          id: string
          instagram_handle: string | null
          is_active: boolean
          profile_id: string
          rating: number
          specialties: string[] | null
          total_reviews: number
          updated_at: string
          years_experience: number | null
        }
        Insert: {
          barbershop_id: string
          bio?: string | null
          can_accept_tips?: boolean
          commission_percentage?: number
          created_at?: string
          display_name: string
          id?: string
          instagram_handle?: string | null
          is_active?: boolean
          profile_id: string
          rating?: number
          specialties?: string[] | null
          total_reviews?: number
          updated_at?: string
          years_experience?: number | null
        }
        Update: {
          barbershop_id?: string
          bio?: string | null
          can_accept_tips?: boolean
          commission_percentage?: number
          created_at?: string
          display_name?: string
          id?: string
          instagram_handle?: string | null
          is_active?: boolean
          profile_id?: string
          rating?: number
          specialties?: string[] | null
          total_reviews?: number
          updated_at?: string
          years_experience?: number | null
        }
      }
      barbershops: {
        Row: {
          address: string
          city: string
          country: string
          cover_image_url: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          is_active: boolean
          location: unknown | null
          logo_url: string | null
          name: string
          owner_id: string
          phone: string
          settings: Json
          slug: string
          social_media: Json
          state: string
          updated_at: string
          website: string | null
          zip_code: string | null
        }
        Insert: {
          address: string
          city: string
          country?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          location?: unknown | null
          logo_url?: string | null
          name: string
          owner_id: string
          phone: string
          settings?: Json
          slug: string
          social_media?: Json
          state: string
          updated_at?: string
          website?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string
          city?: string
          country?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          location?: unknown | null
          logo_url?: string | null
          name?: string
          owner_id?: string
          phone?: string
          settings?: Json
          slug?: string
          social_media?: Json
          state?: string
          updated_at?: string
          website?: string | null
          zip_code?: string | null
        }
      }
      notification_templates: {
        Row: {
          barbershop_id: string | null
          channel: Database["public"]["Enums"]["notification_channel"]
          content_template: string
          created_at: string
          id: string
          is_active: boolean
          language: string
          subject_template: string | null
          type: Database["public"]["Enums"]["notification_type"]
          updated_at: string
        }
        Insert: {
          barbershop_id?: string | null
          channel: Database["public"]["Enums"]["notification_channel"]
          content_template: string
          created_at?: string
          id?: string
          is_active?: boolean
          language?: string
          subject_template?: string | null
          type: Database["public"]["Enums"]["notification_type"]
          updated_at?: string
        }
        Update: {
          barbershop_id?: string | null
          channel?: Database["public"]["Enums"]["notification_channel"]
          content_template?: string
          created_at?: string
          id?: string
          is_active?: boolean
          language?: string
          subject_template?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"]
          content: string
          created_at: string
          delivered_at: string | null
          error_message: string | null
          id: string
          metadata: Json
          read_at: string | null
          recipient_id: string
          retry_count: number
          scheduled_for: string | null
          sent_at: string | null
          subject: string | null
          type: Database["public"]["Enums"]["notification_type"]
          updated_at: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["notification_channel"]
          content: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json
          read_at?: string | null
          recipient_id: string
          retry_count?: number
          scheduled_for?: string | null
          sent_at?: string | null
          subject?: string | null
          type: Database["public"]["Enums"]["notification_type"]
          updated_at?: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          content?: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json
          read_at?: string | null
          recipient_id?: string
          retry_count?: number
          scheduled_for?: string | null
          sent_at?: string | null
          subject?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
          updated_at?: string
        }
      }
      payments: {
        Row: {
          amount: number
          appointment_id: string
          created_at: string
          id: string
          method: Database["public"]["Enums"]["payment_method"] | null
          notes: string | null
          processed_at: string | null
          refund_amount: number
          refunded_at: string | null
          status: Database["public"]["Enums"]["payment_status"]
          tip_amount: number
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          appointment_id: string
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"] | null
          notes?: string | null
          processed_at?: string | null
          refund_amount?: number
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          tip_amount?: number
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          appointment_id?: string
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"] | null
          notes?: string | null
          processed_at?: string | null
          refund_amount?: number
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          tip_amount?: number
          transaction_id?: string | null
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          notification_preferences: Json
          phone: string | null
          preferred_language: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          is_active?: boolean
          notification_preferences?: Json
          phone?: string | null
          preferred_language?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          notification_preferences?: Json
          phone?: string | null
          preferred_language?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
      }
      promotions: {
        Row: {
          applicable_barbers: string[] | null
          applicable_services: string[] | null
          barbershop_id: string
          code: string | null
          created_at: string
          description: string | null
          discount_amount: number | null
          discount_percentage: number | null
          end_date: string
          id: string
          is_active: boolean
          max_uses: number | null
          minimum_amount: number | null
          name: string
          start_date: string
          updated_at: string
          uses_count: number
        }
        Insert: {
          applicable_barbers?: string[] | null
          applicable_services?: string[] | null
          barbershop_id: string
          code?: string | null
          created_at?: string
          description?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          end_date: string
          id?: string
          is_active?: boolean
          max_uses?: number | null
          minimum_amount?: number | null
          name: string
          start_date: string
          updated_at?: string
          uses_count?: number
        }
        Update: {
          applicable_barbers?: string[] | null
          applicable_services?: string[] | null
          barbershop_id?: string
          code?: string | null
          created_at?: string
          description?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          end_date?: string
          id?: string
          is_active?: boolean
          max_uses?: number | null
          minimum_amount?: number | null
          name?: string
          start_date?: string
          updated_at?: string
          uses_count?: number
        }
      }
      reviews: {
        Row: {
          appointment_id: string
          barber_id: string
          barbershop_id: string
          comment: string | null
          created_at: string
          customer_id: string
          id: string
          is_visible: boolean
          rating: number
          replied_at: string | null
          replied_by: string | null
          reply: string | null
          updated_at: string
        }
        Insert: {
          appointment_id: string
          barber_id: string
          barbershop_id: string
          comment?: string | null
          created_at?: string
          customer_id: string
          id?: string
          is_visible?: boolean
          rating: number
          replied_at?: string | null
          replied_by?: string | null
          reply?: string | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          barber_id?: string
          barbershop_id?: string
          comment?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          is_visible?: boolean
          rating?: number
          replied_at?: string | null
          replied_by?: string | null
          reply?: string | null
          updated_at?: string
        }
      }
      services: {
        Row: {
          barbershop_id: string
          category: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          order_index: number
          price: number
          updated_at: string
        }
        Insert: {
          barbershop_id: string
          category?: string | null
          created_at?: string
          description?: string | null
          duration_minutes: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          order_index?: number
          price: number
          updated_at?: string
        }
        Update: {
          barbershop_id?: string
          category?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          order_index?: number
          price?: number
          updated_at?: string
        }
      }
      special_dates: {
        Row: {
          barber_id: string | null
          barbershop_id: string | null
          created_at: string
          custom_hours: Json | null
          date: string
          id: string
          is_holiday: boolean
          reason: string | null
        }
        Insert: {
          barber_id?: string | null
          barbershop_id?: string | null
          created_at?: string
          custom_hours?: Json | null
          date: string
          id?: string
          is_holiday?: boolean
          reason?: string | null
        }
        Update: {
          barber_id?: string | null
          barbershop_id?: string | null
          created_at?: string
          custom_hours?: Json | null
          date?: string
          id?: string
          is_holiday?: boolean
          reason?: string | null
        }
      }
      waiting_list: {
        Row: {
          barber_id: string | null
          barbershop_id: string
          created_at: string
          customer_id: string
          flexibility_days: number
          id: string
          is_active: boolean
          notified_at: string | null
          preferred_date: string
          preferred_time_end: string | null
          preferred_time_start: string | null
          service_id: string | null
          updated_at: string
        }
        Insert: {
          barber_id?: string | null
          barbershop_id: string
          created_at?: string
          customer_id: string
          flexibility_days?: number
          id?: string
          is_active?: boolean
          notified_at?: string | null
          preferred_date: string
          preferred_time_end?: string | null
          preferred_time_start?: string | null
          service_id?: string | null
          updated_at?: string
        }
        Update: {
          barber_id?: string | null
          barbershop_id?: string
          created_at?: string
          customer_id?: string
          flexibility_days?: number
          id?: string
          is_active?: boolean
          notified_at?: string | null
          preferred_date?: string
          preferred_time_end?: string | null
          preferred_time_start?: string | null
          service_id?: string | null
          updated_at?: string
        }
      }
      working_hours: {
        Row: {
          barber_id: string
          break_end: string | null
          break_start: string | null
          created_at: string
          day_of_week: Database["public"]["Enums"]["day_of_week"]
          end_time: string
          id: string
          is_working: boolean
          start_time: string
          updated_at: string
        }
        Insert: {
          barber_id: string
          break_end?: string | null
          break_start?: string | null
          created_at?: string
          day_of_week: Database["public"]["Enums"]["day_of_week"]
          end_time: string
          id?: string
          is_working?: boolean
          start_time: string
          updated_at?: string
        }
        Update: {
          barber_id?: string
          break_end?: string | null
          break_start?: string | null
          created_at?: string
          day_of_week?: Database["public"]["Enums"]["day_of_week"]
          end_time?: string
          id?: string
          is_working?: boolean
          start_time?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_slot_availability: {
        Args: {
          p_barber_id: string
          p_start_time: string
          p_end_time: string
          p_exclude_appointment_id?: string
        }
        Returns: boolean
      }
      cleanup_old_notifications: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      generate_confirmation_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      mark_no_shows: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      update_barber_rating: {
        Args: {
          p_barber_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      appointment_status:
        | "pending"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "no_show"
      day_of_week:
        | "monday"
        | "tuesday"
        | "wednesday"
        | "thursday"
        | "friday"
        | "saturday"
        | "sunday"
      notification_channel: "email" | "sms" | "push" | "in_app"
      notification_type:
        | "appointment_reminder"
        | "appointment_confirmation"
        | "appointment_cancellation"
        | "appointment_rescheduled"
        | "promotion"
        | "general"
      payment_method:
        | "cash"
        | "credit_card"
        | "debit_card"
        | "mobile_payment"
        | "other"
      payment_status:
        | "pending"
        | "paid"
        | "partially_paid"
        | "refunded"
        | "cancelled"
      user_role: "customer" | "barber" | "admin" | "owner"
    }
  }
}