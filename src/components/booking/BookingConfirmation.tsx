import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Copy, 
  Download,
  MessageCircle,
  Star,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  description?: string;
}

interface SelectedSlot {
  barberId: string;
  barberName: string;
  barberAvatar?: string;
  date: Date;
  startTime: string;
  endTime: string;
}

interface CustomerData {
  fullName: string;
  phone: string;
  email?: string;
  notes?: string;
}

interface CompletedBooking {
  id: string;
  confirmationCode: string;
  services: Service[];
  barber: {
    name: string;
    avatar?: string;
  };
  slot: SelectedSlot;
  customer: CustomerData;
  totalPrice: number;
}

interface BookingConfirmationProps {
  booking: CompletedBooking;
  onNewBooking: () => void;
}

/**
 * BookingConfirmation - Professional confirmation screen
 * Fresha-style success page with booking details and actions
 */
export function BookingConfirmation({ booking, onNewBooking }: BookingConfirmationProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  /**
   * Copy confirmation code to clipboard
   */
  const copyConfirmationCode = async () => {
    try {
      await navigator.clipboard.writeText(booking.confirmationCode);
      setCopied(true);
      toast({
        title: 'Código copiado',
        description: 'El código de confirmación se copió al portapapeles',
      });

      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo copiar el código',
        variant: 'destructive',
      });
    }
  };

  /**
   * Format duration display
   */
  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  /**
   * Format price display
   */
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(price);
  };

  /**
   * Generate calendar event data
   */
  const generateCalendarEvent = () => {
    const startDateTime = new Date(`${booking.slot.date.toISOString().split('T')[0]}T${booking.slot.startTime}:00`);
    const endDateTime = new Date(`${booking.slot.date.toISOString().split('T')[0]}T${booking.slot.endTime}:00`);
    
    const title = `Cita en la barbería - ${booking.services.map(s => s.name).join(', ')}`;
    const details = `Barbero: ${booking.barber.name}\nServicios: ${booking.services.map(s => s.name).join(', ')}\nTotal: ${formatPrice(booking.totalPrice)}\nCódigo: ${booking.confirmationCode}`;
    
    // Google Calendar URL
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startDateTime.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}/${endDateTime.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}&details=${encodeURIComponent(details)}`;
    
    return googleCalendarUrl;
  };

  /**
   * Add to calendar
   */
  const addToCalendar = () => {
    const calendarUrl = generateCalendarEvent();
    window.open(calendarUrl, '_blank');
  };

  /**
   * Share booking details
   */
  const shareBooking = async () => {
    const shareText = `¡Reserva confirmada! 🎉\n\nCódigo: ${booking.confirmationCode}\nFecha: ${format(booking.slot.date, 'EEEE d \'de\' MMMM', { locale: es })}\nHora: ${booking.slot.startTime}\nBarbero: ${booking.barber.name}\nServicios: ${booking.services.map(s => s.name).join(', ')}\nTotal: ${formatPrice(booking.totalPrice)}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Reserva confirmada',
          text: shareText,
        });
      } catch (error) {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareText);
        toast({
          title: 'Compartido',
          description: 'Los detalles se copiaron al portapapeles',
        });
      }
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(shareText);
      toast({
        title: 'Compartido',
        description: 'Los detalles se copiaron al portapapeles',
      });
    }
  };

  const totalDuration = booking.services.reduce((sum, s) => sum + s.duration_minutes, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Success Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-green-800">¡Reserva confirmada!</h2>
          <p className="text-gray-600">
            Tu cita ha sido programada exitosamente
          </p>
        </div>

        {/* Confirmation Code */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-black text-white rounded-lg p-4 inline-block"
        >
          <div className="text-sm text-gray-300 mb-1">Código de confirmación</div>
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-mono font-bold">{booking.confirmationCode}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyConfirmationCode}
              className="text-white hover:bg-gray-800"
            >
              {copied ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>

      {/* Booking Details */}
      <Card className="p-6 space-y-6">
        <h3 className="font-semibold text-lg">Detalles de tu reserva</h3>

        {/* Date & Time */}
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-black text-white rounded-lg flex items-center justify-center flex-shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-lg">
              {format(booking.slot.date, 'EEEE d \'de\' MMMM \'de\' yyyy', { locale: es })}
            </div>
            <div className="text-gray-600 flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>{booking.slot.startTime} - {booking.slot.endTime}</span>
              <Badge variant="outline">{formatDuration(totalDuration)}</Badge>
            </div>
          </div>
        </div>

        <Separator />

        {/* Barber */}
        <div className="flex items-start space-x-4">
          <Avatar className="w-12 h-12 flex-shrink-0">
            <AvatarImage src={booking.barber.avatar} alt={booking.barber.name} />
            <AvatarFallback>
              <User className="w-6 h-6" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="font-medium text-lg">{booking.barber.name}</div>
            <div className="text-gray-600">Tu barbero asignado</div>
          </div>
        </div>

        <Separator />

        {/* Services */}
        <div className="space-y-3">
          <div className="font-medium">Servicios reservados</div>
          {booking.services.map((service) => (
            <div key={service.id} className="flex justify-between items-center">
              <div>
                <div className="font-medium">{service.name}</div>
                <div className="text-sm text-gray-600 flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatDuration(service.duration_minutes)}</span>
                </div>
              </div>
              <div className="font-medium">{formatPrice(service.price)}</div>
            </div>
          ))}
        </div>

        <Separator />

        {/* Customer Info */}
        <div className="space-y-3">
          <div className="font-medium">Información de contacto</div>
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <User className="w-4 h-4 text-gray-500" />
              <span>{booking.customer.fullName}</span>
            </div>
            <div className="flex items-center space-x-3">
              <Phone className="w-4 h-4 text-gray-500" />
              <span>{booking.customer.phone}</span>
            </div>
            {booking.customer.email && (
              <div className="flex items-center space-x-3">
                <Mail className="w-4 h-4 text-gray-500" />
                <span>{booking.customer.email}</span>
              </div>
            )}
          </div>
        </div>

        {booking.customer.notes && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="font-medium">Notas adicionales</div>
              <div className="text-gray-600 bg-gray-50 p-3 rounded-lg">
                {booking.customer.notes}
              </div>
            </div>
          </>
        )}

        <Separator />

        {/* Total */}
        <div className="flex justify-between items-center text-lg font-semibold">
          <span>Total</span>
          <span>{formatPrice(booking.totalPrice)}</span>
        </div>
      </Card>

      {/* Important Info */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="space-y-2">
          <div className="font-medium text-blue-800">Información importante</div>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Llega 5 minutos antes de tu cita</li>
            <li>• Puedes cancelar hasta 24 horas antes sin costo</li>
            <li>• Te enviaremos recordatorios por SMS y email</li>
            <li>• Guarda tu código de confirmación</li>
          </ul>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="space-y-3">
        {/* Primary Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button onClick={addToCalendar} variant="outline" className="space-x-2">
            <Calendar className="w-4 h-4" />
            <span>Agregar al calendario</span>
          </Button>
          
          <Button onClick={shareBooking} variant="outline" className="space-x-2">
            <MessageCircle className="w-4 h-4" />
            <span>Compartir</span>
          </Button>
        </div>

        {/* Secondary Actions */}
        <div className="grid grid-cols-1 gap-3">
          <Button onClick={onNewBooking} className="w-full space-x-2">
            <Plus className="w-4 h-4" />
            <span>Hacer otra reserva</span>
          </Button>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pt-4">
        <div className="text-sm text-gray-500">
          ¿Necesitas ayuda? Contáctanos por WhatsApp
        </div>
        <div className="text-xs text-gray-400 mt-2">
          ID de reserva: {booking.id.slice(0, 8)}
        </div>
      </div>
    </div>
  );
}