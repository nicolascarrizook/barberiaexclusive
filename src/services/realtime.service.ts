import { supabase } from '@/lib/supabase';
import {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';
import { Appointment } from '@/types/database';

// Real-time event types
export type AppointmentChangeEvent = RealtimePostgresChangesPayload<Appointment>;

export interface RealtimeSubscriptionOptions {
  barbershopId?: string;
  barberId?: string;
  date?: string; // ISO date string (YYYY-MM-DD)
}

export interface AvailabilityUpdate {
  barberId: string;
  date: string;
  availableSlots: number;
  timestamp: Date;
}

// Callback types
export type AppointmentChangeCallback = (event: AppointmentChangeEvent) => void;
export type AvailabilityUpdateCallback = (update: AvailabilityUpdate) => void;
export type ConnectionStatusCallback = (status: 'connected' | 'disconnected' | 'error') => void;

class RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private maxReconnectAttempts = 5;
  private baseReconnectDelay = 1000; // 1 second

  /**
   * Subscribe to appointment changes for a barbershop or specific barber
   */
  subscribeToAppointments(
    options: RealtimeSubscriptionOptions,
    callbacks: {
      onChange?: AppointmentChangeCallback;
      onStatusChange?: ConnectionStatusCallback;
    }
  ): () => void {
    const channelName = this.buildChannelName('appointments', options);
    
    // Clean up existing channel if any
    this.unsubscribeFromChannel(channelName);

    // Create new channel
    const channel = supabase.channel(channelName);

    // Build filter conditions
    let filter = 'appointments';
    if (options.barbershopId) {
      filter += `:barbershop_id=eq.${options.barbershopId}`;
    }
    if (options.barberId) {
      filter += `:barber_id=eq.${options.barberId}`;
    }

    // Subscribe to database changes
    channel
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'appointments',
          filter: options.barbershopId ? `barbershop_id=eq.${options.barbershopId}` : undefined,
        },
        (payload: AppointmentChangeEvent) => {
          // Additional filtering for barber_id and date if needed
          const appointment = payload.new as Appointment || payload.old as Appointment;
          
          if (options.barberId && appointment?.barber_id !== options.barberId) {
            return;
          }

          if (options.date) {
            const appointmentDate = appointment?.start_time?.split('T')[0];
            if (appointmentDate !== options.date) {
              return;
            }
          }

          callbacks.onChange?.(payload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          callbacks.onStatusChange?.('connected');
          this.resetReconnectAttempts(channelName);
        } else if (status === 'CLOSED') {
          callbacks.onStatusChange?.('disconnected');
          this.handleReconnection(channelName, options, callbacks);
        } else if (status === 'CHANNEL_ERROR') {
          callbacks.onStatusChange?.('error');
          this.handleReconnection(channelName, options, callbacks);
        }
      });

    this.channels.set(channelName, channel);

    // Return unsubscribe function
    return () => this.unsubscribeFromChannel(channelName);
  }

  /**
   * Subscribe to availability updates for specific barbers
   * This uses a custom broadcast channel for real-time availability counts
   */
  subscribeToAvailability(
    barberIds: string[],
    callbacks: {
      onUpdate?: AvailabilityUpdateCallback;
      onStatusChange?: ConnectionStatusCallback;
    }
  ): () => void {
    const channelName = `availability:${barberIds.join(',')}`;
    
    // Clean up existing channel
    this.unsubscribeFromChannel(channelName);

    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'availability_update' }, (payload) => {
        const update = payload.payload as AvailabilityUpdate;
        if (barberIds.includes(update.barberId)) {
          callbacks.onUpdate?.(update);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          callbacks.onStatusChange?.('connected');
          this.resetReconnectAttempts(channelName);
        } else if (status === 'CLOSED') {
          callbacks.onStatusChange?.('disconnected');
          this.handleReconnection(channelName, { barberIds }, callbacks);
        } else if (status === 'CHANNEL_ERROR') {
          callbacks.onStatusChange?.('error');
          this.handleReconnection(channelName, { barberIds }, callbacks);
        }
      });

    this.channels.set(channelName, channel);

    return () => this.unsubscribeFromChannel(channelName);
  }

  /**
   * Broadcast availability update (typically called after appointment changes)
   */
  async broadcastAvailabilityUpdate(update: AvailabilityUpdate): Promise<void> {
    const channelName = `availability:broadcast`;
    
    const channel = this.channels.get(channelName) || supabase.channel(channelName);
    
    if (!this.channels.has(channelName)) {
      await channel.subscribe();
      this.channels.set(channelName, channel);
    }

    await channel.send({
      type: 'broadcast',
      event: 'availability_update',
      payload: update,
    });
  }

  /**
   * Subscribe to real-time slot updates for a specific date and barber
   */
  subscribeToSlotUpdates(
    barberId: string,
    date: string,
    callbacks: {
      onSlotChange?: () => void;
      onStatusChange?: ConnectionStatusCallback;
    }
  ): () => void {
    const options: RealtimeSubscriptionOptions = { barberId, date };
    
    return this.subscribeToAppointments(options, {
      onChange: (event) => {
        // Any appointment change for this barber on this date triggers a slot update
        callbacks.onSlotChange?.();
      },
      onStatusChange: callbacks.onStatusChange,
    });
  }

  /**
   * Clean up a specific channel
   */
  private unsubscribeFromChannel(channelName: string): void {
    const channel = this.channels.get(channelName);
    if (channel) {
      channel.unsubscribe();
      this.channels.delete(channelName);
    }

    // Clear any reconnection timeouts
    const timeout = this.reconnectTimeouts.get(channelName);
    if (timeout) {
      clearTimeout(timeout);
      this.reconnectTimeouts.delete(channelName);
    }
    this.reconnectAttempts.delete(channelName);
  }

  /**
   * Handle reconnection with exponential backoff
   */
  private handleReconnection(
    channelName: string,
    options: RealtimeSubscriptionOptions,
    callbacks: {
      onChange?: AppointmentChangeCallback | AvailabilityChangeCallback;
      onStatusChange?: ConnectionStatusCallback;
    }
  ): void {
    const attempts = this.reconnectAttempts.get(channelName) || 0;
    
    if (attempts >= this.maxReconnectAttempts) {
      console.error(`Max reconnection attempts reached for channel: ${channelName}`);
      callbacks.onStatusChange?.('error');
      return;
    }

    const delay = this.baseReconnectDelay * Math.pow(2, attempts);
    
    const timeout = setTimeout(() => {
      this.reconnectAttempts.set(channelName, attempts + 1);
      
      if (channelName.startsWith('appointments')) {
        this.subscribeToAppointments(options, callbacks);
      } else if (channelName.startsWith('availability')) {
        this.subscribeToAvailability(options.barberIds, callbacks);
      }
    }, delay);

    this.reconnectTimeouts.set(channelName, timeout);
  }

  /**
   * Reset reconnection attempts for a channel
   */
  private resetReconnectAttempts(channelName: string): void {
    this.reconnectAttempts.delete(channelName);
    const timeout = this.reconnectTimeouts.get(channelName);
    if (timeout) {
      clearTimeout(timeout);
      this.reconnectTimeouts.delete(channelName);
    }
  }

  /**
   * Build a unique channel name based on options
   */
  private buildChannelName(prefix: string, options: RealtimeSubscriptionOptions): string {
    const parts = [prefix];
    if (options.barbershopId) parts.push(`shop:${options.barbershopId}`);
    if (options.barberId) parts.push(`barber:${options.barberId}`);
    if (options.date) parts.push(`date:${options.date}`);
    return parts.join(':');
  }

  /**
   * Clean up all subscriptions
   */
  cleanup(): void {
    this.channels.forEach((channel, name) => {
      this.unsubscribeFromChannel(name);
    });
  }
}

export const realtimeService = new RealtimeService();