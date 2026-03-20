import { render, screen } from '@testing-library/react'
import { axe } from 'jest-axe'
import { describe, it, expect } from 'vitest'
import { Stepper } from './stepper'

const steps = ['Informações', 'Configurações', 'Upload', 'Revisão']

describe('Stepper', () => {
  it('renders all step labels on desktop', () => {
    render(<Stepper steps={steps} currentStep={0} />)
    steps.forEach((step) => {
      expect(screen.getByText(step)).toBeInTheDocument()
    })
  })

  it('marks current step as active', () => {
    render(<Stepper steps={steps} currentStep={1} />)
    const activeStep = screen.getByText('Configurações').closest('[data-state]')
    expect(activeStep).toHaveAttribute('data-state', 'active')
  })

  it('marks completed steps', () => {
    render(<Stepper steps={steps} currentStep={2} />)
    const completedStep = screen.getByText('Informações').closest('[data-state]')
    expect(completedStep).toHaveAttribute('data-state', 'complete')
  })

  it('shows progress bar with correct width', () => {
    render(<Stepper steps={steps} currentStep={2} />)
    // Step 2 of 4 = 50%
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toHaveAttribute('aria-valuenow', '50')
  })

  it('has no accessibility violations', async () => {
    const { container } = render(<Stepper steps={steps} currentStep={0} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
