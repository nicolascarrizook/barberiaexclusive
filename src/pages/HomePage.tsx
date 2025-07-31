import { Link, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Scissors, Clock, Calendar, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { SimpleAuthLoader } from '@/components/ui/minimalist-scissors-loader';

export function HomePage() {
  const { user, isAuthenticated, isAdmin, isBarber, isOwner, loading } = useAuth();

  // Show minimalist loader during authentication
  if (loading) {
    return <SimpleAuthLoader />;
  }

  // Redirigir según el rol del usuario
  if (isAuthenticated && user) {
    if (isAdmin) {
      return <Navigate to="/admin" replace />;
    }
    if (isBarber) {
      return <Navigate to="/barber" replace />;
    }
    if (isOwner) {
      return <Navigate to="/owner" replace />;
    }
    // Si es customer, mostrar página personalizada
    return (
      <div className="space-y-8">
        {/* Welcome Section for logged-in customers */}
        <section className="text-center py-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            ¡Bienvenido de vuelta, {user.name}!
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            ¿Listo para agendar tu próxima cita?
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/booking">
                <Scissors className="mr-2 h-5 w-5" />
                Reservar cita
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/profile">Ver mis citas</Link>
            </Button>
          </div>
        </section>

        {/* Quick Actions for customers */}
        <section className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <Calendar className="h-10 w-10 mb-2 text-primary" />
              <CardTitle>Mis citas</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Revisa tus citas pasadas y próximas
              </CardDescription>
              <Button variant="link" className="mt-4 p-0" asChild>
                <Link to="/profile">Ver todas →</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Star className="h-10 w-10 mb-2 text-primary" />
              <CardTitle>Barberos favoritos</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Agenda rápidamente con tus barberos preferidos
              </CardDescription>
              <Button variant="link" className="mt-4 p-0" asChild>
                <Link to="/booking">Explorar barberos →</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Clock className="h-10 w-10 mb-2 text-primary" />
              <CardTitle>Horarios disponibles</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Encuentra el horario perfecto para tu próxima visita
              </CardDescription>
              <Button variant="link" className="mt-4 p-0" asChild>
                <Link to="/booking">Ver disponibilidad →</Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    );
  }

  // Si no está autenticado, mostrar la landing page original
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="text-center py-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Bienvenido a BarberShop Pro
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          Reserva tu cita en los mejores salones de barbería
        </p>
        <Button size="lg" asChild>
          <Link to="/booking">
            <Scissors className="mr-2 h-5 w-5" />
            Reservar ahora
          </Link>
        </Button>
      </section>

      {/* Features Section */}
      <section className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <Clock className="h-10 w-10 mb-2 text-primary" />
            <CardTitle>Ahorra tiempo</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Reserva tu cita en segundos y evita las esperas innecesarias
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Calendar className="h-10 w-10 mb-2 text-primary" />
            <CardTitle>Flexible</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Elige el día y hora que mejor se adapte a tu horario
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Star className="h-10 w-10 mb-2 text-primary" />
            <CardTitle>Los mejores barberos</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Profesionales calificados para brindarte el mejor servicio
            </CardDescription>
          </CardContent>
        </Card>
      </section>

      {/* CTA Section */}
      <section className="text-center py-8 bg-muted rounded-lg">
        <h2 className="text-2xl font-bold mb-4">
          ¿Listo para tu próximo corte?
        </h2>
        <p className="text-muted-foreground mb-6">
          Únete a miles de clientes satisfechos
        </p>
        <div className="flex gap-4 justify-center">
          <Button variant="outline" asChild>
            <Link to="/auth/login">Iniciar sesión</Link>
          </Button>
          <Button asChild>
            <Link to="/auth/register">Crear cuenta</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
