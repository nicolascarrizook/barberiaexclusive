# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a comprehensive barbershop booking system built with React, TypeScript, Vite, and Supabase. The application includes a customer booking flow, admin dashboard, barber calendar views, and advanced scheduling features with capacity management.

## Common Commands

```bash
# Install dependencies
npm install

# Development
npm run dev                    # Start dev server at http://localhost:5173
npm run build                  # Build for production
npm run preview                # Preview production build

# Code Quality
npm run lint                   # Run ESLint
npm run lint:fix               # Fix ESLint issues
npm run format                 # Format code with Prettier
npm run format:check           # Check code formatting

# Testing
npm run test                   # Run tests in watch mode
npm run test:ui                # Open Vitest UI
npm run test:run               # Run tests once
npm run test:coverage          # Generate coverage report
npm run test:related           # Run tests related to staged files

# Run specific test file
npm run test -- ServiceSelection.test.tsx

# Git Hooks
npm run init:hooks             # Initialize Husky git hooks
npm run check:env              # Verify environment variables
npm run pre-commit             # Execute lint-staged manually

# Type Checking & Security
npm run type-check             # Run TypeScript compiler check
npm run security:check         # Run npm audit
npm run deps:check             # Check for dependency updates

# Docker & Deployment
npm run docker:dev             # Run development in Docker
npm run docker:prod            # Run production preview in Docker
npm run build:docker           # Build Docker image

# Performance Analysis
npm run build:analyze          # Analyze bundle size
npm run perf:bundle            # Visualize bundle composition
```

## Architecture Overview

### Frontend Stack
- **React 18** with TypeScript for type safety
- **Vite** for fast development and building
- **shadcn/ui** components built on Radix UI primitives
- **Tailwind CSS** for styling
- **React Hook Form + Zod** for form handling and validation
- **TanStack Query** for server state management
- **Zustand** for client state management
- **React Router** for navigation

### Backend Architecture (Supabase)
- **PostgreSQL** database with complex relational schema
- **Row Level Security (RLS)** for authorization
- **Edge Functions** for business logic (appointments, notifications, analytics)
- **Real-time subscriptions** for live updates
- **Cron jobs** for scheduled tasks (reminders, cleanup)

### Key Services Pattern
All API interactions follow a consistent service pattern in `src/services/`:
- Base service class handles common operations
- Each domain has its own service (appointments, barbers, customers, etc.)
- Services integrate with Supabase client from `src/lib/supabase.ts`
- **Advanced scheduling services**: availability, barbershop-hours, holidays, time-off
- **Capacity management**: Dynamic capacity control with peak hour multipliers

### Service Architecture Pattern
```typescript
// All services extend BaseService for consistent CRUD operations
class ServiceName extends BaseService<TableType> {
  constructor() {
    super('table_name');
  }
  
  // Custom domain-specific methods
  async customMethod() {
    // Uses this.query() for Supabase operations
  }
}
```

### Component Organization
- `src/components/ui/` - Reusable shadcn/ui components
- `src/components/booking/` - Customer booking flow components
- `src/components/admin/` - Admin dashboard components
- `src/components/barber/` - Barber-specific views and schedule management
  - `BarberScheduleManager.tsx` - Weekly schedule configuration
  - `BarberWorkSchedule.tsx` - Daily time block management
  - `BarberWorkingHours.tsx` - Working hours display
- `src/components/owner/` - Business owner management interfaces
  - `BarbershopScheduleConfig.tsx` - Business hours configuration
  - `CapacityManagement.tsx` - Dynamic capacity control
  - `ScheduleOverview.tsx` - Heatmap and analytics
- `src/components/schedule/` - Advanced scheduling system (vacation, holidays, capacity)
  - `TimeOffManager.tsx` - Vacation/time-off requests
  - `HolidayCalendar.tsx` - Holiday management
  - `AvailabilityHeatmap.tsx` - Visual availability display
