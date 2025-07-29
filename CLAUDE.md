# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a comprehensive barbershop booking system built with React, TypeScript, Vite, and Supabase. The application includes a customer booking flow, admin dashboard, and barber calendar views.

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
npm run test:watch             # Alias for watch mode
npm run test:related           # Run tests related to staged files

# Git Hooks
npm run init:hooks             # Initialize Husky git hooks
npm run check:env              # Verify environment variables
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

### Component Organization
- `src/components/ui/` - Reusable shadcn/ui components
- `src/components/booking/` - Customer booking flow components
- `src/components/admin/` - Admin dashboard components
- `src/components/barber/` - Barber-specific views
- `src/components/layout/` - Layout and navigation components
- `src/components/errors/` - Error handling and boundaries
- `src/components/auth/` - Authentication components

### Database Schema Highlights
- Multi-barbershop support with barbershop → barbers → services hierarchy
- Flexible scheduling system with regular hours and exceptions
- Appointment slot validation to prevent double-booking
- Waiting list management for cancelled appointments
- Comprehensive notification system (email, SMS, push)

Database migrations are in `database/` directory:
- `schema.sql` - Main table definitions
- `functions.sql` - Helper functions
- `triggers.sql` - Automatic triggers
- `rls_policies.sql` - Row Level Security policies
- `cron_jobs.sql` - Scheduled tasks
- `seed.sql` - Sample data

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
- Run specific test: `npm run test -- ServiceSelection.test.tsx`

## Development Workflow

1. **Database Changes**: Update schema files in `database/` then run migrations via Supabase dashboard
2. **New Features**: Follow the existing service → component pattern
3. **Styling**: Use Tailwind classes and extend shadcn/ui components as needed
4. **State Management**: Use TanStack Query for server state, Zustand for complex client state
5. **Error Handling**: Wrap components in error boundaries, use try-catch in async operations

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