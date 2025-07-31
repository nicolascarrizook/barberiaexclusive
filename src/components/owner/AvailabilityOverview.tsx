import React, { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  Users, 
  Clock, 
  Activity,
  Filter,
  Download,
  RefreshCw,
  Eye,
  BarChart3
} from 'lucide-react'
import { 
  availabilityService, 
  AvailabilityHeatmapData,
  OverviewStats 
} from '@/services/availability.service'
import { useAuth } from '@/hooks/useAuth'

interface AvailabilityOverviewProps {
  barbershopId: string
}

interface BarberStatus {
  id: string
  name: string
  status: 'available' | 'busy' | 'break' | 'offline'
  next_appointment?: string
  current_utilization: number
}

type ViewMode = 'day' | 'week' | 'month'

const AvailabilityOverview: React.FC<AvailabilityOverviewProps> = ({
  barbershopId,
}) => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [heatmapData, setHeatmapData] = useState<AvailabilityHeatmapData[]>([])
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null)
  const [barberStatuses, setBarberStatuses] = useState<BarberStatus[]>([])
  const [selectedBarber, setSelectedBarber] = useState<string>('all')
  const [selectedService, setSelectedService] = useState<string>('all')

  // Datos mock para barberos (en implementación real vendría de la base de datos)
  const mockBarbers: BarberStatus[] = [
    {
      id: '1',
      name: 'Carlos Mendoza',
      status: 'busy',
      next_appointment: '14:30',
      current_utilization: 85,
    },
    {
      id: '2',
      name: 'Ana García',
      status: 'available',
      next_appointment: '15:00',
      current_utilization: 60,
    },
    {
      id: '3',
      name: 'Luis Rodríguez',
      status: 'break',
      next_appointment: '16:00',
      current_utilization: 70,
    },
  ]

  useEffect(() => {
    loadOverviewData()
  }, [barbershopId, viewMode, currentDate])

  const loadOverviewData = async () => {
    setLoading(true)
    try {
      const { startDate, endDate } = getDateRange()
      
      const [heatmap, stats] = await Promise.all([
        availabilityService.getAvailabilityHeatmap(barbershopId, startDate, endDate),
        availabilityService.getOverviewStats(barbershopId, startDate, endDate),
      ])

      setHeatmapData(heatmap)
      setOverviewStats(stats)
      setBarberStatuses(mockBarbers) // En implementación real, cargar desde BD
    } catch (error) {
      console.error('Error cargando datos de disponibilidad:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDateRange = () => {
    const start = new Date(currentDate)
    const end = new Date(currentDate)

    switch (viewMode) {
      case 'day':
        break
      case 'week':
        const startOfWeek = start.getDate() - start.getDay()
        start.setDate(startOfWeek)
        end.setDate(startOfWeek + 6)
        break
      case 'month':
        start.setDate(1)
        end.setMonth(end.getMonth() + 1)
        end.setDate(0)
        break
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    }
  }

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    
    switch (viewMode) {
      case 'day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
        break
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
        break
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
        break
    }
    
    setCurrentDate(newDate)
  }

  const getAvailabilityColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-green-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-orange-500'
      case 'full': return 'bg-red-500'
      default: return 'bg-gray-300'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800 border-green-200'
      case 'busy': return 'bg-red-100 text-red-800 border-red-200'
      case 'break': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'offline': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available': return 'Disponible'
      case 'busy': return 'Ocupado'
      case 'break': return 'Descanso'
      case 'offline': return 'Fuera de línea'
      default: return 'Desconocido'
    }
  }

  const formatDateRange = () => {
    const { startDate, endDate } = getDateRange()
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    if (viewMode === 'day') {
      return start.toLocaleDateString('es-ES', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    }
    
    return `${start.toLocaleDateString('es-ES')} - ${end.toLocaleDateString('es-ES')}`
  }

  // Agrupar datos del heatmap por fecha para la visualización
  const groupedHeatmapData = heatmapData.reduce((acc, item) => {
    if (!acc[item.date]) {
      acc[item.date] = []
    }
    acc[item.date].push(item)
    return acc
  }, {} as Record<string, AvailabilityHeatmapData[]>)

  const hours = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00']

  if (loading && !overviewStats) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          <span>Cargando vista de disponibilidad...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Encabezado con controles */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Vista de Disponibilidad
              </CardTitle>
              <CardDescription>
                Monitoreo en tiempo real de la disponibilidad y ocupación
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => loadOverviewData()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {/* Selector de vista */}
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'day' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('day')}
              >
                Día
              </Button>
              <Button
                variant={viewMode === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('week')}
              >
                Semana
              </Button>
              <Button
                variant={viewMode === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('month')}
              >
                Mes
              </Button>
            </div>

            {/* Navegación de fechas */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm font-medium min-w-0 flex-1 text-center sm:text-left">
                {formatDateRange()}
              </div>
              <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Filtros */}
            <div className="flex items-center gap-2">
              <Select value={selectedBarber} onValueChange={setSelectedBarber}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Barbero" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {barberStatuses.map((barber) => (
                    <SelectItem key={barber.id} value={barber.id}>
                      {barber.name.split(' ')[0]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Servicio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="corte">Corte</SelectItem>
                  <SelectItem value="barba">Barba</SelectItem>
                  <SelectItem value="combo">Combo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas clave */}
      {overviewStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {overviewStats.total_appointments}
                  </p>
                  <p className="text-sm text-gray-600">Citas Totales</p>
                </div>
                <CalendarDays className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {overviewStats.available_slots}
                  </p>
                  <p className="text-sm text-gray-600">Slots Libres</p>
                </div>
                <Clock className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {overviewStats.occupancy_rate}%
                  </p>
                  <p className="text-sm text-gray-600">Ocupación</p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {overviewStats.peak_hours.join(', ')}
                  </p>
                  <p className="text-sm text-gray-600">Horas Pico</p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Contenido principal con tabs */}
      <Tabs defaultValue="heatmap" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="heatmap">Heatmap de Disponibilidad</TabsTrigger>
          <TabsTrigger value="barbers">Estado de Barberos</TabsTrigger>
          <TabsTrigger value="analytics">Análisis</TabsTrigger>
        </TabsList>

        <TabsContent value="heatmap" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Mapa de Calor - Disponibilidad</CardTitle>
              <CardDescription>
                Visualización de la disponibilidad por día y hora
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Leyenda */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-green-500"></div>
                    <span>Alta disponibilidad</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-yellow-500"></div>
                    <span>Media</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-orange-500"></div>
                    <span>Baja</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-red-500"></div>
                    <span>Completo</span>
                  </div>
                </div>

                {/* Heatmap */}
                <div className="overflow-x-auto">
                  <div className="min-w-full">
                    <div className="grid grid-cols-13 gap-1 text-xs">
                      {/* Encabezado de horas */}
                      <div></div> {/* Espacio para las fechas */}
                      {hours.map((hour) => (
                        <div key={hour} className="text-center font-medium p-2">
                          {hour}
                        </div>
                      ))}

                      {/* Filas de datos */}
                      {Object.entries(groupedHeatmapData).map(([date, dayData]) => (
                        <React.Fragment key={date}>
                          <div className="text-right font-medium p-2">
                            {new Date(date).toLocaleDateString('es-ES', { 
                              day: '2-digit', 
                              month: '2-digit' 
                            })}
                          </div>
                          {hours.map((hour) => {
                            const hourData = dayData.find(d => d.hour === hour)
                            const level = hourData?.availability_level || 'high'
                            const bookings = hourData?.bookings || 0
                            const capacity = hourData?.capacity || 0
                            
                            return (
                              <div
                                key={`${date}-${hour}`}
                                className={`
                                  h-8 rounded cursor-pointer transition-all hover:scale-105
                                  ${getAvailabilityColor(level)}
                                  flex items-center justify-center text-white text-xs
                                `}
                                title={`${date} ${hour}\nReservas: ${bookings}/${capacity}\nNivel: ${level}`}
                              >
                                {bookings > 0 && bookings}
                              </div>
                            )
                          })}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="barbers" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lista de barberos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Estado en Tiempo Real
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {barberStatuses.map((barber) => (
                  <div
                    key={barber.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {barber.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{barber.name}</div>
                        <Badge className={getStatusColor(barber.status)} variant="outline">
                          {getStatusLabel(barber.status)}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-medium">{barber.current_utilization}%</div>
                      <div className="text-gray-600">
                        {barber.next_appointment ? `Próxima: ${barber.next_appointment}` : 'Sin citas'}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Gráfico de ocupación por horas */}
            <Card>
              <CardHeader>
                <CardTitle>Ocupación por Horas</CardTitle>
                <CardDescription>
                  Promedio de ocupación a lo largo del día
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {hours.map((hour) => {
                    // Calcular ocupación promedio para esta hora
                    const hourData = heatmapData.filter(d => d.hour === hour)
                    const avgOccupancy = hourData.length > 0 
                      ? (hourData.reduce((sum, d) => sum + (d.bookings / Math.max(d.capacity, 1)), 0) / hourData.length) * 100
                      : 0
                    
                    return (
                      <div key={hour} className="flex items-center gap-3">
                        <div className="w-12 text-sm font-mono">{hour}</div>
                        <div className="flex-1 bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-blue-500 h-3 rounded-full transition-all"
                            style={{ width: `${Math.min(avgOccupancy, 100)}%` }}
                          ></div>
                        </div>
                        <div className="w-12 text-sm text-right">
                          {Math.round(avgOccupancy)}%
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Barberos más ocupados */}
            {overviewStats && (
              <Card>
                <CardHeader>
                  <CardTitle>Barberos Más Ocupados</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {overviewStats.busiest_barbers.map((barber, index) => (
                    <div
                      key={barber.barber_id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold
                          ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-500'}
                        `}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{barber.name || 'Sin nombre'}</div>
                          <div className="text-sm text-gray-600">
                            {barber.appointments} citas
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">{barber.availability_rate}%</div>
                        <div className="text-xs text-gray-600">disponibilidad</div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Estadísticas adicionales */}
            <Card>
              <CardHeader>
                <CardTitle>Métricas de Rendimiento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-900">
                      {Math.round((overviewStats?.occupancy_rate || 0) / 10)}
                    </div>
                    <div className="text-sm text-blue-600">Eficiencia</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-900">
                      {barberStatuses.filter(b => b.status === 'available').length}
                    </div>
                    <div className="text-sm text-green-600">Disponibles</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-900">
                      {overviewStats?.peak_hours.length || 0}
                    </div>
                    <div className="text-sm text-orange-600">Picos del día</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-900">
                      {Math.round((overviewStats?.available_slots || 0) / 10)}
                    </div>
                    <div className="text-sm text-purple-600">Capacidad libre</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AvailabilityOverview