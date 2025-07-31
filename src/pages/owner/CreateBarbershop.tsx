import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { barbershopService } from '@/services/barbershops.service';
import { ArrowLeft, Save, Store, Clock, Calendar, DollarSign } from 'lucide-react';

// Schema de validación
const createBarbershopSchema = z.object({
  // Información básica
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().optional(),
  address: z.string().min(5, 'La dirección debe tener al menos 5 caracteres'),
  city: z.string().min(2, 'La ciudad es requerida'),
  state: z.string().min(2, 'El estado/provincia es requerido'),
  zip_code: z.string().optional(),
  phone: z.string().min(8, 'El teléfono debe tener al menos 8 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),

  // Configuración inicial
  default_appointment_duration: z.number().min(15).max(240),
  buffer_time_between_appointments: z.number().min(0).max(60),
  max_advance_booking_days: z.number().min(1).max(365),
  min_advance_booking_hours: z.number().min(0).max(72),
  cancellation_hours: z.number().min(0).max(72),

  // Configuración adicional
  auto_confirm_appointments: z.boolean(),
  allow_walk_ins: z.boolean(),
  require_deposit: z.boolean(),
  deposit_percentage: z.number().min(0).max(100).optional(),
});

type CreateBarbershopFormData = z.infer<typeof createBarbershopSchema>;

export function CreateBarbershop() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateBarbershopFormData>({
    resolver: zodResolver(createBarbershopSchema),
    defaultValues: {
      name: '',
      description: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      phone: '',
      email: '',
      default_appointment_duration: 30,
      buffer_time_between_appointments: 15,
      max_advance_booking_days: 30,
      min_advance_booking_hours: 2,
      cancellation_hours: 24,
      auto_confirm_appointments: false,
      allow_walk_ins: true,
      require_deposit: false,
      deposit_percentage: 0,
    },
  });

  const watchRequireDeposit = form.watch('require_deposit');

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  const onSubmit = async (data: CreateBarbershopFormData) => {
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'No se pudo identificar el usuario',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const slug = generateSlug(data.name);

      // Preparar los datos para la creación
      const barbershopData = {
        owner_id: user.id,
        name: data.name,
        slug,
        description: data.description || null,
        address: data.address,
        city: data.city,
        state: data.state,
        zip_code: data.zip_code || null,
        country: 'AR', // Argentina por defecto
        phone: data.phone,
        email: data.email || null,
        is_active: true,
        settings: {
          default_appointment_duration: data.default_appointment_duration,
          buffer_time_between_appointments:
            data.buffer_time_between_appointments,
          max_advance_booking_days: data.max_advance_booking_days,
          min_advance_booking_hours: data.min_advance_booking_hours,
          cancellation_hours: data.cancellation_hours,
          auto_confirm_appointments: data.auto_confirm_appointments,
          allow_walk_ins: data.allow_walk_ins,
          require_deposit: data.require_deposit,
          deposit_percentage: data.require_deposit
            ? data.deposit_percentage
            : null,
        },
      };

      await barbershopService.createBarbershop(barbershopData);

      toast({
        title: '¡Barbería creada!',
        description: 'Tu barbería ha sido creada exitosamente',
      });

      // Redirigir al dashboard
      navigate('/owner');
    } catch (error) {
      console.error('Error creating barbershop:', error);
      toast({
        title: 'Error',
        description:
          'No se pudo crear la barbería. Por favor, intenta nuevamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/owner">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Crear nueva barbería</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Información básica */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Información básica
              </CardTitle>
              <CardDescription>
                Datos principales de tu barbería
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de la barbería</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Barbería El Estilo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción (opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe tu barbería y los servicios que ofreces"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="Ej: 1122334455"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (opcional)</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="contacto@barberia.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Dirección */}
          <Card>
            <CardHeader>
              <CardTitle>Ubicación</CardTitle>
              <CardDescription>
                Dirección completa de tu barbería
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Av. Corrientes 1234" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ciudad</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Buenos Aires" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provincia</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: CABA" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="zip_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código postal (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: 1425" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Configuración de citas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Configuración de citas
              </CardTitle>
              <CardDescription>
                Define cómo funcionarán las reservas en tu barbería
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="default_appointment_duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duración por defecto (minutos)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        Tiempo estándar para un corte de pelo
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="buffer_time_between_appointments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tiempo entre citas (minutos)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        Tiempo de preparación entre clientes
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="min_advance_booking_hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Anticipación mínima (horas)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        Horas mínimas para reservar
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="max_advance_booking_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Anticipación máxima (días)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        Días máximos para reservar
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="cancellation_hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horas para cancelación</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      Los clientes pueden cancelar hasta estas horas antes
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Configuración adicional */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Configuración adicional
              </CardTitle>
              <CardDescription>
                Opciones avanzadas para tu barbería
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="auto_confirm_appointments"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Confirmar citas automáticamente</FormLabel>
                      <FormDescription>
                        Las citas se confirman sin revisión manual
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="allow_walk_ins"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Permitir clientes sin cita</FormLabel>
                      <FormDescription>
                        Aceptar clientes que lleguen sin reserva previa
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="require_deposit"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Requerir depósito</FormLabel>
                      <FormDescription>
                        Solicitar un pago parcial al reservar
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {watchRequireDeposit && (
                <FormField
                  control={form.control}
                  name="deposit_percentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Porcentaje de depósito</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value))
                            }
                          />
                          <span className="text-muted-foreground">%</span>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Porcentaje del total a pagar como depósito
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <Link to="/owner">Cancelar</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Save className="mr-2 h-4 w-4" />
              {isSubmitting ? 'Creando...' : 'Crear barbería'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
