import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    exclude: ['node_modules', '.next', 'supabase', 'e2e', '.claude', '.worktrees'],
    coverage: {
      provider: 'v8',
      thresholds: { functions: 80, lines: 80 },
      exclude: ['node_modules', '.next', 'supabase', 'e2e', '.claude', '.worktrees'],
    },
  },
  resolve: {
    alias: { '@': resolve(__dirname, '.') },
  },
})
