import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Calendar,
  Clock,
  DollarSign,
  Phone,
  Mail,
  User,
  FileText,
  MessageSquare,
  CreditCard,
  History,
  Edit,
  Save,
  X,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  Banknote,
  Receipt,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { appointmentManagementService, type AppointmentListItem } from '@/services/appointment-management.service';

interface AppointmentDetailsModalProps {
  appointment: AppointmentListItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (appointment: AppointmentListItem) => void;
}

interface ActivityLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details?: string;
}

export function AppointmentDetailsModal({
  appointment,
  isOpen,
  onClose,
  onUpdate,
}: AppointmentDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedNotes, setEditedNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  
  const { toast } = useToast();

  // Initialize form values when appointment changes
  useState(() => {
    if (appointment) {
      setEditedNotes(appointment.notes || '');
      setPaymentStatus(appointment.payment_status || 'pending');
      setPaymentAmount(appointment.total_amount.toString());
    }
  }, [appointment]);

  if (!appointment) return null;

  // Mock activity log - in production this would come from the database
  const activityLog: ActivityLog[] = [
    {
      id: '1',
      timestamp: appointment.created_at,
      user: 'Sistema',
      action: 'Cita creada',
      details: `Reserva realizada por ${appointment.customer.full_name}`,
    },
    // Add more activities based on appointment history
  ];

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; icon: any; text: string }> = {
      pending: {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: Clock,
        text: 'Pendiente',
      },
      confirmed: {
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: CheckCircle,
        text: 'Confirmada',
      },
      arrived: {
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        icon: User,
        text: 'Cliente llegó',
      },
      in_progress: {
        color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        icon: Clock,
        text: 'En progreso',
      },
      completed: {
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: CheckCircle,
        text: 'Completada',
      },
      cancelled: {
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: XCircle,
        text: 'Cancelada',
      },
      no_show: {
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: XCircle,
        text: 'No se presentó',
      },
    };
    return configs[status] || configs.pending;
  };

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      setIsUpdating(true);
      const updated = await appointmentManagementService.updateAppointmentStatus(
        appointment.id,
        newStatus,
        internalNotes
      );
      onUpdate(updated);
      toast({
        title: 'Estado actualizado',
        description: `La cita se marcó como ${getStatusConfig(newStatus).text}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePaymentUpdate = async () => {
    try {
      setIsUpdating(true);
      const updated = await appointmentManagementService.updatePaymentStatus(
        appointment.id,
        paymentStatus,
        paymentMethod,
        parseFloat(paymentAmount)
      );
      onUpdate(updated);
      toast({
        title: 'Pago actualizado',
        description: 'El estado del pago se actualizó correctamente',
      });
      setIsEditing(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el pago',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleNotesUpdate = async () => {
    try {
      setIsUpdating(true);
      const updated = await appointmentManagementService.updateAppointmentNotes(
        appointment.id,
        editedNotes,
        internalNotes
      );
      onUpdate(updated);
      toast({
        title: 'Notas actualizadas',
        description: 'Las notas se guardaron correctamente',
      });
      setIsEditing(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron guardar las notas',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const statusConfig = getStatusConfig(appointment.status);
  const StatusIcon = statusConfig.icon;
  const appointmentDate = parseISO(appointment.start_at);
  const endDate = parseISO(appointment.end_at);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">Detalles de la cita</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <code className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">
                  {appointment.confirmation_code}
                </code>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">
                  Creada {format(parseISO(appointment.created_at), 'dd/MM/yyyy HH:mm')}
                </span>
              </DialogDescription>
            </div>
            <Badge className={statusConfig.color}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusConfig.text}
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[60vh]">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="details">Detalles</TabsTrigger>
              <TabsTrigger value="payment">Pago</TabsTrigger>
              <TabsTrigger value="notes">Notas</TabsTrigger>
              <TabsTrigger value="history">Historial</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              {/* Customer Info */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Cliente</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{appointment.customer.full_name}</span>
                  </div>
                  {appointment.customer.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={`tel:${appointment.customer.phone}`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {appointment.customer.phone}
                      </a>
                    </div>
                  )}
                  {appointment.customer.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={`mailto:${appointment.customer.email}`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {appointment.customer.email}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Service Info */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Servicios</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  {appointment.services.map((service, index) => (
                    <div key={service.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{service.service.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {service.service.duration_minutes} min
                        </Badge>
                      </div>
                      <span className="font-medium">${service.service.price}</span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex items-center justify-between font-bold">
                    <span>Total</span>
                    <span className="text-green-600">${appointment.total_amount}</span>
                  </div>
                </div>
              </div>

              {/* Barber Info */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Barbero</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={appointment.barber.avatar_url} />
                      <AvatarFallback>
                        {appointment.barber.display_name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{appointment.barber.display_name}</span>
                  </div>
                </div>
              </div>

              {/* Date & Time */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Fecha y hora</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {format(appointmentDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {format(appointmentDate, 'HH:mm')} - {format(endDate, 'HH:mm')}
                    </span>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="payment" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Estado del pago</h4>
                  {!isEditing && appointment.status !== 'cancelled' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Estado del pago</Label>
                      <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pendiente</SelectItem>
                          <SelectItem value="paid">Pagado</SelectItem>
                          <SelectItem value="partially_paid">Pago parcial</SelectItem>
                          <SelectItem value="refunded">Reembolsado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Método de pago</Label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar método" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Efectivo</SelectItem>
                          <SelectItem value="card">Tarjeta</SelectItem>
                          <SelectItem value="transfer">Transferencia</SelectItem>
                          <SelectItem value="other">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Monto pagado</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handlePaymentUpdate}
                        disabled={isUpdating}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Guardar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Estado</span>
                      <Badge
                        variant={appointment.payment_status === 'paid' ? 'default' : 'secondary'}
                      >
                        {appointment.payment_status === 'paid' ? 'Pagado' : 'Pendiente'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total a pagar</span>
                      <span className="font-bold text-green-600">${appointment.total_amount}</span>
                    </div>
                    {appointment.payment_status === 'paid' && (
                      <Button variant="outline" size="sm" className="w-full">
                        <Receipt className="h-4 w-4 mr-2" />
                        Generar recibo
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="notes" className="space-y-4 mt-4">
              <div className="space-y-4">
                {/* Customer Notes */}
                {appointment.customer_requests && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">
                      Solicitudes del cliente
                    </h4>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm">{appointment.customer_requests}</p>
                    </div>
                  </div>
                )}

                {/* Public Notes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm text-muted-foreground">Notas públicas</h4>
                    {!isEditing && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditing(true)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                    )}
                  </div>
                  {isEditing ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editedNotes}
                        onChange={(e) => setEditedNotes(e.target.value)}
                        placeholder="Notas visibles para el cliente..."
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleNotesUpdate}
                          disabled={isUpdating}
                        >
                          <Save className="h-4 w-4 mr-1" />
                          Guardar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setIsEditing(false);
                            setEditedNotes(appointment.notes || '');
                          }}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm">
                        {appointment.notes || 'Sin notas'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Internal Notes */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">
                    Notas internas (solo staff)
                  </h4>
                  <Textarea
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Notas privadas para el equipo..."
                    rows={3}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="history" className="space-y-4 mt-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">
                  Historial de actividad
                </h4>
                <div className="space-y-2">
                  {activityLog.map((activity) => (
                    <div
                      key={activity.id}
                      className="bg-gray-50 rounded-lg p-3 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <History className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{activity.action}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(activity.timestamp), 'dd/MM/yyyy HH:mm')}
                        </span>
                      </div>
                      {activity.details && (
                        <p className="text-xs text-muted-foreground ml-6">
                          {activity.details}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground ml-6">
                        Por: {activity.user}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 flex gap-2">
            {appointment.status === 'pending' && (
              <Button
                onClick={() => handleStatusUpdate('confirmed')}
                disabled={isUpdating}
                className="flex-1"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Confirmar
              </Button>
            )}
            {appointment.status === 'confirmed' && (
              <Button
                onClick={() => handleStatusUpdate('arrived')}
                disabled={isUpdating}
                variant="secondary"
                className="flex-1"
              >
                <User className="h-4 w-4 mr-1" />
                Cliente llegó
              </Button>
            )}
            {appointment.status === 'arrived' && (
              <Button
                onClick={() => handleStatusUpdate('in_progress')}
                disabled={isUpdating}
                className="flex-1"
              >
                <ChevronRight className="h-4 w-4 mr-1" />
                Iniciar
              </Button>
            )}
            {appointment.status === 'in_progress' && (
              <Button
                onClick={() => handleStatusUpdate('completed')}
                disabled={isUpdating}
                className="flex-1"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Completar
              </Button>
            )}
            {!['cancelled', 'completed', 'no_show'].includes(appointment.status) && (
              <Button
                onClick={() => handleStatusUpdate('cancelled')}
                disabled={isUpdating}
                variant="destructive"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
            )}
          </div>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}