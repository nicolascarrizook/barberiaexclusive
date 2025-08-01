import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Clock, 
  User, 
  Phone, 
  Mail, 
  Scissors, 
  DollarSign,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  PlayCircle,
  UserCheck,
  Calendar,
  MessageSquare
} from 'lucide-react';

// UI Components
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

// Services
import { appointmentManagementService, type AppointmentListItem } from '@/services/appointment-management.service';

// Types
interface AppointmentCardProps {
  appointment: AppointmentListItem;
  onClick?: () => void;
  onStatusUpdate?: (appointment: AppointmentListItem) => void;
  showActions?: boolean;
}

export function AppointmentCard({ 
  appointment, 
  onClick, 
  onStatusUpdate,
  showActions = true 
}: AppointmentCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  // Status colors and icons
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: Clock,
          text: 'Pendiente'
        };
      case 'confirmed':
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: CheckCircle,
          text: 'Confirmado'
        };
      case 'arrived':
        return {
          color: 'bg-purple-100 text-purple-800 border-purple-200',
          icon: UserCheck,
          text: 'Cliente llegó'
        };
      case 'in_progress':
        return {
          color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          icon: PlayCircle,
          text: 'En progreso'
        };
      case 'completed':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: CheckCircle,
          text: 'Completado'
        };
      case 'cancelled':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: XCircle,
          text: 'Cancelado'
        };
      case 'no_show':
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: XCircle,
          text: 'No se presentó'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: Clock,
          text: status
        };
    }
  };

  // Update appointment status
  const handleStatusUpdate = async (newStatus: string) => {
    try {
      setIsUpdating(true);
      const updatedAppointment = await appointmentManagementService.updateAppointmentStatus(
        appointment.id,
        newStatus
      );
      
      onStatusUpdate?.(updatedAppointment);
      
      toast({
        title: 'Estado actualizado',
        description: `La cita se marcó como ${getStatusConfig(newStatus).text.toLowerCase()}`,
      });
    } catch (error) {
      console.error('❌ Error updating appointment status:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado de la cita',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Cancel appointment
  const handleCancel = async () => {
    try {
      setIsUpdating(true);
      const updatedAppointment = await appointmentManagementService.cancelAppointment(
        appointment.id,
        'Cancelado por el staff',
        'system' // TODO: Use actual user ID
      );
      
      onStatusUpdate?.(updatedAppointment);
      
      toast({
        title: 'Cita cancelada',
        description: 'La cita ha sido cancelada exitosamente',
      });
    } catch (error) {
      console.error('❌ Error canceling appointment:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cancelar la cita',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const statusConfig = getStatusConfig(appointment.status);
  const StatusIcon = statusConfig.icon;
  
  // Calculate total duration
  const totalDuration = appointment.services.reduce(
    (sum, service) => sum + service.service.duration_minutes,
    0
  );

  // Format datetime
  const startDate = parseISO(appointment.start_at);
  const endDate = parseISO(appointment.end_at);

  return (
    <Card 
      className={`transition-all duration-200 hover:shadow-md ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          {/* Main Content */}
          <div className="flex-1 space-y-3">
            {/* Header Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Status Badge */}
                <Badge className={`${statusConfig.color} flex items-center gap-1`}>
                  <StatusIcon className="w-3 h-3" />
                  {statusConfig.text}
                </Badge>
                
                {/* Confirmation Code */}
                <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                  {appointment.confirmation_code}
                </code>
              </div>
              
              {/* Date and Time */}
              <div className="text-right">
                <div className="flex items-center gap-1 text-sm font-medium">
                  <Calendar className="w-4 h-4" />
                  {format(startDate, 'dd MMM yyyy', { locale: es })}
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  {format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}
                  <span className="text-xs">({totalDuration}min)</span>
                </div>
              </div>
            </div>

            {/* Customer and Barber Info */}
            <div className="flex items-center justify-between">
              {/* Customer */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">{appointment.customer.full_name}</span>
                </div>
                
                {appointment.customer.phone && (
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Phone className="w-3 h-3" />
                    {appointment.customer.phone}
                  </div>
                )}
                
                {appointment.customer.email && (
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Mail className="w-3 h-3" />
                    {appointment.customer.email}
                  </div>
                )}
              </div>
              
              {/* Barber */}
              <div className="flex items-center gap-2">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={appointment.barber.avatar_url || undefined} />
                  <AvatarFallback>
                    {appointment.barber.display_name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{appointment.barber.display_name}</span>
              </div>
            </div>

            {/* Services */}
            <div className="flex items-center gap-2">
              <Scissors className="w-4 h-4 text-gray-400" />
              <div className="flex flex-wrap gap-1">
                {appointment.services.map((service, index) => (
                  <Badge key={service.id} variant="secondary" className="text-xs">
                    {service.service.name}
                    {index < appointment.services.length - 1 && ' +'}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Price and Notes */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Total Amount */}
                <div className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <span className="font-bold text-green-600">
                    ${appointment.total_amount.toLocaleString()}
                  </span>
                  <Badge 
                    variant={appointment.payment_status === 'paid' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {appointment.payment_status === 'paid' ? 'Pagado' : 'Pendiente'}
                  </Badge>
                </div>
                
                {/* Notes Indicator */}
                {(appointment.notes || appointment.customer_requests) && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <MessageSquare className="w-3 h-3" />
                    Notas
                  </div>
                )}
              </div>
              
              {/* Actions Menu */}
              {showActions && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      disabled={isUpdating}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {/* Status Updates */}
                    {appointment.status === 'pending' && (
                      <>
                        <DropdownMenuItem onClick={() => handleStatusUpdate('confirmed')}>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Confirmar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleCancel}>
                          <XCircle className="w-4 h-4 mr-2" />
                          Cancelar
                        </DropdownMenuItem>
                      </>
                    )}
                    
                    {appointment.status === 'confirmed' && (
                      <>
                        <DropdownMenuItem onClick={() => handleStatusUpdate('arrived')}>
                          <UserCheck className="w-4 h-4 mr-2" />
                          Cliente llegó
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleCancel}>
                          <XCircle className="w-4 h-4 mr-2" />
                          Cancelar
                        </DropdownMenuItem>
                      </>
                    )}
                    
                    {appointment.status === 'arrived' && (
                      <>
                        <DropdownMenuItem onClick={() => handleStatusUpdate('in_progress')}>
                          <PlayCircle className="w-4 h-4 mr-2" />
                          Iniciar servicio
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusUpdate('no_show')}>
                          <XCircle className="w-4 h-4 mr-2" />
                          No se presentó
                        </DropdownMenuItem>
                      </>
                    )}
                    
                    {appointment.status === 'in_progress' && (
                      <DropdownMenuItem onClick={() => handleStatusUpdate('completed')}>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Completar
                      </DropdownMenuItem>
                    )}
                    
                    <DropdownMenuSeparator />
                    
                    {/* Other Actions */}
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      onClick?.();
                    }}>
                      <Calendar className="w-4 h-4 mr-2" />
                      Reagendar
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      onClick?.();
                    }}>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Enviar mensaje
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}