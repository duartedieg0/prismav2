import { render, screen } from '@testing-library/react'
import { axe } from 'jest-axe'
import { describe, it, expect } from 'vitest'
import { Badge } from './badge'

describe('Badge', () => {
  const statusVariants = [
    'status-draft',
    'status-processing',
    'status-ready',
    'status-error',
    'status-archived',
  ] as const

  statusVariants.forEach((variant) => {
    it(`renders ${variant} variant`, () => {
      render(<Badge variant={variant}>Label</Badge>)
      const badge = screen.getByText('Label')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveAttribute('data-variant', variant)
    })
  })

  it('has no accessibility violations', async () => {
    const { container } = render(<Badge variant="status-ready">Pronto</Badge>)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
