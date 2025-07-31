import { useEffect, useState, useCallback } from 'react';
import { realtimeService, AvailabilityUpdate } from '@/services/realtime.service';

interface UseRealtimeAvailabilityOptions {
  barberIds: string[];
  onUpdate?: (update: AvailabilityUpdate) => void;
}

interface AvailabilityState {
  [barberId: string]: {
    availableSlots: number;
    lastUpdated: Date;
  };
}

export function useRealtimeAvailability({
  barberIds,
  onUpdate,
}: UseRealtimeAvailabilityOptions) {
  const [availability, setAvailability] = useState<AvailabilityState>({});
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');

  const handleAvailabilityUpdate = useCallback((update: AvailabilityUpdate) => {
    // Update local state
    setAvailability(prev => ({
      ...prev,
      [update.barberId]: {
        availableSlots: update.availableSlots,
        lastUpdated: update.timestamp,
      },
    }));

    // Call custom handler if provided
    onUpdate?.(update);
  }, [onUpdate]);

  useEffect(() => {
    if (!barberIds || barberIds.length === 0) return;

    const unsubscribe = realtimeService.subscribeToAvailability(
      barberIds,
      {
        onUpdate: handleAvailabilityUpdate,
        onStatusChange: setConnectionStatus,
      }
    );

    return () => {
      unsubscribe();
    };
  }, [barberIds?.join(',') || '', handleAvailabilityUpdate]); // Join barberIds to create stable dependency

  return {
    availability,
    connectionStatus,
    isConnected: connectionStatus === 'connected',
  };
}

export default useRealtimeAvailability;