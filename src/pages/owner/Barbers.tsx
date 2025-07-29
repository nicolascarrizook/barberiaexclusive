import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { barberService } from '@/services/barbers.service';
import { barbershopService } from '@/services/barbershops.service';
import { BarberFormDialog } from '@/components/owner/BarberFormDialog';
import { BarberCreationDialog } from '@/components/owner/BarberCreationDialog';
import { 
  ArrowLeft, 
  Plus, 
  Edit, 
  Users, 
  Star, 
  Clock,
  DollarSign,
  AlertCircle,
  UserPlus,
  Mail
} from 'lucide-react';

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
    email?: string;
    phone?: string;
    avatar_url?: string;
  };
}

export function Barbers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isCreationDialogOpen, setIsCreationDialogOpen] = useState(false);
  const [editingBarber, setEditingBarber] = useState<BarberWithProfile | undefined>(undefined);

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

  // Fetch barbers
  const { data: barbers, isLoading: barbersLoading, error: barbersError } = useQuery({
    queryKey: ['barbershop-barbers', barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      return barberService.getBarbersByBarbershop(barbershop.id, true); // Include inactive barbers
    },
    enabled: !!barbershop?.id,
  });

  // Toggle barber status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ barberId, isActive }: { barberId: string; isActive: boolean }) => {
      await barberService.updateBarber(barberId, { is_active: isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barbershop-barbers'] });
      toast({
        title: 'Estado actualizado',
        description: 'El estado del barbero se ha actualizado correctamente',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado del barbero',
        variant: 'destructive',
      });
    },
  });

  const handleEditBarber = (barber: BarberWithProfile) => {
    setEditingBarber(barber);
    setIsFormDialogOpen(true);
  };

  const handleToggleStatus = (barberId: string, currentStatus: boolean) => {
    toggleStatusMutation.mutate({ barberId, isActive: !currentStatus });
  };

  // Calculate statistics
  const activeBarbers = barbers?.filter(b => b.is_active).length || 0;
  const totalBarbers = barbers?.length || 0;
  const averageRating = barbers?.length 
    ? (barbers.reduce((sum, barber) => sum + barber.rating, 0) / barbers.length)
    : 0;

  if (barbershopLoading || barbersLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (!barbershop) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Gestión de barberos</h1>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No se encontró ninguna barbería asociada a tu cuenta.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (barbersError) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Gestión de barberos</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error al cargar los barberos. Por favor, intenta nuevamente.
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
          <h1 className="text-3xl font-bold">Gestión de barberos</h1>
          <p className="text-muted-foreground">
            Administra el equipo de barberos de tu barbería
          </p>
        </div>
        <div>
          <Button onClick={() => setIsCreationDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Agregar barbero
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de barberos
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBarbers}</div>
            <p className="text-xs text-muted-foreground">
              {activeBarbers} activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Calificación promedio
            </CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {averageRating.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">
              De {barbers?.reduce((sum, b) => sum + b.total_reviews, 0)} reseñas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Barberos activos
            </CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeBarbers}</div>
            <p className="text-xs text-muted-foreground">
              {totalBarbers > 0 ? Math.round((activeBarbers / totalBarbers) * 100) : 0}% del total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Barbers List */}
      {!barbers || barbers.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Users className="h-16 w-16 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">No hay barberos</h3>
                <p className="text-muted-foreground">
                  Aún no has agregado ningún barbero a tu equipo
                </p>
              </div>
              <div className="flex justify-center">
                <Button onClick={() => setIsCreationDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar primer barbero
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {barbers.map((barber) => (
            <Card key={barber.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage 
                      src={barber.profile?.avatar_url} 
                      alt={barber.display_name} 
                    />
                    <AvatarFallback>
                      {barber.display_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg truncate">
                        {barber.display_name}
                      </CardTitle>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleEditBarber(barber)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                    {barber.bio && (
                      <CardDescription className="line-clamp-2">
                        {barber.bio}
                      </CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Rating and Experience */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{barber.rating.toFixed(1)}</span>
                    <span className="text-muted-foreground">
                      ({barber.total_reviews})
                    </span>
                  </div>
                  {barber.years_experience && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{barber.years_experience} años</span>
                    </div>
                  )}
                </div>

                {/* Specialties */}
                {barber.specialties && barber.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {barber.specialties.slice(0, 3).map((specialty, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {specialty}
                      </Badge>
                    ))}
                    {barber.specialties.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{barber.specialties.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Commission */}
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>Comisión: {barber.commission_percentage}%</span>
                </div>

                {/* Instagram */}
                {barber.instagram_handle && (
                  <div className="text-sm text-muted-foreground">
                    @{barber.instagram_handle}
                  </div>
                )}

                {/* Status Toggle */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm font-medium">Activo</span>
                  <Switch
                    checked={barber.is_active}
                    onCheckedChange={() => handleToggleStatus(barber.id, barber.is_active)}
                    disabled={toggleStatusMutation.isPending}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editingBarber && (
        <BarberFormDialog
          open={isFormDialogOpen}
          onOpenChange={setIsFormDialogOpen}
          barber={editingBarber}
          barbershopId={barbershop?.id}
        />
      )}

      <BarberCreationDialog
        open={isCreationDialogOpen}
        onOpenChange={setIsCreationDialogOpen}
        barbershopId={barbershop?.id}
      />
    </div>
  );
}