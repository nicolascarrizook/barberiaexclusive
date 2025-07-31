import { LoginForm } from '@/components/auth/LoginForm';
import { motion } from 'framer-motion';

export function LoginPage() {
  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Iniciar sesión</h1>
        <p className="text-sm text-muted-foreground">
          Ingresa tus credenciales para acceder a tu cuenta
        </p>
      </div>

      <LoginForm />
    </motion.div>
  );
}