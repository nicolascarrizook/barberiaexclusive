// // // // // import { useState } from "react";
// // // // // import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// // // // // import { Button } from "@/components/ui/button";
// // // // // import { Badge } from "@/components/ui/badge";
// // // // // import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// // // // // import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// // // // // import { Appointment, Barber } from "@/types";
// // // // // import { format, startOfWeek, addDays, isSameDay, setHours, setMinutes } from "date-fns";
// // // // // import { es } from "date-fns/locale";
// // // // // import { ChevronLeft, ChevronRight, Calendar, Clock } from "lucide-react";

interface BarberCalendarProps {
  barber: Barber;
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
}

type ViewType = 'day' | 'week';

const _WORK_HOURS = Array.from({ length: 11 }, (_, i) => i + 9); // 9 AM to 7 PM

export function BarberCalendar({ barber, appointments, onAppointmentClick }: BarberCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>('day');

  const _navigateDate = (direction: 'prev' | 'next') => {
    const _days = viewType === 'day' ? 1 : 7;
    const _newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? days : -days));
    setCurrentDate(newDate);
  };

  const _goToToday = () => {
    setCurrentDate(new Date());
  };

  const _getWeekDays = () => {
    const _start = startOfWeek(currentDate, { locale: es });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

  const _getAppointmentForSlot = (date: Date, hour: number) => {
    return appointments.find(apt => {
      const _aptDate = new Date(apt.date);
      const _aptHour = parseInt(apt.time.split(':')[0]);
      return isSameDay(aptDate, date) && aptHour === hour && apt.barberId === barber.id;
    });
  };

  const _getStatusColor = (status: Appointment['status']) => {
    const _colors = {
      pending: 'bg-yellow-100 border-yellow-300 text-yellow-800',
      confirmed: 'bg-green-100 border-green-300 text-green-800',
      cancelled: 'bg-red-100 border-red-300 text-red-800',
      completed: 'bg-gray-100 border-gray-300 text-gray-800',
    };
    return colors[status];
  };

  const _renderDayView = () => {
    return (
      <div className="space-y-2">
        {WORK_HOURS.map(hour => {
          const _appointment = getAppointmentForSlot(currentDate, hour);
          const _timeString = `${hour.toString().padStart(2, '0')}:00`;

          return (
            <div key={hour} className="flex gap-4 items-start">
              <div className="w-16 text-sm text-muted-foreground pt-2">
                {timeString}
              </div>
              <div className="flex-1">
                {appointment ? (
                  <Card 
                    className={`cursor-pointer transition-all hover:shadow-md border-2 ${getStatusColor(appointment.status)}`}
                    onClick={() => onAppointmentClick(appointment)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold">{appointment.customerName}</p>
                          <p className="text-sm">{appointment.serviceName}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="h-3 w-3" />
                            <span className="text-xs">{appointment.duration} min</span>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          ${appointment.price}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="h-16 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-sm text-muted-foreground">
                    Disponible
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const _renderWeekView = () => {
    const _weekDays = getWeekDays();

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left p-2 text-sm font-medium text-muted-foreground w-16">Hora</th>
              {weekDays.map(day => (
                <th key={day.toISOString()} className="text-center p-2 min-w-[120px]">
                  <div className={`text-sm font-medium ${isSameDay(day, new Date()) ? 'text-primary' : ''}`}>
                    {format(day, 'EEE', { locale: es })}
                  </div>
                  <div className={`text-lg ${isSameDay(day, new Date()) ? 'font-bold text-primary' : ''}`}>
                    {format(day, 'd')}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WORK_HOURS.map(hour => (
              <tr key={hour} className="border-t">
                <td className="p-2 text-sm text-muted-foreground">
                  {`${hour.toString().padStart(2, '0')}:00`}
                </td>
                {weekDays.map(day => {
                  const _appointment = getAppointmentForSlot(day, hour);
                  return (
                    <td key={day.toISOString()} className="p-1 border-l">
                      {appointment ? (
                        <div
                          className={`p-2 rounded cursor-pointer text-xs ${getStatusColor(appointment.status)}`}
                          onClick={() => onAppointmentClick(appointment)}
                        >
                          <p className="font-semibold truncate">{appointment.customerName}</p>
                          <p className="truncate">{appointment.serviceName}</p>
                        </div>
                      ) : (
                        <div className="h-12" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-10 w-10">
              <AvatarImage src={barber.avatar} alt={barber.name} />
              <AvatarFallback>{barber.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>Calendario de {barber.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {viewType === 'day' 
                  ? format(currentDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
                  : `Semana del ${format(startOfWeek(currentDate, { locale: es }), "d 'de' MMMM", { locale: es })}`
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={viewType} onValueChange={(value: ViewType) => setViewType(value)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Vista diaria</SelectItem>
                <SelectItem value="week">Vista semanal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateDate('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateDate('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="ml-2"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Hoy
            </Button>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-300" />
              <span className="text-xs">Confirmada</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-yellow-300" />
              <span className="text-xs">Pendiente</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-gray-300" />
              <span className="text-xs">Completada</span>
            </div>
          </div>
        </div>

        {viewType === 'day' ? renderDayView() : renderWeekView()}
      </CardContent>
    </Card>
  );
}