import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'

// Crear un QueryClient para tests
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

interface TestProviderProps {
  children: React.ReactNode
}

// Provider que envuelve todos los providers necesarios para los tests
export function TestProvider({ children }: TestProviderProps) {
  const testQueryClient = createTestQueryClient()

  return (
    <QueryClientProvider client={testQueryClient}>
      <AuthProvider>
        <BrowserRouter>{children}</BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

// Custom render que incluye todos los providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: TestProvider, ...options })

// Re-exportar todo de testing library
export * from '@testing-library/react'

// Override del render con nuestro custom render
export { customRender as render }