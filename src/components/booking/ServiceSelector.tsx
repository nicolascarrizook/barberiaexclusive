import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, DollarSign, Plus, X, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  description?: string;
  category?: string;
}

interface ServiceCategory {
  name: string;
  services: Service[];
}

interface ServiceSelectorProps {
  barbershopId: string;
  selectedServices: Service[];
  onNext: (services: Service[]) => void;
}

/**
 * ServiceSelector - Fresha-style service selection
 * Professional UI with categories, pricing, and duration display
 */
export function ServiceSelector({ barbershopId, selectedServices, onNext }: ServiceSelectorProps) {
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [selected, setSelected] = useState<Service[]>(selectedServices);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadServices();
  }, [barbershopId]);

  /**
   * Load services from database and organize by category
   */
  const loadServices = async () => {
    try {
      const { data: servicesData, error } = await supabase
        .from('services')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      setServices(servicesData || []);
      
      // Group services by category
      const grouped = (servicesData || []).reduce((acc, service) => {
        const category = service.category || 'Servicios';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(service);
        return acc;
      }, {} as Record<string, Service[]>);

      const categoryList = Object.entries(grouped).map(([name, services]) => ({
        name,
        services,
      }));

      setCategories(categoryList);
    } catch (error) {
      console.error('Error loading services:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los servicios',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Toggle service selection
   */
  const toggleService = (service: Service) => {
    const isSelected = selected.some(s => s.id === service.id);
    
    if (isSelected) {
      setSelected(selected.filter(s => s.id !== service.id));
    } else {
      setSelected([...selected, service]);
    }
  };

  /**
   * Remove service from selection
   */
  const removeService = (serviceId: string) => {
    setSelected(selected.filter(s => s.id !== serviceId));
  };

  /**
   * Calculate total duration and price
   */
  const totalDuration = selected.reduce((sum, service) => sum + service.duration_minutes, 0);
  const totalPrice = selected.reduce((sum, service) => sum + service.price, 0);

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

  /**
   * Handle next step
   */
  const handleNext = () => {
    if (selected.length === 0) {
      toast({
        title: 'Selecciona al menos un servicio',
        description: 'Debes elegir al menos un servicio para continuar',
        variant: 'destructive',
      });
      return;
    }

    onNext(selected);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">¿Qué servicios necesitas?</h2>
        <p className="text-gray-600">Selecciona uno o más servicios para tu cita</p>
      </div>

      {/* Selected Services Summary */}
      {selected.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-50 rounded-lg p-4 space-y-3"
        >
          <div className="font-medium text-sm text-gray-700">Servicios seleccionados:</div>
          
          <div className="space-y-2">
            {selected.map((service) => (
              <div key={service.id} className="flex items-center justify-between bg-white rounded-md p-3">
                <div className="flex-1">
                  <div className="font-medium">{service.name}</div>
                  <div className="flex items-center space-x-3 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatDuration(service.duration_minutes)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <DollarSign className="w-3 h-3" />
                      <span>{formatPrice(service.price)}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removeService(service.id)}
                  className="ml-3 p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            ))}
          </div>

          {/* Totals */}
          <Separator />
          <div className="flex justify-between items-center font-medium">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1 text-gray-600">
                <Clock className="w-4 h-4" />
                <span>Total: {formatDuration(totalDuration)}</span>
              </div>
              <div className="flex items-center space-x-1">
                <DollarSign className="w-4 h-4" />
                <span>{formatPrice(totalPrice)}</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Service Categories */}
      <div className="space-y-6">
        {categories.map((category) => (
          <div key={category.name} className="space-y-3">
            <h3 className="font-semibold text-lg text-gray-800">{category.name}</h3>
            
            <div className="grid gap-3">
              {category.services.map((service) => {
                const isSelected = selected.some(s => s.id === service.id);
                
                return (
                  <motion.div
                    key={service.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={`
                      relative p-4 rounded-lg border-2 cursor-pointer transition-all
                      ${isSelected
                        ? 'border-black bg-black text-white'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                      }
                    `}
                    onClick={() => toggleService(service)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{service.name}</h4>
                          {isSelected && (
                            <Check className="w-4 h-4" />
                          )}
                        </div>
                        
                        {service.description && (
                          <p className={`text-sm mt-1 ${isSelected ? 'text-gray-200' : 'text-gray-600'}`}>
                            {service.description}
                          </p>
                        )}
                        
                        <div className="flex items-center space-x-4 mt-2">
                          <div className="flex items-center space-x-1">
                            <Clock className={`w-4 h-4 ${isSelected ? 'text-gray-300' : 'text-gray-500'}`} />
                            <span className={`text-sm ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>
                              {formatDuration(service.duration_minutes)}
                            </span>
                          </div>
                          
                          <div className={`font-semibold ${isSelected ? 'text-white' : 'text-black'}`}>
                            {formatPrice(service.price)}
                          </div>
                        </div>
                      </div>
                      
                      <div className={`ml-4 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        isSelected 
                          ? 'border-white bg-white'
                          : 'border-gray-300'
                      }`}>
                        {isSelected ? (
                          <Plus className="w-3 h-3 text-black rotate-45" />
                        ) : (
                          <Plus className="w-3 h-3 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Continue Button */}
      <div className="pt-4">
        <Button
          onClick={handleNext}
          disabled={selected.length === 0}
          className="w-full py-3 text-base font-medium"
          size="lg"
        >
          Continuar
          {selected.length > 0 && (
            <Badge variant="secondary" className="ml-2 bg-white text-black">
              {selected.length}
            </Badge>
          )}
        </Button>
      </div>
    </div>
  );
}