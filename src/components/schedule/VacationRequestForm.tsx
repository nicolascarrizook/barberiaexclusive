import React, { useState, useEffect } from 'react'
// // // // // import { format, addDays, isAfter, isBefore } from 'date-fns'
// // // // // import { es } from 'date-fns/locale'
// // // // // import { DateRange } from 'react-day-picker'
// // // // // import { CalendarDays, AlertCircle, Clock, Send, X } from 'lucide-react'

// // // // // import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
// // // // // import { Button } from '@/components/ui/button'
// // // // // import { Textarea } from '@/components/ui/textarea'
// // // // // import { Label } from '@/components/ui/label'
// // // // // import { Alert, AlertDescription } from '@/components/ui/alert'
// // // // // import { Badge } from '@/components/ui/badge'
// // // // // import { Separator } from '@/components/ui/separator'
// // // // // import { DateRangePicker } from '@/components/ui/date-range-picker'
// // // // // import { Skeleton } from '@/components/ui/skeleton'
// // // // // import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// // // // // import { useAuth } from '@/hooks/useAuth'
// // // // // import { useTimeOff } from '@/hooks/useTimeOff'
// // // // // import { TimeOffWithBarber } from '@/services/time-off.service'

export function VacationRequestForm() {
  const { user } = useAuth()
  const {
    loading,
    submitting,
    requests,
    requestTimeOff,
    getRequests,
    cancelRequest,
    checkConflicts,
    getAffectedAppointments,
    calculateWorkingDays,
  } = useTimeOff()

  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [workingDays, setWorkingDays] = useState(0)
  const [affectedAppointments, setAffectedAppointments] = useState(0)
  const [hasConflict, setHasConflict] = useState(false)
  const [checkingConflict, setCheckingConflict] = useState(false)

  // Cargar historial de solicitudes al montar el componente
  useEffect(() => {
    if (user?.id) {
      getRequests({ barber_id: user.id })
    }
  }, [user?.id, getRequests])

  // Verificar conflictos y calcular días cuando cambian las fechas
  useEffect(() => {
    const _checkDateRange = async () => {
      if (!dateRange?.from || !dateRange?.to || !user?.id) return

      setCheckingConflict(true)
      
      // Calcular días laborables
      const _days = calculateWorkingDays(dateRange.from, dateRange.to)
      setWorkingDays(days)

      // Verificar conflictos
      const _startDate = format(dateRange.from, 'yyyy-MM-dd')
      const _endDate = format(dateRange.to, 'yyyy-MM-dd')
      
      const [conflict, appointments] = await Promise.all([
        checkConflicts(user.id, startDate, endDate),
        getAffectedAppointments(user.id, startDate, endDate)
      ])

      setHasConflict(conflict)
      setAffectedAppointments(appointments)
      setCheckingConflict(false)
    }

    checkDateRange()
  }, [dateRange, user?.id, checkConflicts, getAffectedAppointments, calculateWorkingDays])

  const _handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!dateRange?.from || !dateRange?.to || !user?.id || !reason.trim()) {
      return
    }

    if (hasConflict) {
      return
    }

    try {
      await requestTimeOff({
        barber_id: user.id,
        start_date: format(dateRange.from, 'yyyy-MM-dd'),
        end_date: format(dateRange.to, 'yyyy-MM-dd'),
        reason: reason.trim(),
        notes: notes.trim() || undefined,
      })

      // Limpiar formulario
      setDateRange(undefined)
      setReason('')
      setNotes('')
      setWorkingDays(0)
      setAffectedAppointments(0)

      // Recargar solicitudes
      await getRequests({ barber_id: user.id })
    } catch (error) {
      // El error ya se maneja en el hook
    }
  }

  const _handleCancel = async (requestId: string) => {
    if (!user?.id) return
    
    try {
      await cancelRequest(requestId)
      await getRequests({ barber_id: user.id })
    } catch (error) {
      // El error ya se maneja en el hook
    }
  }

  const _getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      pending: { variant: "secondary", label: "Pendiente" },
      approved: { variant: "default", label: "Aprobada" },
      rejected: { variant: "destructive", label: "Rechazada" },
      cancelled: { variant: "outline", label: "Cancelada" },
    }

    const { variant, label } = variants[status] || variants.pending
    return <Badge variant={variant}>{label}</Badge>
  }

  const _canCancelRequest = (request: TimeOffWithBarber) => {
    const _today = new Date()
    today.setHours(0, 0, 0, 0)
    const _startDate = new Date(request.start_date)
    
    return (
      (request.status === 'pending' || request.status === 'approved') &&
      isAfter(startDate, today)
    )
  }

  return (
    <div className="space-y-6">
      {/* Formulario de solicitud */}
      <Card>
        <CardHeader>
          <CardTitle>Solicitar Vacaciones</CardTitle>
          <CardDescription>
            Completa el formulario para solicitar días de vacaciones. Las solicitudes deben ser aprobadas por un administrador.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Selector de fechas */}
            <div className="space-y-2">
              <Label htmlFor="date-range">Período de vacaciones *</Label>
              <DateRangePicker
                date={dateRange}
                onDateChange={setDateRange}
                disabled={submitting}
                placeholder="Selecciona las fechas de inicio y fin"
                minDate={new Date()} // Mínimo hoy
                maxDate={addDays(new Date(), 365)} // Máximo 1 año
              />
            </div>

            {/* Vista previa de días */}
            {dateRange?.from && dateRange?.to && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Alert>
                  <CalendarDays className="h-4 w-4" />
                  <AlertDescription>
                    <span className="font-medium">{workingDays}</span> días laborables
                  </AlertDescription>
                </Alert>

                {checkingConflict ? (
                  <Skeleton className="h-[60px]" />
                ) : affectedAppointments > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <span className="font-medium">{affectedAppointments}</span> citas afectadas
                    </AlertDescription>
                  </Alert>
                )}

                {hasConflict && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Conflicto con vacaciones existentes
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Motivo */}
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo *</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ej: Vacaciones familiares, asuntos personales, etc."
                required
                disabled={submitting}
                className="min-h-[80px]"
              />
            </div>

            {/* Notas adicionales */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notas adicionales (opcional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Información adicional que consideres relevante"
                disabled={submitting}
                className="min-h-[60px]"
              />
            </div>

            {/* Botón de envío */}
            <Button
              type="submit"
              disabled={
                submitting ||
                !dateRange?.from ||
                !dateRange?.to ||
                !reason.trim() ||
                hasConflict ||
                checkingConflict
              }
              className="w-full"
            >
              {submitting ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Enviando solicitud...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar solicitud
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Historial de solicitudes */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Solicitudes</CardTitle>
          <CardDescription>
            Revisa el estado de tus solicitudes anteriores de vacaciones
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No tienes solicitudes de vacaciones registradas
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Período</TableHead>
                    <TableHead>Días</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha solicitud</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => {
                    const _startDate = new Date(request.start_date)
                    const _endDate = new Date(request.end_date)
                    const _days = calculateWorkingDays(startDate, endDate)

                    return (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="font-medium">
                            {format(startDate, "d 'de' MMM", { locale: es })} -{' '}
                            {format(endDate, "d 'de' MMM, yyyy", { locale: es })}
                          </div>
                        </TableCell>
                        <TableCell>{days} días</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {request.reason}
                        </TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>
                          {format(new Date(request.created_at), "d 'de' MMM, yyyy", { locale: es })}
                        </TableCell>
                        <TableCell className="text-right">
                          {canCancelRequest(request) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancel(request.id)}
                              disabled={submitting}
                            >
                              <X className="h-4 w-4" />
                              <span className="sr-only">Cancelar solicitud</span>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}