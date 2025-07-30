// Re-export the generated types
export * from './database.generated';

// Additional type helpers for convenience
// // // // // import { Database } from './database.generated'

export type Tables = Database['public']['Tables'];
export type Enums = Database['public']['Enums'];

// Table row types
export type Profile = Tables['profiles']['Row'];
export type Barbershop = Tables['barbershops']['Row'];
export type Barber = Tables['barbers']['Row'];
export type Service = Tables['services']['Row'];
export type Appointment = Tables['appointments']['Row'];
export type Payment = Tables['payments']['Row'];
export type Review = Tables['reviews']['Row'];
export type Notification = Tables['notifications']['Row'];
export type WaitingList = Tables['waiting_list']['Row'];
export type Promotion = Tables['promotions']['Row'];
export type BarbershopHours = Tables['barbershop_hours']['Row'];
export type TimeOff = Tables['time_off']['Row'];
export type BarberBreaks = Tables['barber_breaks']['Row'];

// Enum types
export type UserRole = Enums['user_role'];
export type AppointmentStatus = Enums['appointment_status'];
export type PaymentStatus = Enums['payment_status'];
export type PaymentMethod = Enums['payment_method'];
export type NotificationType = Enums['notification_type'];
export type NotificationChannel = Enums['notification_channel'];
export type DayOfWeek = Enums['day_of_week'];
export type TimeOffStatus = Enums['time_off_status'];
