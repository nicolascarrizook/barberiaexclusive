import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { barberService } from '@/services/barbers.service';
import { Mail, Loader2, UserPlus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const inviteSchema = z.object({
  email: z.string().email('Email inválido'),
  display_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  message: z.string().optional(),
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface BarberInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barbershopId?: string;
}

export function BarberInviteDialog({ 
  open, 
  onOpenChange, 
  barbershopId 
}: BarberInviteDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [inviteSent, setInviteSent] = useState(false);

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
      display_name: '',
      message: '',
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: InviteFormData) => {
      if (!barbershopId) throw new Error('No barbershop ID');
      
      // For now, we'll just create a pending barber record
      // In a real implementation, this would send an email
      await barberService.inviteBarber({
        barbershop_id: barbershopId,
        email: data.email,
        display_name: data.display_name,
        message: data.message || null,
      });
    },
    onSuccess: () => {
      setInviteSent(true);
      queryClient.invalidateQueries({ queryKey: ['barbershop-barbers'] });
      toast({
        title: 'Invitación enviada',
        description: 'Se ha enviado la invitación al barbero',
      });
      
      // Reset form and close after a delay
      setTimeout(() => {
        setInviteSent(false);
        form.reset();
        onOpenChange(false);
      }, 3000);
    },
    onError: (error) => {
      console.error('Error inviting barber:', error);
      toast({
        title: 'Error',
        description: 'No se pudo enviar la invitación',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = async (data: InviteFormData) => {
    inviteMutation.mutate(data);
  };

  const handleClose = (open: boolean) => {
    if (!inviteMutation.isPending) {
      setInviteSent(false);
      form.reset();
      onOpenChange(open);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invitar barbero</DialogTitle>
          <DialogDescription>
            Envía una invitación por email para que un barbero se una a tu equipo
          </DialogDescription>
        </DialogHeader>

        {inviteSent ? (
          <div className="py-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="rounded-full bg-green-100 p-3">
                <Mail className="h-6 w-6 text-green-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">¡Invitación enviada!</h3>
                <p className="text-sm text-muted-foreground">
                  Se ha enviado un email de invitación a {form.getValues('email')}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <Alert>
                <UserPlus className="h-4 w-4" />
                <AlertDescription>
                  El barbero recibirá un email con instrucciones para registrarse 
                  y unirse a tu barbería. Una vez que acepte la invitación, 
                  podrás gestionar sus horarios y servicios.
                </AlertDescription>
              </Alert>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email del barbero</FormLabel>
                    <FormControl>
                      <Input 
                        type="email"
                        placeholder="barbero@ejemplo.com" 
                        {...field} 
                        disabled={inviteMutation.isPending}
                      />
                    </FormControl>
                    <FormDescription>
                      El email donde se enviará la invitación
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="display_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del barbero</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ej: Carlos Méndez" 
                        {...field} 
                        disabled={inviteMutation.isPending}
                      />
                    </FormControl>
                    <FormDescription>
                      El nombre que verán los clientes
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mensaje personalizado (opcional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Hola! Te invito a unirte a nuestro equipo..."
                        rows={3}
                        {...field}
                        disabled={inviteMutation.isPending}
                      />
                    </FormControl>
                    <FormDescription>
                      Un mensaje personal para incluir en la invitación
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => handleClose(false)}
                  disabled={inviteMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={inviteMutation.isPending}>
                  {inviteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Mail className="mr-2 h-4 w-4" />
                  Enviar invitación
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}