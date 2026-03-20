import { render, screen } from '@testing-library/react'
import { axe } from 'jest-axe'
import { vi, describe, it, expect } from 'vitest'
import { Sidebar } from './sidebar'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}))

describe('Sidebar', () => {
  it('renders navigation with aria-label', () => {
    render(
      <Sidebar
        role="user"
        userName="João Silva"
        userEmail="joao@escola.com"
      />
    )
    expect(screen.getByRole('navigation', { name: /navegação principal/i })).toBeInTheDocument()
  })

  it('renders dashboard link', () => {
    render(<Sidebar role="user" userName="João" userEmail="joao@email.com" />)
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
  })

  it('does NOT render admin section for role=user', () => {
    render(<Sidebar role="user" userName="João" userEmail="joao@email.com" />)
    expect(screen.queryByText(/administração/i)).not.toBeInTheDocument()
  })

  it('renders admin section for role=admin', () => {
    render(<Sidebar role="admin" userName="Admin" userEmail="admin@email.com" />)
    expect(screen.getByText(/administração/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /modelos de ia/i })).toBeInTheDocument()
  })

  it('marks current route as aria-current=page', () => {
    render(<Sidebar role="user" userName="João" userEmail="joao@email.com" />)
    const dashLink = screen.getByRole('link', { name: /dashboard/i })
    expect(dashLink).toHaveAttribute('aria-current', 'page')
  })

  it('has no accessibility violations', async () => {
    const { container } = render(
      <Sidebar role="user" userName="João" userEmail="joao@email.com" />
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