- `src/components/layout/` - Layout and navigation components
- `src/components/errors/` - Error handling and boundaries
- `src/components/auth/` - Authentication components

### Database Schema Highlights
- Multi-barbershop support with barbershop → barbers → services hierarchy
- **Advanced scheduling system** with capacity management and peak hour multipliers
- **Holiday management** with Argentine national holidays and custom dates
- **Vacation/time-off system** with approval workflows and conflict detection
- **Dynamic availability** with real-time heatmap visualization
- Appointment slot validation to prevent double-booking and overbooking
- Waiting list management for cancelled appointments
- Comprehensive notification system (email, SMS, push)
- **Role-based RLS policies** for multi-tenant security (admin, owner, barber, customer)

Database migrations are in `database/` directory:
- `schema.sql` - Main table definitions
- `functions.sql` - Helper functions
- `triggers.sql` - Automatic triggers
- `rls_policies.sql` - Row Level Security policies
- `schedule_rls_policies.sql` - Advanced RLS for scheduling system
- `cron_jobs.sql` - Scheduled tasks
- `barber_invitations.sql` - Invitation system tables
- `migrations/` - Capacity system and schema updates
  - `001_schedule_management_system.sql` - Advanced scheduling templates
  - `004_barbershop_hours_system.sql` - Business hours management
  - `005_fix_scheduling_architecture.sql` - Integration functions
- `seed.sql` - Sample data

### Key Database Tables
- **profiles**: User profiles with roles (admin, owner, barber, customer)
- **barbershops**: Business entities with settings
- **barbers**: Barber profiles linked to barbershops and users
- **appointments**: Core booking records with status tracking
- **working_hours**: Current weekly schedules (migrating to schedule_templates)
- **special_dates**: Holidays and date-specific overrides
- **barber_time_off**: Vacation/time-off requests with approval workflow
- **capacity_config**: Dynamic capacity settings per time slot
- **barbershop_hours**: Business-wide operating hours (future)

### Important Implementation Details

1. **Real-time Updates**: The app uses Supabase Realtime for live availability updates
2. **Authentication**: Integrated with Supabase Auth through AuthContext
3. **Type Safety**: Database types are generated in `src/types/database.ts`
4. **Form Validation**: All forms use React Hook Form with Zod schemas
5. **Error Handling**: Toast notifications for user feedback, comprehensive error boundaries
6. **Date/Time**: Uses date-fns for consistent date manipulation
7. **Path Aliases**: Use `@/` to import from `src/` directory

### Testing Approach
- **Vitest** for unit and integration testing
- **React Testing Library** for component testing
- **Test Utils** in `src/test/test-utils.tsx` with all providers
- **Mock Handlers** in `src/test/mocks/handlers.ts`
- Tests are colocated in `__tests__` folders
- Existing test files:
  - `src/components/booking/__tests__/` - Booking flow tests
  - `src/components/errors/__tests__/` - Error handling tests
  - `src/components/ui/__tests__/` - UI component tests
  - `src/contexts/__tests__/` - Context tests
  - `src/hooks/__tests__/` - Custom hook tests including `useTimeOff.test.tsx`
  - Service layer unit tests for availability, holidays, and time-off management

## Development Workflow

1. **Database Changes**: 
   - Update schema files in `database/`
   - Apply migrations via Supabase SQL editor
   - Generate types: `npx supabase gen types typescript --project-id [project-id] > src/types/database.generated.ts`
   
2. **New Features**: 
   - Create service in `src/services/[feature].service.ts` extending BaseService
   - Build components in `src/components/[feature]/`
   - Add route in `src/routes/index.tsx`
   - Write tests in `__tests__` folders
   
3. **Styling**: 
   - Use Tailwind classes and cn() utility for conditional classes
   - Extend shadcn/ui components rather than creating from scratch
   - Follow existing color scheme and spacing patterns
   
