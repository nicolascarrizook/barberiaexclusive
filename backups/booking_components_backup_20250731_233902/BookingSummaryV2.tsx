import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Barber, Service } from "@/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  CheckCircle2, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  MessageSquare,
  Copy,
  Share2,
  CalendarPlus
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";
import { useEffect } from "react";

interface BookingSummaryV2Props {
  service: Service;
  barber: Barber;
  date: Date;
  time: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  notes?: string;
  confirmationCode?: string;
  onNewBooking: () => void;
}

export function BookingSummaryV2({
  service,
  barber,
  date,
  time,
  customerName,
  customerPhone,
  customerEmail,
  notes,
  confirmationCode = "ABC123",
  onNewBooking,
}: BookingSummaryV2Props) {
  const { toast } = useToast();

  // Trigger confetti on mount
  useEffect(() => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: `${label} copiado`,
      description: "Se copió al portapapeles",
    });
  };

  const shareBooking = async () => {
    const text = `Mi reserva en Barbería:
📅 ${format(date, "EEEE d 'de' MMMM", { locale: es })}
⏰ ${time} hs
💈 ${service.name} con ${barber.name}
📍 Código: ${confirmationCode}`;

    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      copyToClipboard(text, "Detalles de reserva");
    }
  };

  const addToCalendar = () => {
    const startDateTime = new Date(date);
    const [hours, minutes] = time.split(':').map(Number);
    startDateTime.setHours(hours, minutes, 0, 0);
    
    const endDateTime = new Date(startDateTime);
    endDateTime.setMinutes(endDateTime.getMinutes() + service.duration_minutes);

    const event = {
      text: `${service.name} - Barbería`,
      dates: `${startDateTime.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}/${endDateTime.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
      details: `Servicio: ${service.name}\nBarbero: ${barber.name}\nCódigo: ${confirmationCode}`,
    };

    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.text)}&dates=${event.dates}&details=${encodeURIComponent(event.details)}`;
    window.open(googleCalendarUrl, '_blank');
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6"
    >
      {/* Success header */}
      <div className="text-center space-y-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="inline-flex"
        >
          <CheckCircle2 className="h-16 w-16 text-green-600" />
        </motion.div>
        
        <div>
          <h2 className="text-2xl font-bold">
            ¡Reserva confirmada!
          </h2>
          <p className="text-muted-foreground mt-2">
            Te esperamos el {format(date, "EEEE d 'de' MMMM", { locale: es })}
          </p>
        </div>

        {/* Confirmation code */}
        <Card className="inline-flex items-center gap-3 p-4">
          <div className="text-left">
            <p className="text-sm text-muted-foreground">Código de confirmación</p>
            <p className="text-xl font-mono font-bold">{confirmationCode}</p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => copyToClipboard(confirmationCode, "Código")}
            className="h-8 w-8"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </Card>
      </div>

      {/* Booking details */}
      <Card className="p-6 space-y-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Detalles de tu reserva
        </h3>
        
        <div className="grid gap-4">
          {/* Date and time */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Fecha</span>
            </div>
            <span className="font-medium">
              {format(date, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Hora</span>
            </div>
            <span className="font-medium">{time} hs</span>
          </div>

          <Separator />

          {/* Service and barber */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>Servicio</span>
            </div>
            <div className="text-right">
              <p className="font-medium">{service.name}</p>
              <p className="text-sm text-muted-foreground">
                {service.duration_minutes} min • ${service.price}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>Barbero</span>
            </div>
            <span className="font-medium">{barber.name}</span>
          </div>

          <Separator />

          {/* Customer info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>Nombre</span>
            </div>
            <span className="font-medium">{customerName}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>Teléfono</span>
            </div>
            <span className="font-medium">{customerPhone}</span>
          </div>

          {customerEmail && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>Email</span>
              </div>
              <span className="font-medium">{customerEmail}</span>
            </div>
          )}

          {notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MessageSquare className="h-4 w-4" />
                  <span>Notas</span>
                </div>
                <p className="text-sm bg-muted/50 rounded-lg p-3">{notes}</p>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Actions */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={shareBooking}
            className="h-12"
          >
            <Share2 className="mr-2 h-4 w-4" />
            Compartir
          </Button>
          <Button
            variant="outline"
            onClick={addToCalendar}
            className="h-12"
          >
            <CalendarPlus className="mr-2 h-4 w-4" />
            Agregar al calendario
          </Button>
        </div>
        
        <Button
          onClick={onNewBooking}
          size="lg"
          className="w-full"
        >
          Hacer otra reserva
        </Button>
      </div>

      {/* Info message */}
      <Card className="p-4 bg-muted/30 border-muted">
        <p className="text-sm text-center text-muted-foreground">
          Recibirás un recordatorio por SMS el día anterior a tu cita.
          Si necesitas cancelar o reprogramar, contáctanos al menos 2 horas antes.
        </p>
      </Card>
    </motion.div>
  );
}