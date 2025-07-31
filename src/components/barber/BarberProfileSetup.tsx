import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { profileService } from '@/services/profiles.service';
import { Loader2, User, Phone, Camera } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const profileSchema = z.object({
  full_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  phone: z.string()
    .regex(/^\+?[0-9\s-()]+$/, 'Formato de teléfono inválido')
    .optional()
    .or(z.literal('')),
  bio: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface BarberProfileSetupProps {
  barbershopId: string;
  onComplete: () => void;
  onError: (error: string) => void;
}

export function BarberProfileSetup({ 
  barbershopId,
  onComplete,
  onError 
}: BarberProfileSetupProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: user?.full_name || '',
      phone: user?.phone || '',
      bio: '',
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      if (!user?.id) throw new Error('Usuario no autenticado');
      
      // Update profile with the new information
      return profileService.update(user.id, {
        full_name: data.full_name,
        phone: data.phone || null,
      });
    },
    onSuccess: () => {
      onComplete();
    },
    onError: (error) => {
      console.error('Error updating profile:', error);
      const message = error instanceof Error ? error.message : 'Error al actualizar el perfil';
      onError(message);
      setIsSubmitting(false);
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true);
    updateProfileMutation.mutate(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Completa tu perfil</CardTitle>
        <CardDescription>
          Agrega tu información personal para que los clientes puedan conocerte mejor
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={user?.avatar_url} alt={user?.full_name} />
                <AvatarFallback>
                  {user?.full_name?.charAt(0).toUpperCase() || 'B'}
                </AvatarFallback>
              </Avatar>
              <Button type="button" variant="outline" size="sm" disabled>
                <Camera className="mr-2 h-4 w-4" />
                Cambiar foto (próximamente)
              </Button>
            </div>

            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre completo</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        {...field}
                        placeholder="Tu nombre completo"
                        className="pl-10"
                        disabled={isSubmitting}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Este es el nombre que verán los clientes
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
                  <FormLabel>Teléfono (opcional)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        {...field}
                        type="tel"
                        placeholder="+54 9 11 1234-5678"
                        className="pl-10"
                        disabled={isSubmitting}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Para recibir notificaciones importantes
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Acerca de ti (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Cuéntanos sobre tu experiencia, especialidades..."
                      rows={4}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>
                    Una breve descripción para que los clientes te conozcan
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3">
              <Button 
                type="submit" 
                className="flex-1"
                disabled={isSubmitting || updateProfileMutation.isPending}
              >
                {(isSubmitting || updateProfileMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Completar registro
              </Button>
            </div>
          </form>
        </Form>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-medium text-sm mb-2">Información adicional</h4>
          <p className="text-sm text-muted-foreground">
            Podrás completar más detalles sobre tu perfil profesional, horarios y especialidades
            desde tu panel de control una vez completado el registro.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}