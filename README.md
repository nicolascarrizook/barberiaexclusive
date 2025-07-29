# BarberShop Pro - Sistema de Gestión de Turnos

<div align="center">
  <img src="./public/logo.svg" alt="BarberShop Pro Logo" width="200" />
  
  <p align="center">
    Sistema completo de gestión de turnos para barberías, desarrollado con React, TypeScript y shadcn/ui
    <br />
    <a href="#demo"><strong>Ver Demo »</strong></a>
    ·
    <a href="https://github.com/yourusername/barbershop-booking/issues">Reportar Bug</a>
    ·
    <a href="https://github.com/yourusername/barbershop-booking/issues">Solicitar Feature</a>
  </p>
</div>

## 📋 Tabla de Contenidos

- [Descripción](#descripción)
- [Stack Tecnológico](#-stack-tecnológico)
- [Características](#-características)
- [Requisitos Previos](#requisitos-previos)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Scripts Disponibles](#-scripts-disponibles)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Testing](#-testing)
- [Contribución](#-contribución)
- [Deployment](#-deployment)
- [Roadmap](#-roadmap)
- [Licencia](#licencia)

## Descripción

BarberShop Pro es una aplicación web moderna diseñada para simplificar la gestión de turnos en barberías. Ofrece una experiencia fluida tanto para clientes que desean reservar turnos como para barberos y administradores que necesitan gestionar el negocio eficientemente.

### 🎯 Objetivos principales:
- **Para clientes**: Reservar turnos de manera rápida y sencilla
- **Para barberos**: Visualizar y gestionar su agenda diaria
- **Para administradores**: Control total sobre el negocio con métricas en tiempo real

## 🚀 Stack Tecnológico

### Frontend
- **React 18** - Librería UI con hooks y concurrent features
- **TypeScript** - Tipado estático para mayor robustez
- **Vite** - Build tool ultrarrápido con HMR
- **React Router v6** - Enrutamiento SPA con nested routes
- **Tailwind CSS** - Framework CSS utility-first
- **shadcn/ui** - Componentes UI accesibles y personalizables

### State Management & Data Fetching
- **Zustand** - State management ligero y simple
- **TanStack Query** - Data fetching y caching inteligente
- **React Hook Form** - Gestión de formularios performante
- **Zod** - Validación de esquemas con TypeScript

### Herramientas de Desarrollo
- **ESLint** - Linter con reglas para React y TypeScript
- **Prettier** - Formateo de código consistente
- **Husky** - Git hooks automatizados
- **Commitlint** - Conventional commits enforcement
- **Vitest** - Unit testing framework rápido
- **React Testing Library** - Testing de componentes

### Backend (Preparado para)
- **Supabase** - Backend as a Service con PostgreSQL
- Autenticación JWT
- Real-time subscriptions
- Row Level Security

## ✨ Características

### 🔖 Sistema de Reservas
- **Flujo intuitivo paso a paso**
  - Selección de servicio con descripción y precios
  - Elección de barbero con especialidades y disponibilidad
  - Calendario interactivo con fechas bloqueadas
  - Horarios disponibles en tiempo real
  - Formulario de contacto con validación
  - Confirmación con resumen detallado

### 📊 Panel de Administración
- **Dashboard con métricas en tiempo real**
  - Citas del día/semana/mes
  - Ingresos proyectados
  - Barberos más solicitados
  - Servicios populares
- **Gestión completa de citas**
  - Vista de tabla con filtros avanzados
  - Búsqueda por cliente, barbero o servicio
  - Actualización de estados (pendiente, confirmada, completada, cancelada)
  - Detalles expandibles de cada cita

### 📅 Panel de Barberos
- **Vista de calendario personalizada**
  - Vista diaria y semanal
  - Código de colores por estado
  - Detalles de cita en modal
- **Dashboard personal**
  - Citas del día
  - Estadísticas personales
  - Próximas reservas

### 🎨 Experiencia de Usuario
- **Diseño responsive** - Mobile-first approach
- **Tema claro/oscuro** - Persistente en localStorage
- **Componentes accesibles** - ARIA labels y keyboard navigation
- **Estados de carga** - Skeletons y spinners
- **Manejo de errores** - Error boundaries y toast notifications
- **Animaciones suaves** - Transiciones con Tailwind

### 🔒 Seguridad y Calidad
- **Validación en cliente y servidor**
- **Tipos TypeScript estrictos**
- **Testing automatizado**
- **Code quality checks** en pre-commit
- **Conventional commits**

## Requisitos Previos

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0 o **yarn** >= 1.22.0
- **Git** >= 2.0.0
- Cuenta en [Supabase](https://supabase.com) (para backend)

## 🛠️ Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/yourusername/barbershop-booking.git
cd barbershop-booking
```

### 2. Instalar dependencias

```bash
# Instalar todas las dependencias del proyecto
npm install

# O con yarn
yarn install
```

### 3. Configurar Git hooks

```bash
# Inicializar Husky para git hooks automatizados
npm run init:hooks

# Esto configurará:
# - Pre-commit hooks (ESLint, Prettier, tests)
# - Commit-msg hook (conventional commits)
```

### 4. Configurar variables de entorno

```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar .env con tus credenciales
```

Variables requeridas:
```env
# Supabase
VITE_SUPABASE_URL=tu_supabase_url
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key

# Opcional para desarrollo
VITE_API_URL=http://localhost:3000
VITE_ENABLE_MOCK_DATA=true
```

### 5. Configurar Supabase (Opcional)

Si deseas usar Supabase como backend:

```bash
# Ver documentación detallada en
cat SUPABASE_SETUP.md
```

### 6. Iniciar servidor de desarrollo

```bash
npm run dev

# La aplicación estará disponible en:
# http://localhost:5173
```

## ⚙️ Configuración

### ESLint y Prettier

El proyecto viene preconfigurado con ESLint y Prettier. La configuración se encuentra en:
- `.eslintrc.cjs` - Reglas de linting
- `.prettierrc` - Formato de código
- `.prettierignore` - Archivos ignorados

### TypeScript

Configuración en `tsconfig.json` con:
- Strict mode habilitado
- Path aliases (@/*)
- Target ES2020

### Tailwind CSS

Configuración en `tailwind.config.js` con:
- Tema personalizado
- Animaciones
- Plugins de shadcn/ui

## 📜 Scripts Disponibles

### Desarrollo
```bash
npm run dev          # Inicia servidor de desarrollo con HMR
npm run build        # Build de producción
npm run preview      # Preview del build de producción
```

### Calidad de Código
```bash
npm run lint         # Ejecuta ESLint
npm run lint:fix     # Corrige errores de ESLint automáticamente
npm run format       # Formatea código con Prettier
npm run format:check # Verifica formato sin modificar archivos
```

### Testing
```bash
npm run test         # Ejecuta tests en modo watch
npm run test:ui      # Abre UI de Vitest
npm run test:run     # Ejecuta tests una vez
npm run test:coverage # Genera reporte de cobertura
npm run test:related # Ejecuta solo tests relacionados con cambios
```

### Git Hooks
```bash
npm run prepare      # Configura Husky (se ejecuta automáticamente)
npm run pre-commit   # Ejecuta lint-staged
npm run check:env    # Verifica variables de entorno
npm run init:hooks   # Inicializa git hooks
```

## 📁 Estructura del Proyecto

```
barbershop-booking/
├── .github/                    # GitHub Actions workflows
├── .husky/                     # Git hooks
├── public/                     # Assets estáticos
├── scripts/                    # Scripts de utilidad
│   ├── init-husky.sh          # Inicialización de hooks
│   ├── pre-commit-checks.js   # Verificaciones pre-commit
│   └── run-related-tests.js   # Tests relacionados
├── src/
│   ├── components/            # Componentes React
│   │   ├── booking/          # Flujo de reserva
│   │   ├── admin/            # Panel administración
│   │   ├── barber/           # Panel barberos
│   │   ├── layout/           # Layout y navegación
│   │   └── ui/               # shadcn/ui components
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utilidades y helpers
│   │   ├── api/             # Cliente API
│   │   ├── supabase/        # Cliente Supabase
│   │   └── utils.ts         # Utilidades generales
│   ├── pages/               # Páginas de la aplicación
│   │   ├── admin/          # Páginas admin
│   │   ├── barber/         # Páginas barbero
│   │   └── *.tsx           # Páginas públicas
│   ├── stores/              # Zustand stores
│   ├── styles/              # Estilos globales
│   ├── test/                # Configuración de tests
│   ├── types/               # TypeScript types
│   ├── App.tsx              # Componente principal
│   ├── main.tsx             # Entry point
│   └── router.tsx           # Configuración de rutas
├── .env.example             # Variables de entorno ejemplo
├── .eslintrc.cjs            # Configuración ESLint
├── .gitignore               # Archivos ignorados
├── .prettierrc              # Configuración Prettier
├── commitlint.config.js     # Configuración commitlint
├── CONTRIBUTING.md          # Guía de contribución
├── index.html               # HTML template
├── package.json             # Dependencias y scripts
├── postcss.config.js        # Configuración PostCSS
├── README.md                # Este archivo
├── SUPABASE_SETUP.md        # Guía configuración Supabase
├── tailwind.config.js       # Configuración Tailwind
├── tsconfig.json            # Configuración TypeScript
├── tsconfig.node.json       # TS config para Vite
├── vite.config.ts           # Configuración Vite
└── vitest.config.ts         # Configuración Vitest
```

## 🧪 Testing

El proyecto utiliza Vitest y React Testing Library para testing:

### Ejecutar tests
```bash
# Modo watch (recomendado para desarrollo)
npm run test

# Ejecutar una vez
npm run test:run

# Con cobertura
npm run test:coverage

# UI interactiva
npm run test:ui
```

### Estructura de tests
- Los tests se ubican junto a los componentes con extensión `.test.tsx`
- Tests de integración en `src/__tests__/`
- Mocks y utilidades en `src/test/`

### Ejemplo de test
```typescript
import { render, screen } from '@testing-library/react'
import { Button } from './Button'

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
```

## 🤝 Contribución

¡Las contribuciones son bienvenidas! Por favor, lee nuestra [Guía de Contribución](./CONTRIBUTING.md) para más detalles sobre:

- Código de conducta
- Proceso de pull requests
- Estándares de código
- Conventional commits
- Flujo de trabajo Git

### Quick Start para contribuidores

1. Fork el proyecto
2. Crea tu rama de feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'feat: add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 🚀 Deployment

### Build de producción

```bash
# Generar build optimizado
npm run build

# Preview local del build
npm run preview
```

### Deploy en Vercel (Recomendado)

1. Instala [Vercel CLI](https://vercel.com/cli)
2. Ejecuta `vercel` en la raíz del proyecto
3. Sigue las instrucciones

### Deploy en Netlify

1. Build command: `npm run build`
2. Publish directory: `dist`
3. Configura variables de entorno en el panel de Netlify

### Docker (Próximamente)

```dockerfile
# Dockerfile será agregado en futuras versiones
```

## 🗺️ Roadmap

### Fase 1: MVP (Actual) ✅
- [x] Sistema de reservas funcional
- [x] Panel de administración
- [x] Panel de barberos
- [x] Diseño responsive
- [x] Testing básico
- [x] Documentación

### Fase 2: Backend Integration
- [ ] Integración completa con Supabase
- [ ] Sistema de autenticación (Auth0/Supabase Auth)
- [ ] Real-time updates con WebSockets
- [ ] API REST documentada con Swagger
- [ ] Gestión de imágenes y archivos

### Fase 3: Features Avanzadas
- [ ] Notificaciones push (Web Push API)
- [ ] Sistema de pagos (Stripe/MercadoPago)
- [ ] Recordatorios por email/SMS
- [ ] Programa de fidelidad
- [ ] Estadísticas avanzadas con gráficos
- [ ] Exportación de reportes (PDF/Excel)

### Fase 4: Mobile & Escalabilidad
- [ ] PWA con funcionalidad offline
- [ ] App móvil nativa (React Native)
- [ ] Multi-idioma (i18n)
- [ ] Multi-sucursal
- [ ] API pública para integraciones
- [ ] Marketplace de servicios

### Fase 5: IA y Automatización
- [ ] Recomendaciones de horarios con IA
- [ ] Chatbot para consultas frecuentes
- [ ] Predicción de demanda
- [ ] Optimización automática de agenda

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

## 🙏 Agradecimientos

- [shadcn/ui](https://ui.shadcn.com/) por los componentes increíbles
- [Radix UI](https://www.radix-ui.com/) por los primitivos accesibles
- [Tailwind CSS](https://tailwindcss.com/) por el sistema de diseño
- [Lucide](https://lucide.dev/) por los iconos
- La comunidad de React por el apoyo constante

---

<div align="center">
  Hecho con ❤️ por el equipo de BarberShop Pro
</div>