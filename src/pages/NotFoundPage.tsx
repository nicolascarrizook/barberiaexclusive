import { FileQuestion, Home, Search, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

export function NotFoundPage() {
  const navigate = useNavigate();

  const suggestions = [
    { path: '/', label: 'Página de inicio', icon: Home },
    { path: '/booking', label: 'Reservar cita', icon: Search },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center space-y-6">
          <div className="mx-auto h-32 w-32 rounded-full bg-muted flex items-center justify-center">
            <FileQuestion className="h-16 w-16 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold">404</CardTitle>
            <CardDescription className="text-lg">
              Página no encontrada
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <p className="text-center text-muted-foreground">
            Lo sentimos, no pudimos encontrar la página que estás buscando. 
            Es posible que haya sido movida, eliminada o que nunca haya existido.
          </p>

          <div className="space-y-3">
            <p className="text-sm font-medium text-center">Páginas sugeridas:</p>
            <div className="grid gap-2">
              {suggestions.map(({ path, label, icon: Icon }) => (
                <Button
                  key={path}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate(path)}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex gap-2">
          <Button 
            variant="ghost" 
            className="flex-1"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver atrás
          </Button>
          <Button 
            variant="default" 
            className="flex-1"
            onClick={() => navigate('/')}
          >
            <Home className="mr-2 h-4 w-4" />
            Ir al inicio
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}