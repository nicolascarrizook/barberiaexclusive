import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { barberService } from '@/services/barbers.service';
import { Loader2, QrCode } from 'lucide-react';

const codeSchema = z.object({
  code: z.string()
    .min(6, 'El código debe tener 6 caracteres')
    .max(6, 'El código debe tener 6 caracteres')
    .toUpperCase(),
});

type CodeFormData = z.infer<typeof codeSchema>;

interface InvitationCodeFormProps {
  initialCode?: string;
  onSuccess: (barbershopId: string) => void;
  onError: (error: string) => void;
}

export function InvitationCodeForm({ 
  initialCode = '', 
  onSuccess,
  onError 
}: InvitationCodeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CodeFormData>({
    resolver: zodResolver(codeSchema),
    defaultValues: {
      code: initialCode.toUpperCase(),
    },
  });

  const claimInvitationMutation = useMutation({
    mutationFn: async (code: string) => {
      return barberService.claimInvitation(code);
    },
    onSuccess: (result) => {
      if (result.success && result.barbershop_id) {
        onSuccess(result.barbershop_id);
      } else {
        onError('No se pudo procesar la invitación');
      }
    },
    onError: (error) => {
      console.error('Error claiming invitation:', error);
      const message = error instanceof Error ? error.message : 'Código inválido o expirado';
      onError(message);
      setIsSubmitting(false);
    },
  });

  const onSubmit = async (data: CodeFormData) => {
    setIsSubmitting(true);
    claimInvitationMutation.mutate(data.code);
  };

  // Auto-submit if we have an initial code
  const handleAutoSubmit = () => {
    if (initialCode && form.getValues('code') === initialCode.toUpperCase()) {
      form.handleSubmit(onSubmit)();
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <QrCode className="h-6 w-6" />
          <CardTitle>Código de invitación</CardTitle>
        </div>
        <CardDescription>
          Ingresa el código de 6 caracteres proporcionado por tu barbería
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código de acceso</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="ABC123"
                      className="font-mono text-2xl text-center uppercase"
                      maxLength={6}
                      disabled={isSubmitting}
                      onChange={(e) => {
                        field.onChange(e.target.value.toUpperCase());
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    El código te fue proporcionado por el dueño de la barbería
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3">
              <Button 
                type="submit" 
                className="flex-1"
                disabled={isSubmitting || claimInvitationMutation.isPending}
              >
                {(isSubmitting || claimInvitationMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Validar código
              </Button>
              {initialCode && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAutoSubmit}
                  disabled={isSubmitting || claimInvitationMutation.isPending}
                >
                  Usar código de la URL
                </Button>
              )}
            </div>
          </form>
        </Form>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-medium text-sm mb-2">¿No tienes un código?</h4>
          <p className="text-sm text-muted-foreground">
            Contacta al dueño de la barbería donde deseas trabajar para que te proporcione
            un código de invitación.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}