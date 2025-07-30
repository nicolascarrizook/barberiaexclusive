import {useEffect} from 'react';
// // // // // import { useForm } from 'react-hook-form';
// // // // // import { zodResolver } from '@hookform/resolvers/zod';
// // // // // import { z } from 'zod';
// // // // // import { useMutation, useQueryClient } from '@tanstack/react-query';
// // // // // import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
// // // // // import { Button } from '@/components/ui/button';
// // // // // import { Input } from '@/components/ui/input';
// // // // // import { Label } from '@/components/ui/label';
// // // // // import { Textarea } from '@/components/ui/textarea';
// // // // // import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
// // // // // import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
// // // // // import { useToast } from '@/hooks/use-toast';
// // // // // import { servicesService } from '@/services/services.service';
// // // // // import { Save, Loader2 } from 'lucide-react';

const _serviceSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().optional(),
  category: z.enum(['Corte', 'Barba', 'Tratamientos'], {
    required_error: 'Selecciona una categoría',
  }),
  duration_minutes: z.number().min(15, 'La duración mínima es 15 minutos').max(300, 'La duración máxima es 300 minutos'),
  price: z.number().min(0, 'El precio no puede ser negativo'),
  image_url: z.string().url('URL inválida').optional().or(z.literal('')),
});

type ServiceFormData = z.infer<typeof serviceSchema>;

interface Service {
  id: string;
  name: string;
  description?: string;
  category?: string;
  duration_minutes: number;
  price: number;
  is_active: boolean;
  image_url?: string;
  order_index: number;
}

interface ServiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: Service | null;
  barbershopId?: string;
}

const _categories = [
  { value: 'Corte', label: 'Corte' },
  { value: 'Barba', label: 'Barba' },
  { value: 'Tratamientos', label: 'Tratamientos' },
];

export function ServiceFormDialog({ 
  open, 
  onOpenChange, 
  service, 
  barbershopId 
}: ServiceFormDialogProps) {
  const { toast } = useToast();
  const _queryClient = useQueryClient();

  const _form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: '',
      description: '',
      category: 'Corte',
      duration_minutes: 30,
      price: 0,
      image_url: '',
    },
  });

  // Reset form when service changes or dialog opens/closes
  useEffect(() => {
    if (service) {
      form.reset({
        name: service.name,
        description: service.description || '',
        category: (service.category as 'Corte' | 'Barba' | 'Tratamientos') || 'Corte',
        duration_minutes: service.duration_minutes,
        price: service.price,
        image_url: service.image_url || '',
      });
    } else {
      form.reset({
        name: '',
        description: '',
        category: 'Corte',
        duration_minutes: 30,
        price: 0,
        image_url: '',
      });
    }
  }, [service, form, open]);

  const _createMutation = useMutation({
    mutationFn: async (data: ServiceFormData) => {
      if (!barbershopId) throw new Error('No barbershop ID');
      
      return servicesService.createService({
        barbershop_id: barbershopId,
        name: data.name,
        description: data.description || null,
        category: data.category,
        duration_minutes: data.duration_minutes,
        price: data.price,
        image_url: data.image_url || null,
        is_active: true,
        order_index: 0, // Will be updated based on existing services
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barbershop-services'] });
      toast({
        title: 'Servicio creado',
        description: 'El servicio se ha creado exitosamente',
      });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Error creating service:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear el servicio',
        variant: 'destructive',
      });
    },
  });

  const _updateMutation = useMutation({
    mutationFn: async (data: ServiceFormData) => {
      if (!service?.id) throw new Error('No service ID');
      
      return servicesService.updateService(service.id, {
        name: data.name,
        description: data.description || null,
        category: data.category,
        duration_minutes: data.duration_minutes,
        price: data.price,
        image_url: data.image_url || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barbershop-services'] });
      toast({
        title: 'Servicio actualizado',
        description: 'El servicio se ha actualizado exitosamente',
      });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Error updating service:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el servicio',
        variant: 'destructive',
      });
    },
  });

  const _onSubmit = async (data: ServiceFormData) => {
    if (service) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const _isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {service ? 'Editar servicio' : 'Crear nuevo servicio'}
          </DialogTitle>
          <DialogDescription>
            {service 
              ? 'Modifica los datos del servicio'
              : 'Agrega un nuevo servicio a tu barbería'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del servicio</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ej: Corte clásico" 
                      {...field} 
                      disabled={isLoading}
                    />
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
                      placeholder="Describe el servicio..."
                      rows={3}
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una categoría" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="duration_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duración (min)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="15" 
                        max="300"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio ($)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="image_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Imagen (opcional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="url"
                      placeholder="https://ejemplo.com/imagen.jpg"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>
                    URL de una imagen representativa del servicio
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                {service ? 'Actualizar' : 'Crear'} servicio
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}