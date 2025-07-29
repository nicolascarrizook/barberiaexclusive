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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
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
import { Mail, Loader2, UserPlus, QrCode, Copy, Check } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
// QR code generation will be implemented later

const emailInviteSchema = z.object({
  email: z.string().email('Email inválido'),
  display_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  message: z.string().optional(),
});

const manualBarberSchema = z.object({
  display_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  bio: z.string().optional(),
  years_experience: z.number().min(0, 'Los años de experiencia no pueden ser negativos').optional(),
  instagram_handle: z.string().optional(),
  commission_percentage: z.number().min(0, 'La comisión no puede ser negativa').max(100, 'La comisión no puede ser mayor al 100%'),
  can_accept_tips: z.boolean(),
  specialties: z.string().optional(),
});

type EmailInviteData = z.infer<typeof emailInviteSchema>;
type ManualBarberData = z.infer<typeof manualBarberSchema>;

interface BarberCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barbershopId?: string;
}

export function BarberCreationDialog({ 
  open, 
  onOpenChange, 
  barbershopId 
}: BarberCreationDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'email' | 'manual'>('email');
  const [invitationCode, setInvitationCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const emailForm = useForm<EmailInviteData>({
    resolver: zodResolver(emailInviteSchema),
    defaultValues: {
      email: '',
      display_name: '',
      message: '',
    },
  });

  const manualForm = useForm<ManualBarberData>({
    resolver: zodResolver(manualBarberSchema),
    defaultValues: {
      display_name: '',
      bio: '',
      years_experience: 0,
      instagram_handle: '',
      commission_percentage: 50,
      can_accept_tips: true,
      specialties: '',
    },
  });

  const emailInviteMutation = useMutation({
    mutationFn: async (data: EmailInviteData) => {
      if (!barbershopId) throw new Error('No barbershop ID');
      
      await barberService.inviteBarberByEmail({
        barbershop_id: barbershopId,
        email: data.email,
        display_name: data.display_name,
        message: data.message || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barber-invitations'] });
      toast({
        title: 'Invitación enviada',
        description: 'Se ha enviado la invitación por email al barbero',
      });
      
      emailForm.reset();
      onOpenChange(false);
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

  const manualCreateMutation = useMutation({
    mutationFn: async (data: ManualBarberData) => {
      if (!barbershopId) throw new Error('No barbershop ID');
      
      const specialties = data.specialties 
        ? data.specialties.split(',').map(s => s.trim()).filter(Boolean)
        : [];

      const result = await barberService.createManualBarber({
        barbershop_id: barbershopId,
        display_name: data.display_name,
        bio: data.bio || null,
        specialties: specialties.length > 0 ? specialties : null,
        years_experience: data.years_experience || null,
        instagram_handle: data.instagram_handle || null,
        commission_percentage: data.commission_percentage,
        can_accept_tips: data.can_accept_tips,
      });

      return result.invitation_code;
    },
    onSuccess: (code) => {
      queryClient.invalidateQueries({ queryKey: ['barbershop-barbers'] });
      queryClient.invalidateQueries({ queryKey: ['barber-invitations'] });
      setInvitationCode(code);
      toast({
        title: 'Barbero creado',
        description: 'Se ha creado el código de acceso para el barbero',
      });
    },
    onError: (error) => {
      console.error('Error creating manual barber:', error);
      const errorMessage = error instanceof Error ? error.message : 'No se pudo crear el barbero';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  const handleCopyCode = () => {
    if (invitationCode) {
      navigator.clipboard.writeText(invitationCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyUrl = () => {
    if (invitationCode) {
      const url = `${window.location.origin}/barber/onboarding?code=${invitationCode}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = (open: boolean) => {
    if (!emailInviteMutation.isPending && !manualCreateMutation.isPending) {
      emailForm.reset();
      manualForm.reset();
      setInvitationCode(null);
      setCopied(false);
      onOpenChange(open);
    }
  };

  const onboardingUrl = invitationCode 
    ? `${window.location.origin}/barber/onboarding?code=${invitationCode}`
    : '';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agregar barbero</DialogTitle>
          <DialogDescription>
            Invita a un barbero por email o crea un acceso manual
          </DialogDescription>
        </DialogHeader>

        {invitationCode ? (
          <div className="space-y-6 py-4">
            <Alert>
              <QrCode className="h-4 w-4" />
              <AlertDescription>
                Código de acceso creado exitosamente. Comparte este código o QR con el barbero.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              {/* Invitation Code */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Código de acceso</label>
                <div className="flex gap-2">
                  <Input 
                    value={invitationCode} 
                    readOnly 
                    className="font-mono text-lg text-center"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopyCode}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* URL */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Enlace de registro</label>
                <div className="flex gap-2">
                  <Input 
                    value={onboardingUrl} 
                    readOnly 
                    className="text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopyUrl}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium">Instrucciones para el barbero:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Escanea el código QR o visita el enlace de registro</li>
                  <li>Crea una cuenta con su email personal</li>
                  <li>Ingresa el código de acceso cuando se solicite</li>
                  <li>Completa su perfil y estará listo para trabajar</li>
                </ol>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => handleClose(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'email' | 'manual')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email">Invitar por email</TabsTrigger>
              <TabsTrigger value="manual">Crear acceso manual</TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="space-y-4">
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  El barbero recibirá un email con instrucciones para registrarse 
                  y unirse a tu barbería.
                </AlertDescription>
              </Alert>

              <Form {...emailForm}>
                <form onSubmit={emailForm.handleSubmit((data) => emailInviteMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={emailForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email del barbero</FormLabel>
                        <FormControl>
                          <Input 
                            type="email"
                            placeholder="barbero@ejemplo.com" 
                            {...field} 
                            disabled={emailInviteMutation.isPending}
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
                    control={emailForm.control}
                    name="display_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre del barbero</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ej: Carlos Méndez" 
                            {...field} 
                            disabled={emailInviteMutation.isPending}
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
                    control={emailForm.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mensaje personalizado (opcional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Hola! Te invito a unirte a nuestro equipo..."
                            rows={3}
                            {...field}
                            disabled={emailInviteMutation.isPending}
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
                      disabled={emailInviteMutation.isPending}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={emailInviteMutation.isPending}>
                      {emailInviteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Mail className="mr-2 h-4 w-4" />
                      Enviar invitación
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="manual" className="space-y-4">
              <Alert>
                <UserPlus className="h-4 w-4" />
                <AlertDescription>
                  Crea un perfil de barbero y genera un código de acceso 
                  que el barbero podrá usar para registrarse.
                </AlertDescription>
              </Alert>

              <Form {...manualForm}>
                <form onSubmit={manualForm.handleSubmit((data) => manualCreateMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={manualForm.control}
                    name="display_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre del barbero</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ej: Carlos Méndez" 
                            {...field} 
                            disabled={manualCreateMutation.isPending}
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
                    control={manualForm.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Biografía (opcional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe la experiencia y estilo del barbero..."
                            rows={3}
                            {...field}
                            disabled={manualCreateMutation.isPending}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={manualForm.control}
                      name="years_experience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Años de experiencia</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              max="50"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              disabled={manualCreateMutation.isPending}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={manualForm.control}
                      name="commission_percentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Comisión (%)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              max="100"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              disabled={manualCreateMutation.isPending}
                            />
                          </FormControl>
                          <FormDescription>
                            Porcentaje de comisión
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={manualForm.control}
                    name="specialties"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Especialidades (opcional)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ej: Corte clásico, Fade, Barba"
                            {...field}
                            disabled={manualCreateMutation.isPending}
                          />
                        </FormControl>
                        <FormDescription>
                          Separa las especialidades con comas
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={manualForm.control}
                    name="instagram_handle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instagram (opcional)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="username (sin @)"
                            {...field}
                            disabled={manualCreateMutation.isPending}
                          />
                        </FormControl>
                        <FormDescription>
                          Usuario de Instagram sin el símbolo @
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={manualForm.control}
                    name="can_accept_tips"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Acepta propinas
                          </FormLabel>
                          <FormDescription>
                            Los clientes podrán dejar propinas al barbero
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={manualCreateMutation.isPending}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => handleClose(false)}
                      disabled={manualCreateMutation.isPending}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={manualCreateMutation.isPending}>
                      {manualCreateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <UserPlus className="mr-2 h-4 w-4" />
                      Crear barbero
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}