import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { servicesService } from '@/services/services.service';
import { barbershopService } from '@/services/barbershops.service';
import { ServiceFormDialog } from '@/components/owner/ServiceFormDialog';
import { 
  ArrowLeft, 
  Plus, 
  Edit, 
  Scissors, 
  Clock, 
  DollarSign,
  AlertCircle,
  GripVertical
} from 'lucide-react';

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

const categories = [
  { value: 'all', label: 'Todos', icon: Scissors },
  { value: 'Corte', label: 'Corte', icon: Scissors },
  { value: 'Barba', label: 'Barba', icon: Scissors },
  { value: 'Tratamientos', label: 'Tratamientos', icon: Scissors }
];

export function Services() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Fetch barbershop data
  const { data: barbershop, isLoading: barbershopLoading } = useQuery({
    queryKey: ['owner-barbershop', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID');
      const shops = await barbershopService.getByOwner(user.id);
      return shops[0];
    },
    enabled: !!user?.id,
  });

  // Fetch services
  const { data: services, isLoading: servicesLoading, error: servicesError } = useQuery({
    queryKey: ['barbershop-services', barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      return servicesService.getAllServicesByBarbershop(barbershop.id);
    },
    enabled: !!barbershop?.id,
  });

  // Toggle service status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ serviceId, isActive }: { serviceId: string; isActive: boolean }) => {
      await servicesService.updateService(serviceId, { is_active: isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barbershop-services'] });
      toast({
        title: 'Estado actualizado',
        description: 'El estado del servicio se ha actualizado correctamente',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado del servicio',
        variant: 'destructive',
      });
    },
  });

  const filteredServices = services?.filter(service => 
    selectedCategory === 'all' || service.category === selectedCategory
  ) || [];

  const handleEditService = (service: Service) => {
    setEditingService(service);
    setIsDialogOpen(true);
  };

  const handleCreateService = () => {
    setEditingService(null);
    setIsDialogOpen(true);
  };

  const handleToggleStatus = (serviceId: string, currentStatus: boolean) => {
    toggleStatusMutation.mutate({ serviceId, isActive: !currentStatus });
  };

  const getServiceCountByCategory = (category: string) => {
    if (!services) return 0;
    if (category === 'all') return services.length;
    return services.filter(service => service.category === category).length;
  };

  if (barbershopLoading || servicesLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!barbershop) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Gestión de servicios</h1>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No se encontró ninguna barbería asociada a tu cuenta.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (servicesError) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Gestión de servicios</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error al cargar los servicios. Por favor, intenta nuevamente.
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
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Gestión de servicios</h1>
          <p className="text-muted-foreground">
            Administra los servicios que ofrece tu barbería
          </p>
        </div>
        <Button onClick={handleCreateService}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo servicio
        </Button>
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="grid w-full grid-cols-4">
          {categories.map((category) => (
            <TabsTrigger key={category.value} value={category.value} className="flex items-center gap-2">
              <category.icon className="h-4 w-4" />
              {category.label}
              <Badge variant="secondary" className="ml-1">
                {getServiceCountByCategory(category.value)}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((category) => (
          <TabsContent key={category.value} value={category.value} className="space-y-4">
            {filteredServices.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <Scissors className="h-16 w-16 mx-auto text-muted-foreground" />
                    <div>
                      <h3 className="text-lg font-semibold">No hay servicios</h3>
                      <p className="text-muted-foreground">
                        {selectedCategory === 'all' 
                          ? 'Aún no has creado ningún servicio'
                          : `No hay servicios en la categoría "${category.label}"`
                        }
                      </p>
                    </div>
                    <Button onClick={handleCreateService}>
                      <Plus className="mr-2 h-4 w-4" />
                      Crear primer servicio
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredServices.map((service) => (
                  <Card key={service.id} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{service.name}</CardTitle>
                          {service.description && (
                            <CardDescription className="mt-1">
                              {service.description}
                            </CardDescription>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditService(service)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{service.duration_minutes} min</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">
                            ${service.price.toLocaleString('es-AR')}
                          </span>
                        </div>
                      </div>

                      {service.category && (
                        <Badge variant="outline">{service.category}</Badge>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Activo</span>
                        <Switch
                          checked={service.is_active}
                          onCheckedChange={() => handleToggleStatus(service.id, service.is_active)}
                          disabled={toggleStatusMutation.isPending}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <ServiceFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        service={editingService}
        barbershopId={barbershop?.id}
      />
    </div>
  );
}