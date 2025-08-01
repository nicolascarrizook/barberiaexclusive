import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Service } from "@/types";
import { Clock, DollarSign } from "lucide-react";

interface ServiceSelectionProps {
  services: Service[];
  selectedService?: Service;
  onSelectService: (service: Service) => void;
  onNext: () => void;
}

export function ServiceSelection({
  services,
  selectedService,
  onSelectService,
  onNext,
}: ServiceSelectionProps) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Selecciona un servicio</h2>
        <p className="text-muted-foreground">
          Elige el servicio que deseas reservar
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {services.map((service) => (
          <Card
            key={service.id}
            className={`cursor-pointer transition-all ${
              selectedService?.id === service.id
                ? 'ring-2 ring-primary'
                : 'hover:shadow-lg'
            }`}
            onClick={() => onSelectService(service)}
          >
            <CardHeader>
              <CardTitle className="text-lg">{service.name}</CardTitle>
              {service.description && (
                <CardDescription>{service.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{service.duration_minutes} min</span>
                </div>
                <div className="flex items-center gap-1 font-semibold">
                  <DollarSign className="h-4 w-4" />
                  <span>{service.price}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end mt-6">
        <Button onClick={onNext} disabled={!selectedService} size="lg">
          Siguiente
        </Button>
      </div>
    </div>
  );
}
