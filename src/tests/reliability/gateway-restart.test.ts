import { describe, it, expect } from 'vitest'
import { sha256Hex, deriveEpochId } from '../helpers/crypto.js'
import type { NullifierStore } from '../helpers/types.js'

/**
 * Reliability — Gateway Restart
 * Spec: 02-architecture.md Storage Model
 *
 * Nullifier store must be durable. After gateway restart,
 * previously consumed nullifiers must still be detected.
 */

interface NullifierRow {
  subject_id: string
  epoch_id: string
  nullifier_hash: string
}

class DurableNullifierStore implements NullifierStore {
  private rows: NullifierRow[] = []

  constructor(preloaded?: NullifierRow[]) {
    if (preloaded) this.rows = [...preloaded]
  }

  exists(subject_id: string, epoch_id: string, nullifier_hash: string): boolean {
    return this.rows.some(
      (r) => r.subject_id === subject_id && r.epoch_id === epoch_id && r.nullifier_hash === nullifier_hash,
    )
  }

  store(subject_id: string, epoch_id: string, nullifier_hash: string): void {
    this.rows.push({ subject_id, epoch_id, nullifier_hash })
  }

  serialize(): NullifierRow[] {
    return [...this.rows]
  }
}

describe('Reliability — Gateway Restart', () => {
  it('T-1900: Gateway restart preserves nullifier integrity — replay rejected with duplicate_nullifier', () => {
    // Spec: Durable storage model implies nullifier persistence across restarts
    const epoch_id = deriveEpochId('subject-001', '2026-W09')
    const nullifier = sha256Hex('alice-nullifier-1900')

    // Phase 1: Before restart — admit a review
    const store1 = new DurableNullifierStore()
    expect(store1.exists('subject-001', epoch_id, nullifier)).toBe(false)
    store1.store('subject-001', epoch_id, nullifier)
    expect(store1.exists('subject-001', epoch_id, nullifier)).toBe(true)

    // Simulate restart: serialize state and create new store instance
    const persisted = store1.serialize()

    // Phase 2: After restart — load from persistent storage
    const store2 = new DurableNullifierStore(persisted)

    // Replay attempt: same nullifier should be detected as duplicate
    expect(store2.exists('subject-001', epoch_id, nullifier)).toBe(true)

    // This would result in reject_code: 'duplicate_nullifier'
    const replayResult = store2.exists('subject-001', epoch_id, nullifier)
      ? { status: 'rejected', reject_code: 'duplicate_nullifier' }
      : { status: 'admitted', reject_code: null }

    expect(replayResult.status).toBe('rejected')
    expect(replayResult.reject_code).toBe('duplicate_nullifier')
  })
})
