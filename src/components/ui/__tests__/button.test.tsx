import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { Button } from '../button'

describe('Button', () => {
  it('renderiza correctamente con texto', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('maneja eventos de click', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()
    
    render(<Button onClick={handleClick}>Click me</Button>)
    const button = screen.getByRole('button', { name: /click me/i })
    
    await user.click(button)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('se desactiva cuando disabled es true', () => {
    render(<Button disabled>Disabled Button</Button>)
    const button = screen.getByRole('button', { name: /disabled button/i })
    
    expect(button).toBeDisabled()
  })

  it('aplica variantes de estilo correctamente', () => {
    const { rerender } = render(<Button variant="destructive">Delete</Button>)
    let button = screen.getByRole('button', { name: /delete/i })
    expect(button).toHaveClass('bg-destructive')
    
    rerender(<Button variant="outline">Outline</Button>)
    button = screen.getByRole('button', { name: /outline/i })
    expect(button).toHaveClass('border')
  })

  it('aplica tamaños correctamente', () => {
    const { rerender } = render(<Button size="sm">Small</Button>)
    let button = screen.getByRole('button', { name: /small/i })
    expect(button).toHaveClass('h-9')
    
    rerender(<Button size="lg">Large</Button>)
    button = screen.getByRole('button', { name: /large/i })
    expect(button).toHaveClass('h-11')
  })

  it('funciona con asChild para composición', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    )
    
    const link = screen.getByRole('link', { name: /link button/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/test')
  })

  it('combina clases personalizadas con las predeterminadas', () => {
    render(<Button className="custom-class">Custom</Button>)
    const button = screen.getByRole('button', { name: /custom/i })
    
    expect(button).toHaveClass('custom-class')
    expect(button).toHaveClass('bg-primary') // clase predeterminada
  })

  it('no ejecuta onClick cuando está deshabilitado', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()
    
    render(<Button disabled onClick={handleClick}>Disabled</Button>)
    const button = screen.getByRole('button', { name: /disabled/i })
    
    await user.click(button)
    expect(handleClick).not.toHaveBeenCalled()
  })
})