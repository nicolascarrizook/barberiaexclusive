import {useEffect} from 'react';
// // // // // import { useNavigate, useSearchParams } from 'react-router-dom';
// // // // // import { useAuth } from '@/hooks/useAuth';
// // // // // import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// // // // // import { Alert, AlertDescription } from '@/components/ui/alert';
// // // // // import { Button } from '@/components/ui/button';
// // // // // import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// // // // // import { InvitationCodeForm } from '@/components/barber/InvitationCodeForm';
// // // // // import { BarberProfileSetup } from '@/components/barber/BarberProfileSetup';
// // // // // import { LoginForm } from '@/components/auth/LoginForm';
// // // // // import { RegisterForm } from '@/components/auth/RegisterForm';
// // // // // import { Scissors, CheckCircle, AlertCircle, UserPlus, LogIn } from 'lucide-react';

type OnboardingStep = 'auth' | 'code' | 'profile' | 'complete';

export function BarberOnboarding() {
  const _navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoading } = useAuth();
  const [step, setStep] = useState<OnboardingStep>('auth');
  const [invitationCode, setInvitationCode] = useState<string>('');
  const [barbershopId, setBarbershopId] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Get invitation code from URL if present
  useEffect(() => {
    const _codeFromUrl = searchParams.get('code');
    if (codeFromUrl) {
      setInvitationCode(codeFromUrl);
    }
  }, [searchParams]);

  // Determine initial step based on auth state
  useEffect(() => {
    if (!isLoading) {
      if (user) {
        // User is authenticated, check if they're already a barber
        if (user.role === 'barber') {
          // Already a barber, redirect to dashboard
          navigate('/barber');
        } else {
          // Not a barber yet, proceed to code validation
          setStep('code');
        }
      } else {
        // Not authenticated, show auth options
        setStep('auth');
      }
    }
  }, [user, isLoading, navigate]);

  const _handleAuthSuccess = () => {
    // After successful auth, move to code validation
    setStep('code');
  };

  const _handleCodeSuccess = (barbershopId: string) => {
    // After successful code validation, move to profile setup
    setBarbershopId(barbershopId);
    setStep('profile');
  };

  const _handleProfileComplete = () => {
    // Profile setup complete
    setStep('complete');
    // Redirect to barber dashboard after a short delay
    setTimeout(() => {
      navigate('/barber');
    }, 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 bg-primary rounded-full flex items-center justify-center">
              <Scissors className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">Únete como barbero</h1>
          <p className="text-muted-foreground mt-2">
            Completa tu registro para comenzar a trabajar
          </p>
        </div>

        {/* Progress indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-2">
            <div
              className={`h-2 w-16 rounded-full ${
                step !== 'auth' ? 'bg-primary' : 'bg-muted'
              }`}
            />
            <div
              className={`h-2 w-16 rounded-full ${
                ['profile', 'complete'].includes(step)
                  ? 'bg-primary'
                  : 'bg-muted'
              }`}
            />
            <div
              className={`h-2 w-16 rounded-full ${
                step === 'complete' ? 'bg-primary' : 'bg-muted'
              }`}
            />
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step content */}
        {step === 'auth' && (
          <Card>
            <CardHeader>
              <CardTitle>Inicia sesión o regístrate</CardTitle>
              <CardDescription>
                Necesitas una cuenta para continuar con el proceso de registro
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">
                    <LogIn className="mr-2 h-4 w-4" />
                    Iniciar sesión
                  </TabsTrigger>
                  <TabsTrigger value="register">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Registrarse
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="login">
                  <LoginForm onSuccess={handleAuthSuccess} redirectTo={false} />
                </TabsContent>
                <TabsContent value="register">
                  <RegisterForm
                    onSuccess={handleAuthSuccess}
                    redirectTo={false}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {step === 'code' && (
          <InvitationCodeForm
            initialCode={invitationCode}
            onSuccess={handleCodeSuccess}
            onError={setError}
          />
        )}

        {step === 'profile' && barbershopId && (
          <BarberProfileSetup
            barbershopId={barbershopId}
            onComplete={handleProfileComplete}
            onError={setError}
          />
        )}

        {step === 'complete' && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold">
                    ¡Registro completado!
                  </h3>
                  <p className="text-muted-foreground mt-2">
                    Tu perfil de barbero ha sido creado exitosamente.
                    Redirigiendo a tu panel de control...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
