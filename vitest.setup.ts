import '@testing-library/jest-dom'
import { toHaveNoViolations } from 'jest-axe'
import { expect, vi } from 'vitest'

expect.extend(toHaveNoViolations)

// Mock ResizeObserver for components using it (e.g., Select, Dropdown)
class MockResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
global.ResizeObserver = MockResizeObserver as any
