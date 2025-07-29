import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { barbershopService } from '@/services/barbershops.service';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Save } from 'lucide-react';
import { Link } from 'react-router-dom';

const settingsSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  address: z.string().min(5, 'La dirección debe tener al menos 5 caracteres'),
  phone: z.string().min(8, 'El teléfono debe tener al menos 8 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  description: z.string().optional(),
  advance_booking_days: z.number().min(1).max(90),
  min_advance_booking_hours: z.number().min(0).max(72),
  max_advance_booking_days: z.number().min(1).max(365),
  cancellation_hours: z.number().min(0).max(72),
  is_active: z.boolean(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export function OwnerSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch barbershop data
  const { data: barbershop, isLoading, error } = useQuery({
    queryKey: ['owner-barbershop', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID');
      const shops = await barbershopService.getByOwner(user.id);
      return shops[0];
    },
    enabled: !!user?.id,
  });

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: '',
      address: '',
      phone: '',
      email: '',
      description: '',
      advance_booking_days: 30,
      min_advance_booking_hours: 2,
      max_advance_booking_days: 60,
      cancellation_hours: 24,
      is_active: true,
    },
    values: barbershop ? {
      name: barbershop.name,
      address: barbershop.address,
      phone: barbershop.phone,
      email: barbershop.email || '',
      description: barbershop.description || '',
      advance_booking_days: barbershop.settings?.advance_booking_days || 30,
      min_advance_booking_hours: barbershop.settings?.min_advance_booking_hours || 2,
      max_advance_booking_days: barbershop.settings?.max_advance_booking_days || 60,
      cancellation_hours: barbershop.settings?.cancellation_hours || 24,
      is_active: barbershop.is_active,
    } : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      if (!barbershop?.id) throw new Error('No barbershop ID');
      return barbershopService.updateBarbershop(barbershop.id, {
        name: data.name,
        address: data.address,
        phone: data.phone,
        email: data.email || null,
        description: data.description || null,
        is_active: data.is_active,
        settings: {
          ...barbershop.settings,
          advance_booking_days: data.advance_booking_days,
          min_advance_booking_hours: data.min_advance_booking_hours,
          max_advance_booking_days: data.max_advance_booking_days,
          cancellation_hours: data.cancellation_hours,
        },
      });
    },
    onSuccess: () => {
      toast({
        title: 'Configuración actualizada',
        description: 'Los cambios se han guardado correctamente',
      });
      queryClient.invalidateQueries({ queryKey: ['owner-barbershop'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'No se pudieron guardar los cambios',
        variant: 'destructive',
      });
      console.error('Error updating barbershop:', error);
    },
  });

  const onSubmit = async (data: SettingsFormData) => {
    setIsSubmitting(true);
    try {
      await updateMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !barbershop) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertDescription>
            No se pudo cargar la información de la barbería
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/owner">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Configuración de la barbería</h1>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Información general</CardTitle>
            <CardDescription>
              Datos básicos de tu barbería
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre de la barbería</Label>
                <Input
                  id="name"
                  {...form.register('name')}
                  disabled={isSubmitting}
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  type="tel"
                  {...form.register('phone')}
                  disabled={isSubmitting}
                />
                {form.formState.errors.phone && (
                  <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                {...form.register('address')}
                disabled={isSubmitting}
              />
              {form.formState.errors.address && (
                <p className="text-sm text-destructive">{form.formState.errors.address.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email (opcional)</Label>
              <Input
                id="email"
                type="email"
                {...form.register('email')}
                disabled={isSubmitting}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Textarea
                id="description"
                {...form.register('description')}
                disabled={isSubmitting}
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={form.watch('is_active')}
                onCheckedChange={(checked) => form.setValue('is_active', checked)}
                disabled={isSubmitting}
              />
              <Label htmlFor="is_active">Barbería activa</Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configuración de reservas</CardTitle>
            <CardDescription>
              Define las reglas para las reservas de tus clientes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="min_advance_booking_hours">
                  Horas mínimas de anticipación
                </Label>
                <Input
                  id="min_advance_booking_hours"
                  type="number"
                  {...form.register('min_advance_booking_hours', { valueAsNumber: true })}
                  disabled={isSubmitting}
                />
                <p className="text-sm text-muted-foreground">
                  Los clientes deben reservar con al menos estas horas de anticipación
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_advance_booking_days">
                  Días máximos de anticipación
                </Label>
                <Input
                  id="max_advance_booking_days"
                  type="number"
                  {...form.register('max_advance_booking_days', { valueAsNumber: true })}
                  disabled={isSubmitting}
                />
                <p className="text-sm text-muted-foreground">
                  Los clientes pueden reservar hasta estos días en el futuro
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cancellation_hours">
                Horas para cancelación
              </Label>
              <Input
                id="cancellation_hours"
                type="number"
                {...form.register('cancellation_hours', { valueAsNumber: true })}
                disabled={isSubmitting}
              />
              <p className="text-sm text-muted-foreground">
                Los clientes pueden cancelar hasta estas horas antes de la cita
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </div>
  );
}