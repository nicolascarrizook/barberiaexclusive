import React, { useState } from 'react';
// // // // // import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
// // // // // import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
// // // // // import { Settings, Activity } from 'lucide-react'
import CapacityConfiguration from './CapacityConfiguration';
import AvailabilityOverview from './AvailabilityOverview';

interface CapacityManagementProps {
  barbershopId: string;
}

/**
 * Componente principal que integra la gestión de capacidad y vista de disponibilidad
 * Este componente sirve como ejemplo de cómo usar ambos componentes juntos
 */
const CapacityManagement: React.FC<CapacityManagementProps> = ({
  barbershopId,
}) => {
  const [refreshKey, setRefreshKey] = useState(0);

  // Función para refrescar los datos cuando se actualize la configuración
  const _handleConfigurationChange = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Gestión de Capacidad</CardTitle>
          <CardDescription>
            Configure la capacidad máxima, horarios pico y monitoree la
            disponibilidad en tiempo real
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Contenido principal con tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Vista de Disponibilidad
          </TabsTrigger>
          <TabsTrigger
            value="configuration"
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Configuración
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <AvailabilityOverview
            key={`overview-${refreshKey}`}
            barbershopId={barbershopId}
          />
        </TabsContent>

        <TabsContent value="configuration">
          <CapacityConfiguration
            barbershopId={barbershopId}
            onConfigurationChange={handleConfigurationChange}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CapacityManagement;
