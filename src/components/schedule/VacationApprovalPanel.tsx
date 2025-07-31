import React, { useState, useEffect, useMemo } from 'react'
import { format, differenceInDays, isAfter } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Calendar,
  Check,
  X,
  AlertCircle,
  Filter,
  User,
  MessageSquare,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

import { useAuth } from '@/hooks/useAuth'
import { useTimeOff } from '@/hooks/useTimeOff'
import { TimeOffWithBarber, TimeOffStatus } from '@/services/time-off.service'

interface ApprovalDialogProps {
  request: TimeOffWithBarber | null
  type: 'approve' | 'reject' | null
  onClose: () => void
  onConfirm: (notes: string) => void
  submitting: boolean
}

function ApprovalDialog({ request, type, onClose, onConfirm, submitting }: ApprovalDialogProps) {
  const [notes, setNotes] = useState('')

  if (!request || !type) return null

  const isApprove = type === 'approve'
  const title = isApprove ? 'Aprobar Solicitud' : 'Rechazar Solicitud'
  const description = isApprove
    ? '¿Estás seguro de que deseas aprobar esta solicitud de vacaciones?'
    : 'Por favor proporciona una razón para rechazar esta solicitud.'

  return (
    <Dialog open={!!request && !!type} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumen de la solicitud */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{request.barber.profile.full_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {format(new Date(request.start_date), "d 'de' MMMM", { locale: es })} -{' '}
                {format(new Date(request.end_date), "d 'de' MMMM, yyyy", { locale: es })}
              </span>
            </div>
          </div>

          {/* Campo de notas/razón */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              {isApprove ? 'Notas (opcional)' : 'Razón del rechazo *'}
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                isApprove
                  ? 'Agregar notas adicionales...'
                  : 'Explica por qué se rechaza la solicitud...'
              }
              required={!isApprove}
              disabled={submitting}
              className="min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            variant={isApprove ? 'default' : 'destructive'}
            onClick={() => onConfirm(notes)}
            disabled={submitting || (!isApprove && !notes.trim())}
          >
            {submitting ? (
              <>
                <Clock className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                {isApprove ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <X className="mr-2 h-4 w-4" />
                )}
                {isApprove ? 'Aprobar' : 'Rechazar'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function VacationApprovalPanel() {
  const { user } = useAuth()
  const {
    loading,
    submitting,
    requests,
    getRequests,
    approveRequest,
    rejectRequest,
    getAffectedAppointments,
    calculateWorkingDays,
  } = useTimeOff()

  const [statusFilter, setStatusFilter] = useState<TimeOffStatus | 'all'>('pending')
  const [selectedRequest, setSelectedRequest] = useState<TimeOffWithBarber | null>(null)
  const [dialogType, setDialogType] = useState<'approve' | 'reject' | null>(null)
  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set())
  const [affectedAppointmentsMap, setAffectedAppointmentsMap] = useState<Record<string, number>>({})

  // Cargar solicitudes al montar el componente
  useEffect(() => {
    const filters = statusFilter === 'all' ? {} : { status: statusFilter }
    getRequests(filters)
  }, [statusFilter, getRequests])

  // Cargar citas afectadas para solicitudes pendientes
  useEffect(() => {
    const loadAffectedAppointments = async () => {
      const pendingRequests = requests.filter(r => r.status === 'pending')
      const appointmentsMap: Record<string, number> = {}

      for (const request of pendingRequests) {
        const count = await getAffectedAppointments(
          request.barber_id,
          request.start_date,
          request.end_date
        )
        appointmentsMap[request.id] = count
      }

      setAffectedAppointmentsMap(appointmentsMap)
    }

    if (requests.length > 0) {
      loadAffectedAppointments()
    }
  }, [requests, getAffectedAppointments])

  // Filtrar solicitudes según el estado seleccionado
  const filteredRequests = useMemo(() => {
    if (statusFilter === 'all') return requests
    return requests.filter(r => r.status === statusFilter)
  }, [requests, statusFilter])

  // Agrupar solicitudes por estado para estadísticas
  const stats = useMemo(() => {
    return {
      pending: requests.filter(r => r.status === 'pending').length,
      approved: requests.filter(r => r.status === 'approved').length,
      rejected: requests.filter(r => r.status === 'rejected').length,
      total: requests.length,
    }
  }, [requests])

  const handleApprove = (request: TimeOffWithBarber) => {
    setSelectedRequest(request)
    setDialogType('approve')
  }

  const handleReject = (request: TimeOffWithBarber) => {
    setSelectedRequest(request)
    setDialogType('reject')
  }

  const handleConfirm = async (notes: string) => {
    if (!selectedRequest || !dialogType) return

    try {
      if (dialogType === 'approve') {
        await approveRequest(selectedRequest.id, notes || undefined)
      } else {
        await rejectRequest(selectedRequest.id, notes)
      }

      // Recargar solicitudes
      const filters = statusFilter === 'all' ? {} : { status: statusFilter }
      await getRequests(filters)

      // Cerrar diálogo
      setSelectedRequest(null)
      setDialogType(null)
    } catch (error) {
      // El error ya se maneja en el hook
    }
  }

  const toggleRequestExpansion = (requestId: string) => {
    const newExpanded = new Set(expandedRequests)
    if (newExpanded.has(requestId)) {
      newExpanded.delete(requestId)
    } else {
      newExpanded.add(requestId)
    }
    setExpandedRequests(newExpanded)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      pending: { variant: "secondary", label: "Pendiente" },
      approved: { variant: "default", label: "Aprobada" },
      rejected: { variant: "destructive", label: "Rechazada" },
      cancelled: { variant: "outline", label: "Cancelada" },
    }

    const { variant, label } = variants[status] || variants.pending
    return <Badge variant={variant}>{label}</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Solicitudes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Aprobadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rechazadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Panel principal */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Solicitudes de Vacaciones</CardTitle>
              <CardDescription>
                Gestiona las solicitudes de vacaciones del equipo
              </CardDescription>
            </div>

            {/* Filtro de estado */}
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="approved">Aprobadas</SelectItem>
                <SelectItem value="rejected">Rechazadas</SelectItem>
                <SelectItem value="cancelled">Canceladas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No hay solicitudes {statusFilter !== 'all' && `${statusFilter === 'pending' ? 'pendientes' : ''}`}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => {
                const startDate = new Date(request.start_date)
                const endDate = new Date(request.end_date)
                const days = calculateWorkingDays(startDate, endDate)
                const totalDays = differenceInDays(endDate, startDate) + 1
                const isExpanded = expandedRequests.has(request.id)
                const affectedCount = affectedAppointmentsMap[request.id] || 0

                return (
                  <Card key={request.id} className="overflow-hidden">
                    <Collapsible
                      open={isExpanded}
                      onOpenChange={() => toggleRequestExpansion(request.id)}
                    >
                      <div className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-3">
                            {/* Encabezado */}
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={request.barber.profile.avatar_url || undefined} />
                                <AvatarFallback>
                                  {request.barber.profile.full_name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{request.barber.profile.full_name}</p>
                                <p className="text-sm text-muted-foreground">{request.barber.display_name}</p>
                              </div>
                              {getStatusBadge(request.status)}
                            </div>

                            {/* Información principal */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">
                                  {format(startDate, "d 'de' MMM", { locale: es })} -{' '}
                                  {format(endDate, "d 'de' MMM, yyyy", { locale: es })}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">
                                  {days} días laborables ({totalDays} totales)
                                </span>
                              </div>
                              {request.status === 'pending' && affectedCount > 0 && (
                                <div className="flex items-center gap-2">
                                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                                  <span className="text-sm text-yellow-600">
                                    {affectedCount} citas afectadas
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Motivo */}
                            <div className="bg-muted p-3 rounded-lg">
                              <p className="text-sm">
                                <span className="font-medium">Motivo:</span> {request.reason}
                              </p>
                            </div>
                          </div>

                          {/* Acciones */}
                          <div className="flex items-center gap-2 ml-4">
                            {request.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReject(request)}
                                  disabled={submitting}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleApprove(request)}
                                  disabled={submitting}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm">
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                          </div>
                        </div>
                      </div>

                      {/* Contenido expandible */}
                      <CollapsibleContent>
                        <Separator />
                        <div className="p-6 pt-4 space-y-4">
                          {/* Notas adicionales */}
                          {request.notes && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Notas adicionales</h4>
                              <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                                {request.notes}
                              </p>
                            </div>
                          )}

                          {/* Información de aprobación/rechazo */}
                          {request.approved_by && request.approved_at && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">
                                {request.status === 'approved' ? 'Aprobación' : 'Rechazo'}
                              </h4>
                              <div className="space-y-1 text-sm text-muted-foreground">
                                <p>
                                  Por: {request.approved_by} • {' '}
                                  {format(new Date(request.approved_at), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                                </p>
                                {request.approval_notes && (
                                  <p className="bg-muted p-3 rounded-lg mt-2">
                                    {request.approval_notes}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Información de solicitud */}
                          <div>
                            <h4 className="text-sm font-medium mb-2">Información de solicitud</h4>
                            <p className="text-sm text-muted-foreground">
                              Solicitado el {format(new Date(request.created_at), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                            </p>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de aprobación/rechazo */}
      <ApprovalDialog
        request={selectedRequest}
        type={dialogType}
        onClose={() => {
          setSelectedRequest(null)
          setDialogType(null)
        }}
        onConfirm={handleConfirm}
        submitting={submitting}
      />
    </div>
  )
}