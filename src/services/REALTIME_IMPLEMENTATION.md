# Real-time Implementation Documentation

## Overview

This document describes the real-time subscription system implemented for the booking flow using Supabase Realtime. The system provides live updates for appointment changes and availability updates.

## Components

### 1. Real-time Service (`realtime.service.ts`)

The core service that manages all real-time subscriptions:

- **Appointment subscriptions**: Listen to appointment changes (create, update, delete)
- **Availability subscriptions**: Broadcast and receive availability updates
- **Slot updates**: Real-time updates for specific date/barber combinations
- **Automatic reconnection**: Exponential backoff for connection failures
- **Cleanup management**: Proper unsubscribe and resource cleanup

### 2. Updated Components

#### DateTimeSelection Component
- Subscribes to real-time slot updates for the selected barber and date
- Automatically refreshes available time slots when appointments change
- Shows toast notifications when slots are updated

#### BarberSelection Component
- Subscribes to availability updates for all displayed barbers
- Updates availability counts in real-time
- Shows visual feedback when barber availability changes

#### BookingFlow Component
- Broadcasts availability updates after creating appointments
- Integrates with the real-time service for immediate UI updates

### 3. Appointments Service Updates
- Enhanced `createAppointment` method broadcasts availability changes
- `cancelAppointment` method now broadcasts availability restoration
- Automatic availability recalculation after appointment changes

### 4. Custom Hooks

#### `useRealtimeAppointments`
```typescript
const { } = useRealtimeAppointments({
  barbershopId: 'shop-123',
  barberId: 'barber-456',
  date: '2024-01-20',
  onAppointmentChange: (event) => {
    // Handle appointment changes
  },
  showNotifications: true
});
```

#### `useRealtimeAvailability`
```typescript
const { availability, isConnected } = useRealtimeAvailability({
  barberIds: ['barber-1', 'barber-2'],
  onUpdate: (update) => {
    // Handle availability updates
  }
});
```

### 5. RealtimeBookingIndicator Component
A visual indicator showing:
- Connection status (live/disconnected)
- Active booking count (how many people are currently booking)

## Usage Examples

### Basic Subscription
```typescript
import { realtimeService } from '@/services/realtime.service';

// Subscribe to appointments
const unsubscribe = realtimeService.subscribeToAppointments(
  { barbershopId: 'shop-123' },
  {
    onChange: (event) => {
      console.log('Appointment changed:', event);
    },
    onStatusChange: (status) => {
      console.log('Connection status:', status);
    }
  }
);

// Cleanup
unsubscribe();
```

### Broadcasting Updates
```typescript
// After creating/canceling an appointment
await realtimeService.broadcastAvailabilityUpdate({
  barberId: 'barber-123',
  date: '2024-01-20',
  availableSlots: 5,
  timestamp: new Date()
});
```

## Database Considerations

The real-time system relies on Supabase's built-in real-time capabilities:

1. **Appointments table**: Automatically broadcasts changes
2. **RLS policies**: Ensure users only receive relevant updates
3. **Custom broadcasts**: For availability updates not tied to database changes

## Performance Optimizations

1. **Filtered subscriptions**: Only subscribe to relevant data (by barbershop, barber, date)
2. **Debounced updates**: Prevent UI thrashing with rapid changes
3. **Selective re-rendering**: Components only update when their specific data changes
4. **Connection pooling**: Reuse channels when possible

## Error Handling

1. **Automatic reconnection**: Up to 5 attempts with exponential backoff
2. **Graceful degradation**: App continues to work without real-time updates
3. **User notifications**: Optional toast messages for connection issues
4. **Fallback to polling**: Components can fall back to periodic data fetching

## Security

1. **RLS enforcement**: All real-time subscriptions respect Row Level Security
2. **Filtered broadcasts**: Availability updates only sent to relevant subscribers
3. **No sensitive data**: Only necessary information in real-time payloads

## Future Enhancements

1. **Presence tracking**: Show which slots are being viewed by other users
2. **Optimistic locking**: Prevent double-booking with real-time locks
3. **Queue management**: Handle high-demand slots with virtual queues
4. **Analytics**: Track real-time usage patterns for better resource allocation