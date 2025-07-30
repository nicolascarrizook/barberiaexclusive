import React from 'react';
// // // // // import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
// // // // // import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
// // // // // import { VacationRequestForm } from './VacationRequestForm'
// // // // // import { VacationApprovalPanel } from './VacationApprovalPanel'
// // // // // import { useAuth } from '@/hooks/useAuth'

/**
 * Componente de ejemplo que muestra cómo usar los componentes de vacaciones
 * según el rol del usuario autenticado.
 */
export function VacationExample() {
  const { user, isBarber, isAdmin, isOwner } = useAuth();

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Vacaciones</CardTitle>
          <CardDescription>
            Debes iniciar sesión para acceder a esta funcionalidad.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Si es barbero, solo mostrar el formulario de solicitud
  if (isBarber) {
    return (
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Solicitar Vacaciones</h1>
          <p className="text-muted-foreground">
            Gestiona tus solicitudes de días libres
          </p>
        </div>
        <VacationRequestForm />
      </div>
    );
  }

  // Si es admin u owner, mostrar ambas pestañas
  if (isAdmin || isOwner) {
    return (
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Gestión de Vacaciones</h1>
          <p className="text-muted-foreground">
            Administra las solicitudes de vacaciones del equipo
          </p>
        </div>

        <Tabs defaultValue="approval" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="approval">Panel de Aprobación</TabsTrigger>
            <TabsTrigger value="request">Solicitar Vacaciones</TabsTrigger>
          </TabsList>

          <TabsContent value="approval" className="space-y-6">
            <VacationApprovalPanel />
          </TabsContent>

          <TabsContent value="request" className="space-y-6">
            <VacationRequestForm />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Para otros roles, mostrar mensaje de acceso restringido
  return (
    <Card>
      <CardHeader>
        <CardTitle>Acceso Restringido</CardTitle>
        <CardDescription>
          No tienes permisos para acceder a la gestión de vacaciones.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
