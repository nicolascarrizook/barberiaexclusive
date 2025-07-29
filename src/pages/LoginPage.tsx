import { LoginForm } from '@/components/auth/LoginForm';

export function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Iniciar sesión</h1>
        <p className="text-sm text-muted-foreground">
          Ingresa tus credenciales para acceder a tu cuenta
        </p>
      </div>
      
      <LoginForm />
    </div>
  );
}