import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Barber } from "@/types";
import { ChevronLeft } from "lucide-react";

interface BarberSelectionProps {
  barbers: Barber[];
  selectedBarber?: Barber;
  onSelectBarber: (barber: Barber) => void;
  onNext: () => void;
  onBack: () => void;
}

export function BarberSelection({ 
  barbers, 
  selectedBarber, 
  onSelectBarber,
  onNext,
  onBack 
}: BarberSelectionProps) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Selecciona un barbero</h2>
        <p className="text-muted-foreground">Elige con quién quieres agendar tu cita</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {barbers.map((barber) => (
          <Card 
            key={barber.id}
            className={`cursor-pointer transition-all ${
              selectedBarber?.id === barber.id 
                ? 'ring-2 ring-primary' 
                : 'hover:shadow-lg'
            } ${!barber.available ? 'opacity-50' : ''}`}
            onClick={() => barber.available && onSelectBarber(barber)}
          >
            <CardHeader className="text-center">
              <Avatar className="w-20 h-20 mx-auto mb-2">
                <AvatarImage src={barber.avatar} alt={barber.name} />
                <AvatarFallback>{barber.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
              </Avatar>
              <CardTitle className="text-lg">{barber.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1 justify-center">
                {barber.specialties.map((specialty, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {specialty}
                  </Badge>
                ))}
              </div>
              {!barber.available && (
                <p className="text-center text-sm text-muted-foreground mt-2">
                  No disponible
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-between mt-6">
        <Button 
          onClick={onBack}
          variant="outline"
          size="lg"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Atrás
        </Button>
        <Button 
          onClick={onNext}
          disabled={!selectedBarber}
          size="lg"
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}