import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { type AppointmentListItem } from '@/services/appointment-management.service';

export type ExportFormat = 'csv' | 'excel' | 'json';

interface ExportOptions {
  format: ExportFormat;
  includeCustomerDetails?: boolean;
  includePaymentInfo?: boolean;
  includeNotes?: boolean;
}

/**
 * Convert appointments to CSV format
 */
function appointmentsToCSV(
  appointments: AppointmentListItem[],
  options: ExportOptions
): string {
  const headers = [
    'Código',
    'Fecha',
    'Hora',
    'Estado',
    'Cliente',
    ...(options.includeCustomerDetails ? ['Teléfono', 'Email'] : []),
    'Barbero',
    'Servicios',
    'Duración (min)',
    'Total',
    ...(options.includePaymentInfo ? ['Estado de pago', 'Método de pago'] : []),
    ...(options.includeNotes ? ['Notas', 'Solicitudes del cliente'] : []),
  ];

  const rows = appointments.map(appointment => {
    const date = parseISO(appointment.start_at);
    const services = appointment.services.map(s => s.service.name).join('; ');
    const duration = appointment.services.reduce(
      (sum, s) => sum + s.service.duration_minutes,
      0
    );

    const row = [
      appointment.confirmation_code,
      format(date, 'dd/MM/yyyy', { locale: es }),
      format(date, 'HH:mm'),
      getStatusLabel(appointment.status),
      appointment.customer.full_name,
      ...(options.includeCustomerDetails
        ? [appointment.customer.phone || '', appointment.customer.email || '']
        : []),
      appointment.barber.display_name,
      services,
      duration.toString(),
      `$${appointment.total_amount}`,
      ...(options.includePaymentInfo
        ? [
            getPaymentStatusLabel(appointment.payment_status),
            '', // Payment method would come from payment details
          ]
        : []),
      ...(options.includeNotes
        ? [appointment.notes || '', appointment.customer_requests || '']
        : []),
    ];

    return row;
  });

  // Escape CSV values
  const escapeCSV = (value: string): string => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  // Build CSV content
  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(',')),
  ].join('\n');

  // Add BOM for Excel compatibility with UTF-8
  return '\ufeff' + csvContent;
}

/**
 * Convert appointments to JSON format
 */
function appointmentsToJSON(
  appointments: AppointmentListItem[],
  options: ExportOptions
): string {
  const data = appointments.map(appointment => {
    const date = parseISO(appointment.start_at);
    const duration = appointment.services.reduce(
      (sum, s) => sum + s.service.duration_minutes,
      0
    );

    const exportData: any = {
      codigo_confirmacion: appointment.confirmation_code,
      fecha: format(date, 'yyyy-MM-dd'),
      hora: format(date, 'HH:mm'),
      estado: getStatusLabel(appointment.status),
      cliente: {
        nombre: appointment.customer.full_name,
        ...(options.includeCustomerDetails && {
          telefono: appointment.customer.phone,
          email: appointment.customer.email,
        }),
      },
      barbero: appointment.barber.display_name,
      servicios: appointment.services.map(s => ({
        nombre: s.service.name,
        duracion: s.service.duration_minutes,
        precio: s.service.price,
      })),
      duracion_total: duration,
      total: appointment.total_amount,
      ...(options.includePaymentInfo && {
        pago: {
          estado: getPaymentStatusLabel(appointment.payment_status),
          metodo: null, // Would come from payment details
        },
      }),
      ...(options.includeNotes && {
        notas: appointment.notes,
        solicitudes_cliente: appointment.customer_requests,
      }),
    };

    return exportData;
  });

  return JSON.stringify(data, null, 2);
}

/**
 * Convert appointments to Excel format (as CSV with semicolon separator)
 */
function appointmentsToExcel(
  appointments: AppointmentListItem[],
  options: ExportOptions
): string {
  // For Excel, we'll use semicolon as separator which is more compatible
  const csv = appointmentsToCSV(appointments, options);
  return csv.replace(/,/g, ';');
}

/**
 * Get human-readable status label
 */
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pendiente',
    confirmed: 'Confirmada',
    arrived: 'Cliente llegó',
    in_progress: 'En progreso',
    completed: 'Completada',
    cancelled: 'Cancelada',
    no_show: 'No se presentó',
  };
  return labels[status] || status;
}

/**
 * Get human-readable payment status label
 */
function getPaymentStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pendiente',
    paid: 'Pagado',
    partially_paid: 'Pago parcial',
    refunded: 'Reembolsado',
  };
  return labels[status] || status;
}

/**
 * Generate filename for export
 */
function generateFilename(format: ExportFormat): string {
  const date = format(new Date(), 'yyyy-MM-dd_HH-mm');
  const extension = format === 'excel' ? 'csv' : format;
  return `citas_${date}.${extension}`;
}

/**
 * Download file to user's computer
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Main export function
 */
export async function exportAppointments(
  appointments: AppointmentListItem[],
  options: ExportOptions
): Promise<void> {
  let content: string;
  let mimeType: string;

  switch (options.format) {
    case 'csv':
      content = appointmentsToCSV(appointments, options);
      mimeType = 'text/csv;charset=utf-8';
      break;
    case 'excel':
      content = appointmentsToExcel(appointments, options);
      mimeType = 'text/csv;charset=utf-8';
      break;
    case 'json':
      content = appointmentsToJSON(appointments, options);
      mimeType = 'application/json;charset=utf-8';
      break;
    default:
      throw new Error(`Formato de exportación no soportado: ${options.format}`);
  }

  const filename = generateFilename(options.format);
  downloadFile(content, filename, mimeType);
}

/**
 * Export appointments summary report
 */
export function exportSummaryReport(
  appointments: AppointmentListItem[],
  startDate: Date,
  endDate: Date
): void {
  const summary = {
    periodo: {
      desde: format(startDate, 'dd/MM/yyyy'),
      hasta: format(endDate, 'dd/MM/yyyy'),
    },
    total_citas: appointments.length,
    estados: {
      pendientes: appointments.filter(a => a.status === 'pending').length,
      confirmadas: appointments.filter(a => a.status === 'confirmed').length,
      completadas: appointments.filter(a => a.status === 'completed').length,
      canceladas: appointments.filter(a => a.status === 'cancelled').length,
      no_presentadas: appointments.filter(a => a.status === 'no_show').length,
    },
    ingresos: {
      total: appointments
        .filter(a => a.status === 'completed')
        .reduce((sum, a) => sum + a.total_amount, 0),
      pendiente: appointments
        .filter(a => ['pending', 'confirmed'].includes(a.status))
        .reduce((sum, a) => sum + a.total_amount, 0),
    },
    barberos: appointments.reduce((acc, appointment) => {
      const barberId = appointment.barber.id;
      if (!acc[barberId]) {
        acc[barberId] = {
          nombre: appointment.barber.display_name,
          citas: 0,
          ingresos: 0,
        };
      }
      acc[barberId].citas++;
      if (appointment.status === 'completed') {
        acc[barberId].ingresos += appointment.total_amount;
      }
      return acc;
    }, {} as Record<string, any>),
    servicios_populares: appointments
      .flatMap(a => a.services.map(s => s.service.name))
      .reduce((acc, service) => {
        acc[service] = (acc[service] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
  };

  const content = JSON.stringify(summary, null, 2);
  const filename = `resumen_citas_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.json`;
  downloadFile(content, filename, 'application/json;charset=utf-8');
}