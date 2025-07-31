import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Calendar, 
  CalendarDays,
  Clock,
  Settings
} from 'lucide-react';

const barberMenuItems = [
  {
    title: 'Dashboard',
    href: '/barber',
    icon: LayoutDashboard,
  },
  {
    title: 'Mis Citas',
    href: '/barber/appointments',
    icon: CalendarDays,
  },
  {
    title: 'Mi Horario',
    href: '/barber/schedule',
    icon: Calendar,
  },
  {
    title: 'Disponibilidad',
    href: '/barber/availability',
    icon: Clock,
  },
  {
    title: 'Configuración',
    href: '/barber/settings',
    icon: Settings,
  },
];

export function BarberSidebar() {
  const location = useLocation();

  return (
    <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1">
      {barberMenuItems.map((item) => (
        <Link
          key={item.href}
          to={item.href}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent",
            location.pathname === item.href
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground"
          )}
        >
          <item.icon className="h-4 w-4" />
          <span>{item.title}</span>
        </Link>
      ))}
    </nav>
  );
}