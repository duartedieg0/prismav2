'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StepperProps {
  steps: string[]
  currentStep: number
  className?: string
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
  // Calculate progress as: (currentStep / steps.length) * 100
  // For step 0 of 4: 0/4 * 100 = 0%
  // For step 1 of 4: 1/4 * 100 = 25%
  // For step 2 of 4: 2/4 * 100 = 50%
  const progressPercent = (currentStep / steps.length) * 100

  return (
    <div className={cn('w-full', className)}>
      {/* Progress bar */}
      <div
        className="mb-4 h-1 rounded-full bg-muted"
        role="progressbar"
        aria-label="Progresso do formulário"
        aria-valuenow={Math.round(progressPercent)}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{
          background: `linear-gradient(to right, hsl(var(--color-success)) 0%, hsl(var(--color-success)) ${progressPercent}%, hsl(var(--color-muted)) ${progressPercent}%, hsl(var(--color-muted)) 100%)`,
        }}
      />

      {/* Desktop step indicators */}
      <div className="hidden sm:flex items-center justify-between gap-4">
        {steps.map((step, index) => {
          const isComplete = index < currentStep
          const isActive = index === currentStep
          const isPending = index > currentStep

          return (
            <div
              key={index}
              className="flex flex-col items-center gap-2 flex-1"
              data-state={isComplete ? 'complete' : isActive ? 'active' : 'pending'}
            >
              {/* Step circle */}
              <div
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-colors',
                  isComplete && 'bg-success text-white',
                  isActive && 'bg-primary text-white',
                  isPending && 'bg-background border border-border text-muted-foreground'
                )}
              >
                {isComplete ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>

              {/* Step label */}
              <p
                className={cn(
                  'text-caption text-center transition-colors',
                  isComplete && 'text-success',
                  isActive && 'text-primary',
                  isPending && 'text-muted-foreground'
                )}
              >
                {step}
              </p>
            </div>
          )
        })}
      </div>

      {/* Mobile fallback */}
      <div className="sm:hidden text-center text-sm text-muted-foreground">
        Etapa {currentStep + 1} de {steps.length} — {steps[currentStep]}
      </div>
    </div>
  )
}
