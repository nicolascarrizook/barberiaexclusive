import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Calendar, 
  Search, 
  Filter, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  Download,
  RefreshCw,
  Clock,
  DollarSign,
  Users,
  LayoutGrid,
  List
} from 'lucide-react';

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

// Components
import { AppointmentCard } from './AppointmentCard';
import { AppointmentFilters } from './AppointmentFilters';
import { AppointmentDetailsModal } from './AppointmentDetailsModal';
import { RescheduleModal } from './RescheduleModal';
import { SendMessageModal } from './SendMessageModal';
import { ExportModal } from './ExportModal';
import { AppointmentCalendar } from './AppointmentCalendar';

// Services
import { appointmentManagementService, type AppointmentListItem, type AppointmentFilters as ServiceFilters } from '@/services/appointment-management.service';

// Types
interface AppointmentsListProps {
  barbershopId: string;
  onAppointmentClick?: (appointment: AppointmentListItem) => void;
  onNewAppointment?: () => void;
}

export function AppointmentsList({ 
  barbershopId, 
  onAppointmentClick,
  onNewAppointment 
}: AppointmentsListProps) {
  // State
  const [appointments, setAppointments] = useState<AppointmentListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // Modals
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentListItem | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Filters
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<ServiceFilters>({
    barbershop_id: barbershopId,
    limit: pageSize,
    offset: 0,
  });

  const { toast } = useToast();

  // Load appointments
  const loadAppointments = async (resetPage = false) => {
    try {
      setIsLoading(true);
      setError(null);

      const currentFilters = {
        ...filters,
        offset: resetPage ? 0 : (currentPage - 1) * pageSize,
      };

      const result = await appointmentManagementService.getAppointments(currentFilters);
      
      setAppointments(result.appointments);
      setTotalCount(result.total_count);
      setHasMore(result.has_more);

      if (resetPage) {
        setCurrentPage(1);
      }
    } catch (err) {
      console.error('❌ Error loading appointments:', err);
      setError(err instanceof Error ? err.message : 'Error loading appointments');
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las citas',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Apply filters
  const applyFilters = (newFilters: Partial<ServiceFilters>) => {
    const updatedFilters = {
      ...filters,
      ...newFilters,
      barbershop_id: barbershopId,
    };
    
    setFilters(updatedFilters);
    
    // Update URL params
    const params = new URLSearchParams();
    if (newFilters.date_from) params.set('from', newFilters.date_from);
    if (newFilters.date_to) params.set('to', newFilters.date_to);
    if (newFilters.barber_id) params.set('barber', newFilters.barber_id);
    if (newFilters.status?.length) params.set('status', newFilters.status.join(','));
    if (newFilters.search) params.set('search', newFilters.search);
    setSearchParams(params);
    
    // Reset to first page
    setCurrentPage(1);
  };

  // Quick status filter
  const handleStatusFilter = (status: string | null) => {
    applyFilters({
      status: status ? [status] : undefined,
    });
  };

  // Search handler
  const handleSearch = (search: string) => {
    applyFilters({ search: search || undefined });
  };

  // Pagination
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (hasMore) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Appointment status update handler
  const handleAppointmentUpdate = (updatedAppointment: AppointmentListItem) => {
    setAppointments(prev => 
      prev.map(apt => 
        apt.id === updatedAppointment.id ? updatedAppointment : apt
      )
    );
  };

  // Handle appointment card click
  const handleAppointmentClick = (appointment: AppointmentListItem) => {
    setSelectedAppointment(appointment);
    setShowDetailsModal(true);
  };

  // Handle reschedule from details modal
  const handleReschedule = () => {
    setShowDetailsModal(false);
    setShowRescheduleModal(true);
  };

  // Handle send message from details modal
  const handleSendMessage = () => {
    setShowDetailsModal(false);
    setShowMessageModal(true);
  };

  // Handle appointment update from modals
  const handleModalAppointmentUpdate = (updatedAppointment: AppointmentListItem) => {
    handleAppointmentUpdate(updatedAppointment);
    setSelectedAppointment(updatedAppointment);
  };

  // Load on mount and filter changes
  useEffect(() => {
    loadAppointments(true);
  }, [filters]);

  // Load on page change
  useEffect(() => {
    if (currentPage > 1) {
      loadAppointments();
    }
  }, [currentPage]);

  // Initialize filters from URL params
  useEffect(() => {
    const urlFilters: Partial<ServiceFilters> = {};
    
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const barber = searchParams.get('barber');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    
    if (from) urlFilters.date_from = from;
    if (to) urlFilters.date_to = to;
    if (barber) urlFilters.barber_id = barber;
    if (status) urlFilters.status = status.split(',');
    if (search) urlFilters.search = search;
    
    if (Object.keys(urlFilters).length > 0) {
      setFilters(prev => ({ ...prev, ...urlFilters }));
    }
  }, [searchParams]);


  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => loadAppointments(true)}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Citas</h1>
          <p className="text-gray-600">
            Gestiona y visualiza todas las citas de tu barbería
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadAppointments(true)}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          
          {onNewAppointment && (
            <Button onClick={onNewAppointment}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Cita
            </Button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold">{totalCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pendientes</p>
                <p className="text-2xl font-bold">
                  {appointments.filter(a => a.status === 'pending').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Confirmadas</p>
                <p className="text-2xl font-bold">
                  {appointments.filter(a => a.status === 'confirmed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Ingresos</p>
                <p className="text-2xl font-bold">
                  ${appointments
                    .filter(a => a.status === 'completed')
                    .reduce((sum, a) => sum + a.total_amount, 0)
                    .toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar por código, cliente o teléfono..."
                  value={filters.search || ''}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            {/* Quick Status Filters */}
            <div className="flex gap-2">
              <Button
                variant={!filters.status ? "default" : "outline"}
                size="sm"
                onClick={() => handleStatusFilter(null)}
              >
                Todas
              </Button>
              <Button
                variant={filters.status?.includes('pending') ? "default" : "outline"}
                size="sm"
                onClick={() => handleStatusFilter('pending')}
              >
                Pendientes
              </Button>
              <Button
                variant={filters.status?.includes('confirmed') ? "default" : "outline"}
                size="sm"
                onClick={() => handleStatusFilter('confirmed')}
              >
                Confirmadas
              </Button>
              <Button
                variant={filters.status?.includes('completed') ? "default" : "outline"}
                size="sm"
                onClick={() => handleStatusFilter('completed')}
              >
                Completadas
              </Button>
            </div>
            
            {/* More Filters Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </Button>
          </div>
          
          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t">
              <AppointmentFilters
                filters={filters}
                onFiltersChange={applyFilters}
                barbershopId={barbershopId}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="list">
              <List className="w-4 h-4 mr-2" />
              Lista
            </TabsTrigger>
            <TabsTrigger value="calendar">
              <LayoutGrid className="w-4 h-4 mr-2" />
              Calendario
            </TabsTrigger>
          </TabsList>

          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowExportModal(true)}
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>

        <TabsContent value="list" className="mt-0">
          {/* Appointments List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Citas ({totalCount})</CardTitle>
                  <CardDescription>
                    {filters.date_from && filters.date_to ? (
                      `Desde ${format(parseISO(filters.date_from), 'dd/MM/yyyy', { locale: es })} hasta ${format(parseISO(filters.date_to), 'dd/MM/yyyy', { locale: es })}`
                    ) : (
                      'Todas las citas'
                    )}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-24 bg-gray-200 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay citas
              </h3>
              <p className="text-gray-600 mb-4">
                No se encontraron citas con los filtros aplicados.
              </p>
              {onNewAppointment && (
                <Button onClick={onNewAppointment}>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear primera cita
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {appointments.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  onClick={() => handleAppointmentClick(appointment)}
                  onStatusUpdate={handleAppointmentUpdate}
                />
              ))}
            </div>
          )}
          
          {/* Pagination */}
          {totalCount > pageSize && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t">
              <div className="text-sm text-gray-600">
                Mostrando {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalCount)} de {totalCount} citas
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </Button>
                
                <span className="text-sm px-3 py-1 bg-gray-100 rounded">
                  {currentPage}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={!hasMore}
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="mt-0">
          {/* Calendar View */}
          <AppointmentCalendar
            barbershopId={barbershopId}
            onAppointmentClick={handleAppointmentClick}
          />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <AppointmentDetailsModal
        appointment={selectedAppointment}
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        onUpdate={handleModalAppointmentUpdate}
      />

      <RescheduleModal
        appointment={selectedAppointment}
        isOpen={showRescheduleModal}
        onClose={() => setShowRescheduleModal(false)}
        onReschedule={(updated) => {
          handleModalAppointmentUpdate(updated);
          setShowRescheduleModal(false);
          toast({
            title: 'Cita reagendada',
            description: 'La cita se reagendó exitosamente',
          });
        }}
      />

      <SendMessageModal
        appointment={selectedAppointment}
        isOpen={showMessageModal}
        onClose={() => setShowMessageModal(false)}
      />

      <ExportModal
        appointments={appointments}
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />
    </div>
  );
}