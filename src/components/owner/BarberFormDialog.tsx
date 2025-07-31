import {useEffect} from 'react';
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
import { Save, Loader2, Plus, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const barberSchema = z.object({
  display_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  full_name: z.string().min(2, 'El nombre completo debe tener al menos 2 caracteres'),
  phone: z.string().optional(),
  bio: z.string().optional(),
  years_experience: z.number().min(0, 'Los años de experiencia no pueden ser negativos').optional(),
  instagram_handle: z.string().optional(),
  commission_percentage: z.number().min(0, 'La comisión no puede ser negativa').max(100, 'La comisión no puede ser mayor al 100%'),
  can_accept_tips: z.boolean(),
  specialties: z.string().optional(), // Will be split into array
});

type BarberFormData = z.infer<typeof barberSchema>;

interface BarberWithProfile {
  id: string;
  profile_id: string;
  display_name: string;
  bio?: string;
  specialties?: string[];
  years_experience?: number;
  instagram_handle?: string;
  commission_percentage: number;
  rating: number;
  total_reviews: number;
  is_active: boolean;
  can_accept_tips: boolean;
  profile?: {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
    avatar_url?: string;
  };
}

interface BarberFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barber: BarberWithProfile; // Now required - only for editing
  barbershopId?: string;
}

export function BarberFormDialog({ 
  open, 
  onOpenChange, 
  barber, 
  barbershopId 
}: BarberFormDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<BarberFormData>({
    resolver: zodResolver(barberSchema),
    defaultValues: {
      display_name: '',
      email: '',
      full_name: '',
      phone: '',
      bio: '',
      years_experience: 0,
      instagram_handle: '',
      commission_percentage: 50,
      can_accept_tips: true,
      specialties: '',
    },
  });

  // Reset form when barber changes or dialog opens/closes
  useEffect(() => {
    form.reset({
      display_name: barber.display_name,
      email: barber.profile?.email || '',
      full_name: barber.profile?.full_name || '',
      phone: barber.profile?.phone || '',
      bio: barber.bio || '',
      years_experience: barber.years_experience || 0,
      instagram_handle: barber.instagram_handle || '',
      commission_percentage: barber.commission_percentage,
      can_accept_tips: barber.can_accept_tips,
      specialties: barber.specialties?.join(', ') || '',
    });
  }, [barber, form, open]);

  // Remove create mutation - only editing is allowed

  const updateMutation = useMutation({
    mutationFn: async (data: BarberFormData) => {
      if (!barber?.id) throw new Error('No barber ID');
      
      // Parse specialties from comma-separated string
      const specialties = data.specialties 
        ? data.specialties.split(',').map(s => s.trim()).filter(Boolean)
        : [];

      // Note: We can only update barber data, not profile data due to RLS
      return barberService.updateBarber(barber.id, {
        display_name: data.display_name,
        bio: data.bio || null,
        specialties: specialties.length > 0 ? specialties : null,
        years_experience: data.years_experience || null,
        instagram_handle: data.instagram_handle || null,
        commission_percentage: data.commission_percentage,
        can_accept_tips: data.can_accept_tips,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barbershop-barbers'] });
      toast({
        title: 'Barbero actualizado',
        description: 'Los datos del barbero se han actualizado exitosamente',
      });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Error updating barber:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el barbero',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = async (data: BarberFormData) => {
    updateMutation.mutate(data);
  };

  const isLoading = updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Editar barbero
          </DialogTitle>
          <DialogDescription>
            Modifica los datos del barbero
          </DialogDescription>
        </DialogHeader>

        {!barber.profile && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Este barbero aún no ha completado su registro. Los campos de email y nombre completo 
              no estarán disponibles hasta que el barbero complete su proceso de onboarding.
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Información básica</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="display_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de barbero</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ej: Carlos Mendez" 
                          {...field} 
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormDescription>
                        Nombre que verán los clientes
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre completo</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ej: Carlos Alberto Méndez" 
                          {...field} 
                          disabled={true} // Name cannot be changed
                        />
                      </FormControl>
                      <FormDescription>
                        {barber.profile 
                          ? 'El nombre no puede ser modificado'
                          : 'El barbero aún no ha completado su registro'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email"
                          placeholder="carlos@ejemplo.com" 
                          {...field} 
                          disabled={true} // Email cannot be changed
                        />
                      </FormControl>
                      <FormDescription>
                        {barber.profile 
                          ? 'El email no puede ser modificado'
                          : 'El barbero aún no ha completado su registro'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input 
                          type="tel"
                          placeholder="+1234567890" 
                          {...field} 
                          disabled={true} // Phone cannot be changed
                        />
                      </FormControl>
                      <FormDescription>
                        El teléfono no puede ser modificado
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Professional Information */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Información profesional</h4>
              
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Biografía (opcional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe la experiencia y estilo del barbero..."
                        rows={3}
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
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
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
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
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormDescription>
                        Porcentaje de comisión por servicio
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="specialties"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Especialidades (opcional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ej: Corte clásico, Fade, Barba, Bigote"
                        {...field}
                        disabled={isLoading}
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
                control={form.control}
                name="instagram_handle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instagram (opcional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="username (sin @)"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      Usuario de Instagram sin el símbolo @
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Settings */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Configuración</h4>
              
              <FormField
                control={form.control}
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
                        disabled={isLoading}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Actualizar barbero
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}