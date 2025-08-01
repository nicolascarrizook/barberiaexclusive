import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, DollarSign, User, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Service, Barber } from "@/types";

interface BookingSummaryProps {
  service: Service;
  barber: Barber;
  date: Date;
  time: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  notes?: string;
  onNewBooking: () => void;
}

export function BookingSummary({
  service,
  barber,
  date,
  time,
  customerName,
  customerPhone,
  customerEmail,
  notes,
  onNewBooking,
}: BookingSummaryProps) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="flex justify-center mb-4">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2">¡Reserva confirmada!</h2>
        <p className="text-muted-foreground">
          Te hemos enviado los detalles de tu cita
        </p>
      </div>

      <Alert>
        <AlertDescription>
          Hemos enviado un mensaje de confirmación a tu teléfono. Recibirás un
          recordatorio 24 horas antes de tu cita.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Detalles de la reserva</CardTitle>
          <CardDescription>
            Guarda esta información para tu referencia
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={barber.avatar} alt={barber.name} />
              <AvatarFallback>
                {barber.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{barber.name}</p>
              <p className="text-sm text-muted-foreground">Barbero</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {time} ({service.duration_minutes} minutos)
              </span>
            </div>
            <div className="flex items-center gap-3">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">${service.price}</span>
            </div>
          </div>

          <Separator />

          <div>
            <Badge variant="secondary" className="mb-2">
              {service.name}
            </Badge>
            {service.description && (
              <p className="text-sm text-muted-foreground">
                {service.description}
              </p>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{customerName}</p>
                <p className="text-sm text-muted-foreground">{customerPhone}</p>
                {customerEmail && (
                  <p className="text-sm text-muted-foreground">
                    {customerEmail}
                  </p>
                )}
              </div>
            </div>
            {notes && (
              <div className="mt-2">
                <p className="text-sm font-medium mb-1">Notas:</p>
                <p className="text-sm text-muted-foreground">{notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button onClick={onNewBooking} size="lg">
          Hacer otra reserva
        </Button>
      </div>
    </div>
  );
}
