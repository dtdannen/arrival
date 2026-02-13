/**
 * PostgreSQL test database setup using testcontainers.
 *
 * Provides a fresh database for each test suite that needs real DB access.
 * Used by integration, e2e, performance, and reliability tests.
 *
 * Stub — fill in when you add testcontainers to devDependencies.
 */

export interface TestDatabase {
  connectionString: string
  close: () => Promise<void>
}

/**
 * Start a PostgreSQL container and run migrations.
 * Call in beforeAll() for test suites that need a real database.
 */
export async function setupTestDatabase(): Promise<TestDatabase> {
  // TODO: start PostgreSQL testcontainer
  // TODO: run migrations to create tables (roots, reviews, nullifiers, spent_receipts, issuer_registry)
  // TODO: return connection string and cleanup function
  throw new Error('Not implemented — add testcontainers dependency first')
}

/**
 * Reset all tables between tests within a suite.
 * Call in beforeEach() for test isolation.
 */
export async function resetTables(_db: TestDatabase): Promise<void> {
  // TODO: TRUNCATE all tables
  throw new Error('Not implemented')
}
