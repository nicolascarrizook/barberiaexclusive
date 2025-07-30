import React, { useState, useEffect } from 'react'
// // // // // import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
// // // // // import { Button } from '@/components/ui/button'
// // // // // import { Input } from '@/components/ui/input'
// // // // // import { Label } from '@/components/ui/label'
// // // // // import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
// // // // // import { Switch } from '@/components/ui/switch'
// // // // // import { Alert, AlertDescription } from '@/components/ui/alert'
// // // // // import { Badge } from '@/components/ui/badge'
// // // // // import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
// // // // // import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Users, 
  Settings,
  Save,
  RefreshCw,
  Info
} from 'lucide-react'
// // // // // import { 
  availabilityService, 
  CapacityConfig, 
  PeakHourConfig,
  DayOfWeek 
} from '@/services/availability.service'
// // // // // import { useAuth } from '@/hooks/useAuth'

interface CapacityConfigurationProps {
  barbershopId: string
  onConfigurationChange?: () => void
}

interface SimulationResult {
  current_capacity: number
  new_capacity: number
  impact_percentage: number
  affected_appointments: number
  recommendations: string[]
}

const CapacityConfiguration: React.FC<CapacityConfigurationProps> = ({
  barbershopId,
  onConfigurationChange,
}) => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [capacityConfigs, setCapacityConfigs] = useState<CapacityConfig[]>([])
  const [peakHourConfigs, setPeakHourConfigs] = useState<PeakHourConfig[]>([])
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  // Estados del formulario de capacidad
  const [newCapacityConfig, setNewCapacityConfig] = useState<Partial<CapacityConfig>>({
    barbershop_id: barbershopId,
    time_slot: '09:00',
    max_capacity: 4,
    peak_hour_multiplier: 1.0,
    allow_overbooking: false,
    overbooking_limit: 0,
  })

  // Estados del formulario de horarios pico
  const [newPeakHourConfig, setNewPeakHourConfig] = useState<Partial<PeakHourConfig>>({
    barbershop_id: barbershopId,
    day_of_week: 'monday' as DayOfWeek,
    start_time: '18:00',
    end_time: '20:00',
    multiplier: 1.5,
  })

  const daysOfWeek: { value: DayOfWeek; label: string }[] = [
    { value: 'monday', label: 'Lunes' },
    { value: 'tuesday', label: 'Martes' },
    { value: 'wednesday', label: 'Miércoles' },
    { value: 'thursday', label: 'Jueves' },
    { value: 'friday', label: 'Viernes' },
    { value: 'saturday', label: 'Sábado' },
    { value: 'sunday', label: 'Domingo' },
  ]

  const _timeSlots = Array.from({ length: 12 }, (_, i) => {
    const _hour = i + 9 // De 9 AM a 8 PM
    return `${hour.toString().padStart(2, '0')}:00`
  })

  // Cargar configuraciones existentes
  useEffect(() => {
    loadConfigurations()
  }, [barbershopId])

  const _loadConfigurations = async () => {
    setLoading(true)
    try {
      const [capacity, peakHours] = await Promise.all([
        availabilityService.getCapacityConfig(barbershopId),
        availabilityService.getPeakHourConfig(barbershopId),
      ])
      
      setCapacityConfigs(capacity)
      setPeakHourConfigs(peakHours)
    } catch (error) {
      console.error('Error cargando configuraciones:', error)
    } finally {
      setLoading(false)
    }
  }

  // Simular impacto de cambios
  const _simulateImpact = async () => {
    if (!newCapacityConfig.time_slot || !newCapacityConfig.max_capacity) return

    setLoading(true)
    try {
      const _today = new Date().toISOString().split('T')[0]
      const _result = await availabilityService.simulateCapacityImpact(
        barbershopId,
        today,
        newCapacityConfig as CapacityConfig
      )
      setSimulationResult(result)
      setShowPreview(true)
    } catch (error) {
      console.error('Error simulando impacto:', error)
    } finally {
      setLoading(false)
    }
  }

  // Guardar configuración de capacidad
  const _saveCapacityConfig = async () => {
    if (!newCapacityConfig.time_slot || !newCapacityConfig.max_capacity) return

    setSaving(true)
    try {
      await availabilityService.setCapacityConfig(newCapacityConfig as CapacityConfig)
      await loadConfigurations()
      onConfigurationChange?.()
      
      // Resetear formulario
      setNewCapacityConfig({
        barbershop_id: barbershopId,
        time_slot: '09:00',
        max_capacity: 4,
        peak_hour_multiplier: 1.0,
        allow_overbooking: false,
        overbooking_limit: 0,
      })
      setShowPreview(false)
      setSimulationResult(null)
    } catch (error) {
      console.error('Error guardando configuración:', error)
    } finally {
      setSaving(false)
    }
  }

  // Guardar configuración de horarios pico
  const _savePeakHourConfig = async () => {
    setSaving(true)
    try {
      await availabilityService.setPeakHourConfig(newPeakHourConfig as PeakHourConfig)
      await loadConfigurations()
      onConfigurationChange?.()
      
      // Resetear formulario
      setNewPeakHourConfig({
        barbershop_id: barbershopId,
        day_of_week: 'monday' as DayOfWeek,
        start_time: '18:00',
        end_time: '20:00',
        multiplier: 1.5,
      })
    } catch (error) {
      console.error('Error guardando horario pico:', error)
    } finally {
      setSaving(false)
    }
  }

  const _getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-green-100 text-green-800 border-green-200'
    }
  }

  const _getImpactIcon = (percentage: number) => {
    if (percentage > 0) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (percentage < 0) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <Clock className="h-4 w-4 text-gray-600" />
  }

  if (loading && capacityConfigs.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          <span>Cargando configuración...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Control de Capacidad y Overbooking
          </CardTitle>
          <CardDescription>
            Configure límites de capacidad por franja horaria y prevención de overbooking
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="capacity" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="capacity">Configuración de Capacidad</TabsTrigger>
          <TabsTrigger value="peak-hours">Horarios Pico</TabsTrigger>
          <TabsTrigger value="overview">Vista General</TabsTrigger>
        </TabsList>

        <TabsContent value="capacity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Nueva Configuración de Capacidad</CardTitle>
              <CardDescription>
                Configure la capacidad máxima para franjas horarias específicas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="time-slot">Franja Horaria</Label>
                  <Select
                    value={newCapacityConfig.time_slot}
                    onValueChange={(value) =>
                      setNewCapacityConfig({ ...newCapacityConfig, time_slot: value })
                    }
                  >
                    <SelectTrigger id="time-slot">
                      <SelectValue placeholder="Seleccionar hora" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((slot) => (
                        <SelectItem key={slot} value={slot}>
                          {slot}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-capacity">Capacidad Máxima</Label>
                  <Input
                    id="max-capacity"
                    type="number"
                    min="1"
                    max="50"
                    value={newCapacityConfig.max_capacity}
                    onChange={(e) =>
                      setNewCapacityConfig({
                        ...newCapacityConfig,
                        max_capacity: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="peak-multiplier">Multiplicador Hora Pico</Label>
                  <Input
                    id="peak-multiplier"
                    type="number"
                    min="1"
                    max="3"
                    step="0.1"
                    value={newCapacityConfig.peak_hour_multiplier}
                    onChange={(e) =>
                      setNewCapacityConfig({
                        ...newCapacityConfig,
                        peak_hour_multiplier: parseFloat(e.target.value) || 1.0,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="overbooking-limit">Límite Overbooking</Label>
                  <Input
                    id="overbooking-limit"
                    type="number"
                    min="0"
                    max="10"
                    value={newCapacityConfig.overbooking_limit}
                    onChange={(e) =>
                      setNewCapacityConfig({
                        ...newCapacityConfig,
                        overbooking_limit: parseInt(e.target.value) || 0,
                      })
                    }
                    disabled={!newCapacityConfig.allow_overbooking}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="allow-overbooking"
                  checked={newCapacityConfig.allow_overbooking}
                  onCheckedChange={(checked) =>
                    setNewCapacityConfig({
                      ...newCapacityConfig,
                      allow_overbooking: checked,
                      overbooking_limit: checked ? newCapacityConfig.overbooking_limit : 0,
                    })
                  }
                />
                <Label htmlFor="allow-overbooking">Permitir Overbooking</Label>
              </div>

              <div className="flex gap-2">
                <Button onClick={simulateImpact} variant="outline" disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Simular Impacto
                </Button>
                <Button onClick={saveCapacityConfig} disabled={saving || !showPreview}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Guardando...' : 'Guardar Configuración'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Vista previa de simulación */}
          {showPreview && simulationResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Vista Previa del Impacto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">
                      {simulationResult.current_capacity}
                    </div>
                    <div className="text-sm text-gray-600">Capacidad Actual</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-900">
                      {simulationResult.new_capacity}
                    </div>
                    <div className="text-sm text-blue-600">Nueva Capacidad</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center justify-center gap-1">
                      {getImpactIcon(simulationResult.impact_percentage)}
                      <span className="text-2xl font-bold text-gray-900">
                        {simulationResult.impact_percentage > 0 ? '+' : ''}
                        {simulationResult.impact_percentage}%
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">Impacto</div>
                  </div>
                </div>

                {simulationResult.recommendations.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <div className="font-medium">Recomendaciones:</div>
                        <ul className="list-disc list-inside space-y-1">
                          {simulationResult.recommendations.map((rec, index) => (
                            <li key={index} className="text-sm">{rec}</li>
                          ))}
                        </ul>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Configuraciones existentes */}
          {capacityConfigs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Configuraciones Actuales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {capacityConfigs.map((config, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <Clock className="h-5 w-5 text-gray-500" />
                        <div>
                          <div className="font-medium">{config.time_slot}</div>
                          <div className="text-sm text-gray-600">
                            Capacidad: {config.max_capacity} | 
                            Multiplicador: {config.peak_hour_multiplier}x
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {config.allow_overbooking && (
                          <Badge variant="outline">
                            Overbooking: {config.overbooking_limit}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="peak-hours" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configurar Horarios Pico</CardTitle>
              <CardDescription>
                Defina horarios con alta demanda y sus multiplicadores de capacidad
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="day-of-week">Día de la Semana</Label>
                  <Select
                    value={newPeakHourConfig.day_of_week}
                    onValueChange={(value: DayOfWeek) =>
                      setNewPeakHourConfig({ ...newPeakHourConfig, day_of_week: value })
                    }
                  >
                    <SelectTrigger id="day-of-week">
                      <SelectValue placeholder="Seleccionar día" />
                    </SelectTrigger>
                    <SelectContent>
                      {daysOfWeek.map((day) => (
                        <SelectItem key={day.value} value={day.value}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="multiplier">Multiplicador</Label>
                  <Input
                    id="multiplier"
                    type="number"
                    min="1"
                    max="3"
                    step="0.1"
                    value={newPeakHourConfig.multiplier}
                    onChange={(e) =>
                      setNewPeakHourConfig({
                        ...newPeakHourConfig,
                        multiplier: parseFloat(e.target.value) || 1.0,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="start-time">Hora Inicio</Label>
                  <Select
                    value={newPeakHourConfig.start_time}
                    onValueChange={(value) =>
                      setNewPeakHourConfig({ ...newPeakHourConfig, start_time: value })
                    }
                  >
                    <SelectTrigger id="start-time">
                      <SelectValue placeholder="Hora inicio" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((slot) => (
                        <SelectItem key={slot} value={slot}>
                          {slot}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end-time">Hora Fin</Label>
                  <Select
                    value={newPeakHourConfig.end_time}
                    onValueChange={(value) =>
                      setNewPeakHourConfig({ ...newPeakHourConfig, end_time: value })
                    }
                  >
                    <SelectTrigger id="end-time">
                      <SelectValue placeholder="Hora fin" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((slot) => (
                        <SelectItem key={slot} value={slot}>
                          {slot}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={savePeakHourConfig} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Guardando...' : 'Guardar Horario Pico'}
              </Button>
            </CardContent>
          </Card>

          {/* Horarios pico existentes */}
          {peakHourConfigs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Horarios Pico Configurados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {peakHourConfigs.map((config, index) => {
                    const _dayLabel = daysOfWeek.find(d => d.value === config.day_of_week)?.label
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <TrendingUp className="h-5 w-5 text-orange-500" />
                          <div>
                            <div className="font-medium">{dayLabel}</div>
                            <div className="text-sm text-gray-600">
                              {config.start_time} - {config.end_time}
                            </div>
                          </div>
                        </div>
                        <Badge variant="secondary">
                          {config.multiplier}x
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Resumen de Configuración
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Franjas configuradas:</span>
                    <span className="font-medium">{capacityConfigs.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Horarios pico:</span>
                    <span className="font-medium">{peakHourConfigs.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Overbooking habilitado:</span>
                    <span className="font-medium">
                      {capacityConfigs.some(c => c.allow_overbooking) ? 'Sí' : 'No'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Alertas de Configuración</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {capacityConfigs.length === 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        No hay configuraciones de capacidad definidas
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {peakHourConfigs.length === 0 && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Configure horarios pico para optimizar la capacidad
                      </AlertDescription>
                    </Alert>
                  )}

                  {capacityConfigs.some(c => c.allow_overbooking && !peakHourConfigs.length) && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Overbooking habilitado sin horarios pico configurados
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default CapacityConfiguration