4. **State Management**: 
   - Server state: TanStack Query with optimistic updates
   - Client state: Zustand for complex flows (booking, filters)
   - Form state: React Hook Form with Zod validation
   - URL state: React Router for filters/pagination
   
5. **Error Handling**: 
   - Wrap routes in ErrorBoundary components
   - Use toast notifications for user feedback
   - Log errors with contextual information

## Environment Setup

1. Copy `.env.example` to `.env`
2. Add Supabase credentials:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. See `SUPABASE_SETUP.md` for detailed backend configuration

## Pre-commit Hooks

The project uses Husky with lint-staged for code quality:
- ESLint fixes for `.ts` and `.tsx` files
- Prettier formatting for all supported files
- Related tests run automatically
- Commit message linting (conventional commits)

## Key Architectural Patterns

### Service Layer Pattern
Services in `src/services/` follow a consistent pattern:
```typescript
// Example: AppointmentService extends BaseService
class ServiceName extends BaseService<TableType> {
  constructor() {
    super('table_name');
  }
  
  // Custom methods specific to the domain
  async customQuery() {
    const { data, error } = await this.query()
      .select('*, related_table(*)')
      .eq('status', 'active');
      
    if (error) this.handleError(error);
    return data;
  }
}
```

### Hook Patterns
```typescript
// Data fetching with TanStack Query
const { data, isLoading, error } = useQuery({
  queryKey: ['resource', id],
  queryFn: () => service.getById(id),
});

// Mutations with optimistic updates
const mutation = useMutation({
  mutationFn: service.update,
  onMutate: async (newData) => {
    // Optimistic update logic
  },
});
```

### Component Patterns
1. **Page Components** (`src/pages/`): Route-level components that compose features
2. **Feature Components** (`src/components/[feature]/`): Domain-specific UI logic
3. **UI Components** (`src/components/ui/`): Reusable shadcn/ui primitives
4. **Layout Components** (`src/components/layout/`): App structure and navigation

### State Management Strategy
- **Server State**: TanStack Query with optimistic updates
- **Client State**: Zustand for complex UI state (booking flow, filters)
- **Form State**: React Hook Form with Zod validation
- **Auth State**: Context API with Supabase integration

### Database Migration Files
Located in `database/` directory, execute in order:
1. `schema.sql` - Core tables and relationships
2. `functions.sql` - PostgreSQL functions for business logic
3. `triggers.sql` - Automatic data updates
4. `rls_policies.sql` - Row-level security rules
5. `schedule_rls_policies.sql` - Advanced RLS for scheduling system
6. `cron_jobs.sql` - Scheduled tasks (requires Supabase Pro)
7. `barber_invitations.sql` - Invitation system tables
8. `migrations/` - Capacity system and feature updates
9. `seed.sql` - Sample data for development

### Real-time Features
The app uses Supabase Realtime for:
- Live appointment updates
- **Dynamic availability changes** with heatmap visualization
- **Capacity monitoring** and overbooking prevention
- **Schedule conflict detection** for time-off requests
- Notification delivery
- **Live barber status updates** and occupancy rates
- Collaborative features (future)

### Advanced Features Implemented

#### Capacity Management System
- **Dynamic capacity configuration** per time slot with business rule validation
- **Peak hour multipliers** (e.g., Friday evenings, weekends) for demand-based scheduling
- **Overbooking prevention** with configurable limits and risk assessment
- **Real-time impact simulation** before applying capacity changes
- **Risk level indicators** (low/medium/high) for operational decisions

#### Availability & Scheduling
- **Heatmap visualization** showing availability levels with color-coded intensity
- **Real-time barber status monitoring** with occupancy rate analytics
- **Conflict detection system** for overlapping appointments and time-off requests
- **Holiday management** with Argentine national holidays and custom business dates
- **Vacation request workflow** with approval/rejection system for barbers

#### Advanced UI Patterns
- **Tab-based configuration interfaces** for complex settings
- **Progressive disclosure** of advanced features to reduce cognitive load
- **Modal composition patterns** for detailed form interactions
- **Real-time validation feedback** with optimistic updates and rollback capabilities

