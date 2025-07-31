import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Appointment } from "@/types";
import { AppointmentWithDetails } from "@/services/appointments.service";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Clock, DollarSign, Phone, Mail, User, FileText } from "lucide-react";

// Extended appointment type that can handle both formats
type ExtendedAppointment = Appointment & {
  // For backward compatibility with existing format
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  serviceName?: string;
  duration?: number;
  barberName?: string;
  date?: Date;
  time?: string;
  // From AppointmentWithDetails
  client?: {
    full_name: string;
    phone: string;
    email: string | null;
  };
  service?: {
    name: string;
    duration: number;
    price: number;
  };
  barber?: {
    id: string;
    display_name: string;
    profile: {
      id: string;
      full_name: string;
      avatar_url: string | null;
    };
  };
};

interface AppointmentDetailsProps {
  appointment: ExtendedAppointment | AppointmentWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (id: string, status: Appointment['status']) => void;
}

export function AppointmentDetails({ 
  appointment, 
  isOpen, 
  onClose,
  onUpdateStatus 
}: AppointmentDetailsProps) {
  if (!appointment) return null;

  // Extract data from either format
  const customerName = appointment.customerName || appointment.client?.full_name || 'N/A';
  const customerPhone = appointment.customerPhone || appointment.client?.phone || 'N/A';
  const customerEmail = appointment.customerEmail || appointment.client?.email || null;
  const serviceName = appointment.serviceName || appointment.service?.name || 'N/A';
  const serviceDuration = appointment.duration_minutes || appointment.service?.duration_minutes || 0;
  const servicePrice = appointment.price || appointment.service?.price || 0;
  const barberName = appointment.barberName || appointment.barber?.profile.full_name || appointment.barber?.display_name || 'N/A';
  
  // Handle date/time
  const appointmentDate = appointment.date || new Date(appointment.start_time);
  const appointmentTime = appointment.time || format(new Date(appointment.start_time), 'HH:mm');

  const getStatusBadge = (status: Appointment['status']) => {
    const variants: Record<Appointment['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      confirmed: 'default',
      cancelled: 'destructive',
      completed: 'outline',
    };

    const labels: Record<Appointment['status'], string> = {
      pending: 'Pendiente',
      confirmed: 'Confirmada',
      cancelled: 'Cancelada',
      completed: 'Completada',
    };

    return (
      <Badge variant={variants[status]} className="text-sm">
        {labels[status]}
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Detalles de la cita</DialogTitle>
          <DialogDescription>
            ID: {appointment.id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Estado actual:</span>
            {getStatusBadge(appointment.status)}
          </div>

          <Separator />

          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Cliente</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{customerName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{customerPhone}</span>
                </div>
                {customerEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{customerEmail}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-medium mb-2">Servicio</h4>
              <div className="space-y-2">
                <Badge variant="outline">{serviceName}</Badge>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{serviceDuration} min</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">${servicePrice}</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-medium mb-2">Barbero</h4>
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {barberName.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{barberName}</span>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-medium mb-2">Fecha y hora</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {format(appointmentDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{appointmentTime}</span>
                </div>
              </div>
            </div>

            {appointment.notes && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Notas
                  </h4>
                  <p className="text-sm text-muted-foreground">{appointment.notes}</p>
                </div>
              </>
            )}
          </div>

          <Separator />

          <div className="flex flex-col gap-2">
            {appointment.status === 'pending' && (
              <Button 
                onClick={() => onUpdateStatus(appointment.id, 'confirmed')}
                className="w-full"
              >
                Confirmar cita
              </Button>
            )}
            {appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
              <Button 
                onClick={() => onUpdateStatus(appointment.id, 'cancelled')}
                variant="destructive"
                className="w-full"
              >
                Cancelar cita
              </Button>
            )}
            {appointment.status === 'confirmed' && (
              <Button 
                onClick={() => onUpdateStatus(appointment.id, 'completed')}
                variant="outline"
                className="w-full"
              >
                Marcar como completada
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}