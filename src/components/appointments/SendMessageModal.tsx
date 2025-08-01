import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  Mail,
  Phone,
  Send,
  Clock,
  Calendar,
  User,
  AlertCircle,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { type AppointmentListItem } from '@/services/appointment-management.service';

interface SendMessageModalProps {
  appointment: AppointmentListItem | null;
  isOpen: boolean;
  onClose: () => void;
}

interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  type: 'reminder' | 'confirmation' | 'cancellation' | 'custom';
}

const messageTemplates: MessageTemplate[] = [
  {
    id: 'reminder',
    name: 'Recordatorio de cita',
    type: 'reminder',
    content: 'Hola {nombre}, te recordamos tu cita para {servicio} el {fecha} a las {hora} con {barbero}. Por favor confirma tu asistencia respondiendo este mensaje.',
  },
  {
    id: 'confirmation',
    name: 'Confirmación de cita',
    type: 'confirmation',
    content: 'Hola {nombre}, tu cita para {servicio} ha sido confirmada para el {fecha} a las {hora} con {barbero}. Tu código de confirmación es: {codigo}',
  },
  {
    id: 'cancellation',
    name: 'Cancelación de cita',
    type: 'cancellation',
    content: 'Hola {nombre}, lamentamos informarte que tu cita del {fecha} a las {hora} ha sido cancelada. Por favor contáctanos para reagendar.',
  },
  {
    id: 'custom',
    name: 'Mensaje personalizado',
    type: 'custom',
    content: '',
  },
];

export function SendMessageModal({
  appointment,
  isOpen,
  onClose,
}: SendMessageModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('reminder');
  const [messageContent, setMessageContent] = useState('');
  const [messageChannel, setMessageChannel] = useState<'sms' | 'email' | 'whatsapp'>('sms');
  const [isSending, setIsSending] = useState(false);

  const { toast } = useToast();

  if (!appointment) return null;

  // Replace template variables with actual data
  const processTemplate = (template: string): string => {
    const appointmentDate = parseISO(appointment.start_at);
    
    return template
      .replace('{nombre}', appointment.customer.full_name)
      .replace('{servicio}', appointment.services.map(s => s.service.name).join(', '))
      .replace('{fecha}', format(appointmentDate, "EEEE d 'de' MMMM", { locale: es }))
      .replace('{hora}', format(appointmentDate, 'HH:mm'))
      .replace('{barbero}', appointment.barber.display_name)
      .replace('{codigo}', appointment.confirmation_code);
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = messageTemplates.find(t => t.id === templateId);
    if (template) {
      setMessageContent(processTemplate(template.content));
    }
  };

  const handleSend = async () => {
    if (!messageContent.trim()) {
      toast({
        title: 'Error',
        description: 'El mensaje no puede estar vacío',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    
    try {
      // TODO: Implement actual message sending via API
      // This would integrate with SMS/Email/WhatsApp services
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: 'Mensaje enviado',
        description: `Mensaje enviado por ${messageChannel === 'sms' ? 'SMS' : messageChannel === 'email' ? 'Email' : 'WhatsApp'}`,
      });
      
      onClose();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'No se pudo enviar el mensaje. Por favor, intenta de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'sms':
        return <Phone className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'whatsapp':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const hasContactMethod = (channel: string) => {
    switch (channel) {
      case 'sms':
      case 'whatsapp':
        return !!appointment.customer.phone;
      case 'email':
        return !!appointment.customer.email;
      default:
        return false;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Enviar mensaje</DialogTitle>
          <DialogDescription>
            Envía un mensaje al cliente sobre su cita
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Customer info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{appointment.customer.full_name}</span>
              </div>
              <Badge variant="outline">
                <Calendar className="h-3 w-3 mr-1" />
                {format(parseISO(appointment.start_at), 'dd/MM/yyyy HH:mm')}
              </Badge>
            </div>
            <div className="flex gap-4 text-sm text-muted-foreground">
              {appointment.customer.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {appointment.customer.phone}
                </span>
              )}
              {appointment.customer.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {appointment.customer.email}
                </span>
              )}
            </div>
          </div>

          {/* Channel selection */}
          <div className="space-y-2">
            <Label>Canal de envío</Label>
            <RadioGroup value={messageChannel} onValueChange={(value: any) => setMessageChannel(value)}>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sms" id="sms" disabled={!appointment.customer.phone} />
                  <Label htmlFor="sms" className="flex items-center gap-2 cursor-pointer">
                    <Phone className="h-4 w-4" />
                    SMS
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="email" id="email" disabled={!appointment.customer.email} />
                  <Label htmlFor="email" className="flex items-center gap-2 cursor-pointer">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="whatsapp" id="whatsapp" disabled={!appointment.customer.phone} />
                  <Label htmlFor="whatsapp" className="flex items-center gap-2 cursor-pointer">
                    <MessageSquare className="h-4 w-4" />
                    WhatsApp
                  </Label>
                </div>
              </div>
            </RadioGroup>
            {!hasContactMethod(messageChannel) && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  El cliente no tiene {messageChannel === 'email' ? 'email' : 'teléfono'} registrado
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Template selection */}
          <div className="space-y-2">
            <Label>Plantilla de mensaje</Label>
            <RadioGroup value={selectedTemplate} onValueChange={handleTemplateChange}>
              <div className="space-y-2">
                {messageTemplates.map((template) => (
                  <div key={template.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={template.id} id={template.id} />
                    <Label htmlFor={template.id} className="cursor-pointer">
                      {template.name}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Message content */}
          <div className="space-y-2">
            <Label>Contenido del mensaje</Label>
            <Textarea
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              placeholder="Escribe tu mensaje aquí..."
              rows={6}
            />
            <p className="text-xs text-muted-foreground">
              {messageContent.length} caracteres
              {messageChannel === 'sms' && messageContent.length > 160 && (
                <span className="text-orange-600 ml-2">
                  (Se enviará en múltiples SMS)
                </span>
              )}
            </p>
          </div>

          {/* Preview */}
          {messageContent && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                {getChannelIcon(messageChannel)}
                <span className="font-medium text-sm">Vista previa del mensaje</span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{messageContent}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={!messageContent.trim() || !hasContactMethod(messageChannel) || isSending}
          >
            <Send className="h-4 w-4 mr-2" />
            {isSending ? 'Enviando...' : 'Enviar mensaje'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}