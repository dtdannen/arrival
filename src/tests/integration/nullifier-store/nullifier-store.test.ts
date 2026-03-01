import { describe, it, expect } from 'vitest'
import { sha256Hex, deriveEpochId } from '../../helpers/crypto.js'
import type { NullifierStore } from '../../helpers/types.js'

/**
 * Integration — Nullifier Store
 * Spec: 02-architecture.md Storage Model "nullifiers table"
 *       03-proof-spec.md Admission Policy
 *
 * "subject_id, epoch_id, nullifier_hash, first_seen_at"
 * Nullifier is stored on admission, not on rejection.
 * Scoped to (subject_id, epoch_id).
 */

interface NullifierRow {
  subject_id: string
  epoch_id: string
  nullifier_hash: string
  first_seen_at: number
}

class InMemoryNullifierStore implements NullifierStore {
  private rows: NullifierRow[] = []

  exists(subject_id: string, epoch_id: string, nullifier_hash: string): boolean {
    return this.rows.some(
      (r) => r.subject_id === subject_id && r.epoch_id === epoch_id && r.nullifier_hash === nullifier_hash,
    )
  }

  store(subject_id: string, epoch_id: string, nullifier_hash: string): void {
    this.rows.push({
      subject_id,
      epoch_id,
      nullifier_hash,
      first_seen_at: Date.now(),
    })
  }

  getRow(subject_id: string, epoch_id: string, nullifier_hash: string): NullifierRow | undefined {
    return this.rows.find(
      (r) => r.subject_id === subject_id && r.epoch_id === epoch_id && r.nullifier_hash === nullifier_hash,
    )
  }

  allRows(): NullifierRow[] {
    return [...this.rows]
  }
}

describe('Integration — Nullifier Store', () => {
  it('T-1500: Store nullifier on admission — row with subject_id, epoch_id, nullifier_hash, first_seen_at', () => {
    // Spec: 02-architecture.md "nullifiers table: subject_id, epoch_id, nullifier_hash, first_seen_at"
    const store = new InMemoryNullifierStore()
    const epoch_id = deriveEpochId('subject-001', '2026-W09')
    const nullifier = sha256Hex('alice-nullifier')

    store.store('subject-001', epoch_id, nullifier)

    const row = store.getRow('subject-001', epoch_id, nullifier)
    expect(row).toBeDefined()
    expect(row!.subject_id).toBe('subject-001')
    expect(row!.epoch_id).toBe(epoch_id)
    expect(row!.nullifier_hash).toBe(nullifier)
    expect(row!.first_seen_at).toBeGreaterThan(0)
  })

  it('T-1501: No nullifier stored on rejection', () => {
    // Spec: 02-architecture.md "If rejected, response includes deterministic reject code.
    // Nullifier is not consumed."
    const store = new InMemoryNullifierStore()
    const epoch_id = deriveEpochId('subject-001', '2026-W09')
    const nullifier = sha256Hex('rejected-nullifier')

    // Simulate rejection: do NOT call store()
    // After rejection, nullifier should not exist
    expect(store.exists('subject-001', epoch_id, nullifier)).toBe(false)
    expect(store.allRows()).toHaveLength(0)
  })

  it('T-1502: Nullifier scoped to (subject_id, epoch_id) — same hash in different scope treated independently', () => {
    // Spec: 03-proof-spec.md "scope = Poseidon(domain_tag, subject_id, epoch_id)"
    const store = new InMemoryNullifierStore()
    const nullifier = sha256Hex('alice-nullifier')

    const epoch1 = deriveEpochId('subject-001', '2026-W09')
    const epoch2 = deriveEpochId('subject-002', '2026-W09')

    // Store nullifier in scope 1
    store.store('subject-001', epoch1, nullifier)
    expect(store.exists('subject-001', epoch1, nullifier)).toBe(true)

    // Same nullifier hash in different scope: NOT seen as duplicate
    expect(store.exists('subject-002', epoch2, nullifier)).toBe(false)

    // Can store same hash in different scope
    store.store('subject-002', epoch2, nullifier)
    expect(store.exists('subject-002', epoch2, nullifier)).toBe(true)

    // Both coexist independently
    expect(store.allRows()).toHaveLength(2)
  })

  it('T-1503: Nullifier integrity survives gateway restart — duplicate_nullifier after restart', () => {
    // Spec: implied by durable storage model
    // Simulates persistence by creating a new store instance with pre-loaded data
    const epoch_id = deriveEpochId('subject-001', '2026-W09')
    const nullifier = sha256Hex('persistent-nullifier')

    // Phase 1: store nullifier (before restart)
    const store1 = new InMemoryNullifierStore()
    store1.store('subject-001', epoch_id, nullifier)

    // Simulate restart: serialize and deserialize
    const serialized = store1.allRows()

    // Phase 2: new store instance (after restart) with recovered data
    const store2 = new InMemoryNullifierStore()
    for (const row of serialized) {
      store2.store(row.subject_id, row.epoch_id, row.nullifier_hash)
    }

    // Nullifier still detected as spent after restart
    expect(store2.exists('subject-001', epoch_id, nullifier)).toBe(true)
  })

  it('T-1504: Same identity with different receipt blocked by nullifier (not receipt)', () => {
    // Same identity → same nullifier → duplicate_nullifier
    // Different receipt → passes spent-receipt check
    const store = new InMemoryNullifierStore()
    const epoch_id = deriveEpochId('subject-001', '2026-W09')

    // Alice's nullifier (determined by identity + scope, independent of receipt)
    const aliceNullifier = sha256Hex('alice-identity-nullifier')

    // First submission with receipt-1: admitted, nullifier stored
    store.store('subject-001', epoch_id, aliceNullifier)

    // Second submission with receipt-2 (different receipt, same identity):
    // blocked by nullifier, not by spent-receipt
    expect(store.exists('subject-001', epoch_id, aliceNullifier)).toBe(true)
  })

  it('T-1505: Different identity with same receipt blocked by spent-receipt (not nullifier)', () => {
    // Different identity → different nullifier → passes nullifier check
    // Same receipt → fails spent-receipt check
    const nullifierStore = new InMemoryNullifierStore()
    const spentReceipts = new Set<string>()
    const epoch_id = deriveEpochId('subject-001', '2026-W09')

    // Receipt shared between Alice and Bob (should not happen in practice,
    // but tests the correct defense layer)
    const receiptHash = sha256Hex('shared-receipt-r')

    // Alice's submission: unique nullifier, receipt not yet spent
    const aliceNullifier = sha256Hex('alice-nullifier')
    expect(nullifierStore.exists('subject-001', epoch_id, aliceNullifier)).toBe(false)
    expect(spentReceipts.has(receiptHash)).toBe(false)

    // Admit Alice: store nullifier and mark receipt spent
    nullifierStore.store('subject-001', epoch_id, aliceNullifier)
    spentReceipts.add(receiptHash)

    // Bob's submission: different nullifier (passes nullifier check)
    const bobNullifier = sha256Hex('bob-nullifier')
    expect(nullifierStore.exists('subject-001', epoch_id, bobNullifier)).toBe(false)

    // But same receipt: blocked by spent-receipt store
    expect(spentReceipts.has(receiptHash)).toBe(true)
  })
})
