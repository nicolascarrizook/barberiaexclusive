import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Service } from "@/types";
import { Clock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ServiceSelectionV2Props {
  services: Service[];
  selectedService?: Service;
  onSelectService: (service: Service) => void;
  onNext: () => void;
}

const POPULAR_SERVICES = ["Corte de cabello", "Corte y barba", "Fade"];

export function ServiceSelectionV2({
  services,
  selectedService,
  onSelectService,
  onNext,
}: ServiceSelectionV2Props) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">
          Selecciona un servicio
        </h2>
        <p className="text-muted-foreground">
          Elige el servicio que deseas reservar
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service, index) => {
          const isSelected = selectedService?.id === service.id;
          const isPopular = POPULAR_SERVICES.some(name => 
            service.name.toLowerCase().includes(name.toLowerCase())
          );

          return (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card
                className={cn(
                  "cursor-pointer transition-all",
                  "hover:shadow-lg",
                  isSelected && "ring-2 ring-primary"
                )}
                onClick={() => onSelectService(service)}
              >
                <div className="p-6 space-y-4">
                  {/* Popular badge */}
                  {isPopular && (
                    <Badge variant="outline" className="text-xs">
                      Popular
                    </Badge>
                  )}

                  {/* Service details */}
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">{service.name}</h3>
                    {service.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {service.description}
                      </p>
                    )}
                  </div>

                  {/* Duration and price */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{service.duration_minutes} min</span>
                    </div>
                    <div className="text-xl font-semibold">
                      ${service.price}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="flex justify-end pt-4">
        <Button
          size="lg"
          disabled={!selectedService}
          onClick={onNext}
          className="min-w-[200px]"
        >
          Continuar
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}