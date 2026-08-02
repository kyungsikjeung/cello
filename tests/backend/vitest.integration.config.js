import { defineConfig } from 'vitest/config'

// Opt-in only: this suite creates and removes database roles in a dedicated _test DB.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/backend/integration.spec.js'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
})
