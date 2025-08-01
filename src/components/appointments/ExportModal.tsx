import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Download,
  FileText,
  FileSpreadsheet,
  FileJson,
  Info,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { exportAppointments, type ExportFormat } from '@/utils/export-appointments';
import { type AppointmentListItem } from '@/services/appointment-management.service';

interface ExportModalProps {
  appointments: AppointmentListItem[];
  isOpen: boolean;
  onClose: () => void;
}

export function ExportModal({
  appointments,
  isOpen,
  onClose,
}: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [includeCustomerDetails, setIncludeCustomerDetails] = useState(false);
  const [includePaymentInfo, setIncludePaymentInfo] = useState(false);
  const [includeNotes, setIncludeNotes] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const { toast } = useToast();

  const handleExport = async () => {
    if (appointments.length === 0) {
      toast({
        title: 'Sin datos',
        description: 'No hay citas para exportar',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);

    try {
      await exportAppointments(appointments, {
        format,
        includeCustomerDetails,
        includePaymentInfo,
        includeNotes,
      });

      toast({
        title: 'Exportación exitosa',
        description: `Se exportaron ${appointments.length} citas`,
      });

      onClose();
    } catch (error) {
      console.error('Error exporting:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron exportar las citas',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getFormatIcon = (formatType: ExportFormat) => {
    switch (formatType) {
      case 'csv':
        return <FileText className="h-4 w-4" />;
      case 'excel':
        return <FileSpreadsheet className="h-4 w-4" />;
      case 'json':
        return <FileJson className="h-4 w-4" />;
    }
  };

  const getFormatDescription = (formatType: ExportFormat) => {
    switch (formatType) {
      case 'csv':
        return 'Archivo separado por comas, compatible con Excel y Google Sheets';
      case 'excel':
        return 'Archivo optimizado para Microsoft Excel';
      case 'json':
        return 'Formato estructurado para desarrolladores y análisis avanzado';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exportar citas</DialogTitle>
          <DialogDescription>
            Selecciona el formato y los datos que deseas incluir en la exportación
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export summary */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Se exportarán {appointments.length} citas con los filtros actuales aplicados
            </AlertDescription>
          </Alert>

          {/* Format selection */}
          <div className="space-y-3">
            <Label>Formato de exportación</Label>
            <RadioGroup value={format} onValueChange={(value: ExportFormat) => setFormat(value)}>
              <div className="space-y-2">
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="csv" id="csv" className="mt-1" />
                  <Label htmlFor="csv" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2 mb-1">
                      {getFormatIcon('csv')}
                      <span className="font-medium">CSV</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {getFormatDescription('csv')}
                    </p>
                  </Label>
                </div>

                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="excel" id="excel" className="mt-1" />
                  <Label htmlFor="excel" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2 mb-1">
                      {getFormatIcon('excel')}
                      <span className="font-medium">Excel</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {getFormatDescription('excel')}
                    </p>
                  </Label>
                </div>

                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="json" id="json" className="mt-1" />
                  <Label htmlFor="json" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2 mb-1">
                      {getFormatIcon('json')}
                      <span className="font-medium">JSON</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {getFormatDescription('json')}
                    </p>
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Data options */}
          <div className="space-y-3">
            <Label>Datos adicionales</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="customer-details"
                  checked={includeCustomerDetails}
                  onCheckedChange={(checked) => setIncludeCustomerDetails(!!checked)}
                />
                <Label
                  htmlFor="customer-details"
                  className="text-sm font-normal cursor-pointer"
                >
                  Incluir detalles del cliente (teléfono, email)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="payment-info"
                  checked={includePaymentInfo}
                  onCheckedChange={(checked) => setIncludePaymentInfo(!!checked)}
                />
                <Label
                  htmlFor="payment-info"
                  className="text-sm font-normal cursor-pointer"
                >
                  Incluir información de pago
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="notes"
                  checked={includeNotes}
                  onCheckedChange={(checked) => setIncludeNotes(!!checked)}
                />
                <Label
                  htmlFor="notes"
                  className="text-sm font-normal cursor-pointer"
                >
                  Incluir notas y solicitudes del cliente
                </Label>
              </div>
            </div>
          </div>

          {/* Privacy notice */}
          {(includeCustomerDetails || includeNotes) && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Los datos personales deben manejarse de acuerdo con las políticas de privacidad
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exportando...' : 'Exportar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}