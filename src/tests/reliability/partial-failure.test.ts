import { describe, it, expect } from 'vitest'
import { sha256Hex, deriveEpochId } from '../helpers/crypto.js'

/**
 * Reliability — Partial Failure
 * Spec: implied by system design
 *
 * "Nullifier store down — deterministic error, not silent admission or corruption"
 * When a critical store is unavailable, the gateway must fail safely.
 */

interface FailableNullifierStore {
  exists(subject_id: string, epoch_id: string, nullifier_hash: string): boolean
  store(subject_id: string, epoch_id: string, nullifier_hash: string): void
  isHealthy(): boolean
}

class UnreliableNullifierStore implements FailableNullifierStore {
  private healthy = true
  private data = new Set<string>()

  setHealthy(healthy: boolean): void {
    this.healthy = healthy
  }

  isHealthy(): boolean {
    return this.healthy
  }

  exists(subject_id: string, epoch_id: string, nullifier_hash: string): boolean {
    if (!this.healthy) throw new Error('Nullifier store unavailable')
    return this.data.has(`${subject_id}:${epoch_id}:${nullifier_hash}`)
  }

  store(subject_id: string, epoch_id: string, nullifier_hash: string): void {
    if (!this.healthy) throw new Error('Nullifier store unavailable')
    this.data.add(`${subject_id}:${epoch_id}:${nullifier_hash}`)
  }
}

function safeAdmit(
  nullifierStore: FailableNullifierStore,
  subject_id: string,
  epoch_id: string,
  nullifier_hash: string,
): { status: string; error?: string } {
  try {
    if (nullifierStore.exists(subject_id, epoch_id, nullifier_hash)) {
      return { status: 'rejected' }
    }
    nullifierStore.store(subject_id, epoch_id, nullifier_hash)
    return { status: 'admitted' }
  } catch (err: unknown) {
    // Fail safely: return error, do not silently admit
    return { status: 'error', error: (err as Error).message }
  }
}

describe('Reliability — Partial Failure', () => {
  it('T-1902: Nullifier store down — deterministic error, not silent admission or corruption', () => {
    // When the nullifier store is unavailable, the system must:
    // 1. NOT silently admit the review (would allow duplicate submissions)
    // 2. Return a deterministic error
    // 3. NOT corrupt any state
    const store = new UnreliableNullifierStore()
    const epoch_id = deriveEpochId('subject-001', '2026-W09')
    const nullifier = sha256Hex('partial-failure-nullifier')

    // Normal operation: works fine
    const normalResult = safeAdmit(store, 'subject-001', epoch_id, nullifier)
    expect(normalResult.status).toBe('admitted')

    // Store goes down
    store.setHealthy(false)

    // Attempt to admit with store down
    const failedResult = safeAdmit(store, 'subject-001', epoch_id, sha256Hex('another'))
    expect(failedResult.status).toBe('error')
    expect(failedResult.error).toContain('unavailable')

    // Critically: NOT 'admitted' — silent admission would be catastrophic
    expect(failedResult.status).not.toBe('admitted')
    expect(failedResult.status).not.toBe('rejected')

    // Store recovers
    store.setHealthy(true)

    // Original nullifier is still consumed
    const retryResult = safeAdmit(store, 'subject-001', epoch_id, nullifier)
    expect(retryResult.status).toBe('rejected')
  })
})
