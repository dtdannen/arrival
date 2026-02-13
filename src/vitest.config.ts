import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.ts'],
          testTimeout: 10_000,
        },
      },
      {
        test: {
          name: 'circuit',
          include: ['tests/circuit/**/*.test.ts'],
          testTimeout: 120_000,
        },
      },
      {
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          testTimeout: 30_000,
        },
      },
      {
        test: {
          name: 'e2e',
          include: ['tests/e2e/**/*.test.ts'],
          testTimeout: 120_000,
        },
      },
      {
        test: {
          name: 'performance',
          include: ['tests/performance/**/*.bench.ts'],
          testTimeout: 120_000,
        },
      },
      {
        test: {
          name: 'reliability',
          include: ['tests/reliability/**/*.test.ts'],
          testTimeout: 30_000,
        },
      },
    ],
  },
})
