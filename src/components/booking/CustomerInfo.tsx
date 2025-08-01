import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User, Calendar, Clock, DollarSign, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
}

interface SelectedSlot {
  barberId: string;
  barberName: string;
  barberAvatar?: string;
  date: Date;
  startTime: string;
  endTime: string;
}

interface CustomerData {
  fullName: string;
  phone: string;
  email?: string;
  notes?: string;
}

interface CustomerInfoProps {
  selectedServices: Service[];
  selectedSlot: SelectedSlot;
  customerData: CustomerData | null;
  isLoading: boolean;
  onSubmit: (data: CustomerData) => void;
  onBack: () => void;
}

// Validation schema
const customerSchema = z.object({
  fullName: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre es demasiado largo'),
  phone: z.string()
    .min(10, 'El teléfono debe tener al menos 10 dígitos')
    .max(15, 'El teléfono es demasiado largo')
    .regex(/^[\d\s\-\+\(\)]+$/, 'Formato de teléfono inválido'),
  email: z.string()
    .email('Email inválido')
    .optional()
    .or(z.literal('')),
  notes: z.string()
    .max(500, 'Las notas son demasiado largas')
    .optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

/**
 * CustomerInfo - Professional customer information form
 * Clean form with validation and booking summary
 */
export function CustomerInfo({
  selectedServices,
  selectedSlot,
  customerData,
  isLoading,
  onSubmit,
  onBack,
}: CustomerInfoProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    watch,
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      fullName: customerData?.fullName || '',
      phone: customerData?.phone || '',
      email: customerData?.email || '',
      notes: customerData?.notes || '',
    },
    mode: 'onChange',
  });

  // Watch form changes for real-time validation feedback
  const watchedFields = watch();

  // Set form values if customerData changes
  useEffect(() => {
    if (customerData) {
      setValue('fullName', customerData.fullName);
      setValue('phone', customerData.phone);
      setValue('email', customerData.email || '');
      setValue('notes', customerData.notes || '');
    }
  }, [customerData, setValue]);

  /**
   * Handle form submission
   */
  const onFormSubmit = (data: CustomerFormData) => {
    const customerData: CustomerData = {
      fullName: data.fullName.trim(),
      phone: data.phone.trim(),
      email: data.email?.trim() || undefined,
      notes: data.notes?.trim() || undefined,
    };

    onSubmit(customerData);
  };

  /**
   * Format duration display
   */
  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  /**
   * Format price display
   */
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Información de contacto</h2>
        <p className="text-gray-600">Completa tus datos para confirmar la reserva</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Customer Form */}
        <div className="space-y-6">
          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">Nombre completo *</Label>
              <Input
                id="fullName"
                placeholder="Tu nombre completo"
                {...register('fullName')}
                className={errors.fullName ? 'border-red-500' : ''}
              />
              {errors.fullName && (
                <p className="text-sm text-red-600">{errors.fullName.message}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+54 9 11 1234-5678"
                {...register('phone')}
                className={errors.phone ? 'border-red-500' : ''}
              />
              {errors.phone && (
                <p className="text-sm text-red-600">{errors.phone.message}</p>
              )}
              <p className="text-xs text-gray-500">
                Te enviaremos confirmación y recordatorios por SMS
              </p>
            </div>

            {/* Email (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="email">Email (opcional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                {...register('email')}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
              <p className="text-xs text-gray-500">
                Para recibir confirmación por email
              </p>
            </div>

            {/* Notes (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notas adicionales (opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Alguna preferencia especial o comentario..."
                rows={3}
                {...register('notes')}
                className={errors.notes ? 'border-red-500' : ''}
              />
              {errors.notes && (
                <p className="text-sm text-red-600">{errors.notes.message}</p>
              )}
              <p className="text-xs text-gray-500">
                Máximo 500 caracteres
              </p>
            </div>
          </form>
        </div>

        {/* Booking Summary */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Resumen de tu reserva</h3>
          
          <Card className="p-4 space-y-4">
            {/* Date & Time */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-black text-white rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="font-medium">
                  {format(selectedSlot.date, 'EEEE d \'de\' MMMM', { locale: es })}
                </div>
                <div className="text-sm text-gray-600">
                  {selectedSlot.startTime} - {selectedSlot.endTime}
                </div>
              </div>
            </div>

            <Separator />

            {/* Barber */}
            <div className="flex items-center space-x-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={selectedSlot.barberAvatar} alt={selectedSlot.barberName} />
                <AvatarFallback>
                  <User className="w-5 h-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{selectedSlot.barberName}</div>
                <div className="text-sm text-gray-600">Tu barbero</div>
              </div>
            </div>

            <Separator />

            {/* Services */}
            <div className="space-y-2">
              <div className="font-medium">Servicios</div>
              {selectedServices.map((service) => (
                <div key={service.id} className="flex justify-between items-center text-sm">
                  <div>
                    <div>{service.name}</div>
                    <div className="text-gray-500 flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatDuration(service.duration_minutes)}</span>
                    </div>
                  </div>
                  <div className="font-medium">{formatPrice(service.price)}</div>
                </div>
              ))}
            </div>

            <Separator />

            {/* Total */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">Duración total</span>
                <span className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>{formatDuration(totalDuration)}</span>
                </span>
              </div>
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total</span>
                <span className="flex items-center space-x-1">
                  <DollarSign className="w-5 h-5" />
                  <span>{formatPrice(totalPrice)}</span>
                </span>
              </div>
            </div>
          </Card>

          {/* Terms */}
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
            <p>
              Al confirmar tu reserva aceptas nuestros términos y condiciones. 
              Puedes cancelar hasta 24 horas antes sin costo.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-6">
        <Button 
          variant="ghost" 
          onClick={onBack}
          disabled={isLoading}
        >
          Atrás
        </Button>
        
        <Button
          onClick={handleSubmit(onFormSubmit)}
          disabled={!isValid || isLoading}
          className="px-8 space-x-2"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>{isLoading ? 'Confirmando...' : 'Confirmar reserva'}</span>
        </Button>
      </div>
    </div>
  );
}