### Error Handling Strategy
1. **API Errors**: Caught in services, transformed to user-friendly messages
2. **UI Errors**: Error boundaries at route and feature levels
3. **Form Errors**: Inline validation with Zod schemas
4. **Network Errors**: Retry logic with exponential backoff
5. **Business Logic Errors**: Comprehensive validation for scheduling conflicts and capacity constraints

## Important Notes

- **Node.js Compatibility**: Requires Node 20.11.0 (specified in .nvmrc)
- **WSL2 Users**: May experience file system issues with npm install
- **Environment Variables**: Must restart dev server after changes
- **Type Generation**: Run `npx supabase gen types typescript --project-id [project-id] > src/types/database.generated.ts` after schema changes
- **Testing**: Always run lint and tests before committing
- **Date/Time Handling**: All times stored in UTC, displayed in barbershop timezone
- **RLS Policies**: Always test with different user roles after schema changes
- **MCP Integration**: Project includes Supabase MCP server configuration in `.mcp.json`
- **Docker Support**: Full Docker and Kubernetes configurations available for deployment
- **Performance Monitoring**: Prometheus and Grafana stack available via Docker Compose

## Debugging Tips

1. **Supabase Errors**: Check browser console for detailed error messages including RLS policy violations
2. **Type Errors**: Regenerate types after database changes
3. **State Issues**: Use React DevTools and Zustand DevTools
4. **Network Issues**: Check Network tab for failed Supabase requests
5. **RLS Issues**: Test queries in Supabase SQL editor with different roles:
   ```sql
   -- Test as specific user
   SET LOCAL role TO authenticated;
   SET LOCAL request.jwt.claim.sub TO 'user-uuid-here';
   SELECT * FROM your_table;
   ```
6. **Scheduling Conflicts**: Check `barber_time_off`, `special_dates`, and `capacity_config` tables for conflicts
7. **Performance Issues**: Use bundle analyzer and Lighthouse reports (`npm run perf:bundle`)

## Deployment Options

### Docker Deployment
- Development: `docker-compose up app-dev`
- Production: `docker-compose up app-prod`
- With monitoring: `docker-compose --profile monitoring up`
- With local Supabase: `docker-compose --profile local-supabase up`

### Kubernetes Deployment
- Configuration in `k8s/` directory
- Includes HPA for auto-scaling
- Security context and resource limits configured
- Health checks and readiness probes

### Edge Functions (Supabase)
Located in `supabase/functions/`:
- `analytics/` - Usage analytics and reporting
- `appointments/` - Appointment management logic
- `notifications/` - Email/SMS/Push notification handling

## Git Hooks & Code Quality

The project uses comprehensive pre-commit hooks:
1. **ESLint** with auto-fix for TypeScript/React issues
2. **Prettier** for consistent code formatting
3. **TypeScript** compilation check
4. **Environment file** protection (prevents .env commits)
5. **Commit size** warnings (>20 files or >500 lines)
6. **Debug code** detection (console.log, debugger, TODO)
7. **Related tests** execution for changed files
8. **Commit message** validation (Conventional Commits)

## Advanced Architecture Notes

### Multi-tenant Architecture
- Each barbershop is isolated with RLS policies
- Role hierarchy: admin → owner → barber → customer
- Barbershop-scoped data access patterns

### Real-time Architecture
- Supabase Realtime for live updates
- Optimistic updates with rollback
- Presence tracking for collaborative features

### Performance Optimizations
- Code splitting at route level
- Lazy loading for heavy components
- Bundle size monitoring with rollup-plugin-visualizer
- Image optimization strategies

### Testing Strategy
- Unit tests for services and utilities
- Integration tests for complex flows
- Component tests with React Testing Library
- E2E tests with Playwright (configured but not implemented)
- Pre-commit hook runs related tests automatically