import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Users, Wifi, WifiOff } from 'lucide-react';
import { realtimeService } from '@/services/realtime.service';

interface RealtimeBookingIndicatorProps {
  barberId?: string;
  date?: string;
}

export function RealtimeBookingIndicator({ barberId, date }: RealtimeBookingIndicatorProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [activeBookings, setActiveBookings] = useState(0);

  useEffect(() => {
    if (!barberId || !date) return;

    let bookingCount = 0;
    const resetTimeout = setTimeout(() => {
      setActiveBookings(0);
    }, 30000); // Reset after 30 seconds of no activity

    const unsubscribe = realtimeService.subscribeToAppointments(
      { barberId, date },
      {
        onChange: (event) => {
          if (event.eventType === 'INSERT') {
            bookingCount++;
            setActiveBookings(bookingCount);
            
            // Reset the counter after 5 seconds
            setTimeout(() => {
              bookingCount = Math.max(0, bookingCount - 1);
              setActiveBookings(bookingCount);
            }, 5000);
          }
        },
        onStatusChange: (status) => {
          setIsConnected(status === 'connected');
        },
      }
    );

    return () => {
      clearTimeout(resetTimeout);
      unsubscribe();
    };
  }, [barberId, date]);

  if (!barberId || !date) return null;

  return (
    <div className="flex items-center gap-2">
      {isConnected ? (
        <Badge variant="secondary" className="gap-1 text-xs">
          <Wifi className="h-3 w-3" />
          En vivo
        </Badge>
      ) : (
        <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
          <WifiOff className="h-3 w-3" />
          Desconectado
        </Badge>
      )}
      
      {activeBookings > 0 && (
        <Badge variant="default" className="gap-1 text-xs animate-pulse">
          <Users className="h-3 w-3" />
          {activeBookings} {activeBookings === 1 ? 'persona reservando' : 'personas reservando'}
        </Badge>
      )}
    </div>
  );
}

export default RealtimeBookingIndicator;