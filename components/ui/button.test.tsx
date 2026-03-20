import { render, screen } from '@testing-library/react'
import { axe } from 'jest-axe'
import { describe, it, expect } from 'vitest'
import { Button } from './button'

describe('Button', () => {
  it('renders accent variant with correct data attribute', () => {
    render(<Button variant="accent">Começar</Button>)
    const button = screen.getByRole('button', { name: /começar/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute('data-variant', 'accent')
    // Verify accent styles are applied
    expect(button.className).toContain('bg-accent')
    expect(button.className).toContain('text-accent-foreground')
  })

  it('has no accessibility violations for accent variant', async () => {
    const { container } = render(<Button variant="accent">Criar prova</Button>)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
