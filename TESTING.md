# Sistema de Testing - Barbershop Booking

## Instalación

Para instalar las dependencias de testing, ejecuta:

```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event @vitest/ui jsdom @types/testing-library__jest-dom
```

**Nota**: Si encuentras problemas de permisos con npm, ejecuta primero:
```bash
sudo chown -R $(whoami) ~/.npm
```

## Configuración

El sistema de testing está configurado con:

- **Vitest**: Test runner rápido para proyectos con Vite
- **React Testing Library**: Para testing de componentes React
- **Jest DOM**: Matchers adicionales para assertions del DOM
- **User Event**: Para simular interacciones de usuario realistas

### Archivos de Configuración

- `vitest.config.ts`: Configuración principal de Vitest
- `src/test/setup.ts`: Setup global para los tests
- `src/test/test-utils.tsx`: Utilidades de testing personalizadas
- `src/test/mocks/handlers.ts`: Mocks y datos de prueba

## Scripts Disponibles

```json
{
  "test": "vitest",              // Ejecuta tests en modo watch
  "test:ui": "vitest --ui",      // Abre la UI de Vitest
  "test:run": "vitest run",      // Ejecuta tests una sola vez
  "test:coverage": "vitest run --coverage",  // Genera reporte de cobertura
  "test:watch": "vitest watch"   // Alias para modo watch
}
```

## Estructura de Tests

Los tests están organizados en carpetas `__tests__` dentro de cada directorio de componente:

```
src/
  components/
    booking/
      BookingFlow.tsx
      __tests__/
        BookingFlow.test.tsx
        ServiceSelection.test.tsx
    ui/
      button.tsx
      __tests__/
        button.test.tsx
  hooks/
    useAuth.ts
    __tests__/
      useAuth.test.tsx
  contexts/
    AuthContext.tsx
    __tests__/
      AuthContext.test.tsx
```

## Buenas Prácticas Implementadas

### 1. Test Utils Personalizados
Todos los tests usan `render` desde `test-utils.tsx` que incluye:
- React Router
- React Query
- AuthContext
- Otros providers necesarios

```tsx
import { render, screen } from '@/test/test-utils'
```

### 2. User Event para Interacciones
Usamos `@testing-library/user-event` para simular interacciones realistas:

```tsx
const user = userEvent.setup()
await user.click(button)
await user.type(input, 'texto')
```

### 3. Mocks Centralizados
Los mocks están centralizados en `src/test/mocks/handlers.ts`:
- Datos de prueba consistentes
- Funciones mock reutilizables
- Mock de servicios externos (Supabase)

### 4. Tests por Categoría

#### Tests Unitarios
- Componentes UI simples (Button)
- Funciones puras
- Hooks personalizados

#### Tests de Integración
- Flujos completos (BookingFlow)
- Interacción entre componentes
- Contextos y providers

#### Tests de Comportamiento
- Validación de formularios
- Estados de carga y error
- Navegación y routing

## Ejemplos de Tests

### Test de Componente Simple
```tsx
it('renderiza correctamente con texto', () => {
  render(<Button>Click me</Button>)
  expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
})
```

### Test de Interacción
```tsx
it('maneja eventos de click', async () => {
  const handleClick = vi.fn()
  const user = userEvent.setup()
  
  render(<Button onClick={handleClick}>Click me</Button>)
  await user.click(screen.getByRole('button'))
  
  expect(handleClick).toHaveBeenCalledTimes(1)
})
```

### Test de Hook
```tsx
const { result } = renderHook(() => useAuth(), {
  wrapper: AuthProvider,
})

expect(result.current.isAuthenticated).toBe(false)
```

## Coverage Reports

Para generar reportes de cobertura:

```bash
npm run test:coverage
```

Los reportes se generan en:
- Terminal: Resumen de cobertura
- `coverage/index.html`: Reporte HTML detallado

### Objetivos de Cobertura
- Statements: 80%
- Branches: 75%
- Functions: 80%
- Lines: 80%

## Debugging Tests

### UI de Vitest
```bash
npm run test:ui
```
Abre una interfaz web para:
- Ver tests en tiempo real
- Debugging interactivo
- Explorar resultados

### Console Logs
Los logs están habilitados en tests. Usa `console.log` normalmente.

### Debug en VS Code
Configura el debugger con:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
  "args": ["run", "${file}"],
  "console": "integratedTerminal"
}
```

## Tips y Trucos

1. **Usa `screen.debug()`** para ver el DOM actual
2. **Queries semánticas**: Prefiere `getByRole` sobre `getByTestId`
3. **Async/Await**: Siempre usa `await` con user events
4. **Cleanup automático**: No necesitas cleanup manual
5. **Mocks de módulos**: Usa `vi.mock()` para módulos externos

## Próximos Pasos

1. Añadir tests E2E con Playwright
2. Implementar visual regression testing
3. Añadir tests de performance
4. Configurar CI/CD para ejecutar tests automáticamente