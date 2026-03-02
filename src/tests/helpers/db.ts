/**
 * PostgreSQL test database setup using testcontainers.
 *
 * Provides a fresh database for each test suite that needs real DB access.
 * Used by integration, e2e, performance, and reliability tests.
 */

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from 'testcontainers'
import { Client } from 'pg'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MIGRATION_PATH = resolve(__dirname, '../../shared/migrations/001_create_tables.sql')

export interface TestDatabase {
  connectionString: string
  client: Client
  close: () => Promise<void>
}

/**
 * Start a PostgreSQL container and run migrations.
 * Call in beforeAll() for test suites that need a real database.
 */
export async function setupTestDatabase(): Promise<TestDatabase> {
  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('arrival_test')
    .withUsername('test')
    .withPassword('test')
    .start()

  const connectionString = container.getConnectionUri()
  const client = new Client({ connectionString })
  await client.connect()

  const migrationSql = readFileSync(MIGRATION_PATH, 'utf-8')
  await client.query(migrationSql)

  return {
    connectionString,
    client,
    close: async () => {
      await client.end()
      await container.stop()
    },
  }
}

/**
 * Reset all tables between tests within a suite.
 * Call in beforeEach() for test isolation.
 */
export async function resetTables(db: TestDatabase): Promise<void> {
  await db.client.query(`
    TRUNCATE roots, reviews, nullifiers, spent_receipts, issuer_registry
  `)
}
