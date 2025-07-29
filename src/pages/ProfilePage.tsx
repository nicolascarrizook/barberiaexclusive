import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Camera } from 'lucide-react';

const profileSchema = z.object({
  fullName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  phone: z.string().min(10, 'El teléfono debe tener al menos 10 dígitos'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function ProfilePage() {
  const { user, profile, updateProfile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile?.full_name || '',
      phone: profile?.phone || '',
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true);
    try {
      await updateProfile({
        full_name: data.fullName,
        phone: data.phone,
      });
      toast({
        title: 'Perfil actualizado',
        description: 'Tu información ha sido actualizada correctamente',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al actualizar el perfil',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Mi Perfil</h1>

      <Card>
        <CardHeader>
          <CardTitle>Información personal</CardTitle>
          <CardDescription>
            Actualiza tu información personal y de contacto
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || ''} />
              <AvatarFallback>
                {profile?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Button variant="outline" size="sm">
              <Camera className="mr-2 h-4 w-4" />
              Cambiar foto
            </Button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-sm text-muted-foreground">
                El email no puede ser modificado
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Nombre completo</Label>
              <Input
                id="fullName"
                {...register('fullName')}
                disabled={isLoading}
              />
              {errors.fullName && (
                <p className="text-sm text-destructive">{errors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                type="tel"
                {...register('phone')}
                disabled={isLoading}
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Rol</Label>
              <Input
                value={profile?.role === 'admin' ? 'Administrador' : profile?.role === 'barber' ? 'Barbero' : 'Cliente'}
                disabled
                className="bg-muted"
              />
            </div>

            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar cambios'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}