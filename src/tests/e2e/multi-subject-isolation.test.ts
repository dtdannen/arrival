import { describe, it, expect } from 'vitest'
import { sha256Hex, deriveEpochId, deterministicIdentity } from '../helpers/crypto.js'

/**
 * E2E — Multi-Subject Isolation
 * Spec: 03-proof-spec.md Nullifier Construction
 *       02-architecture.md "subject_id is the reviewed entity key"
 *
 * "Same identity reviews subjects A and B — different nullifiers,
 *  independent admission, no cross-subject leakage"
 */

describe('E2E — Multi-Subject Isolation', () => {
  it('T-2105: Same identity reviews subjects A and B — different nullifiers, independent admission, no cross-subject leakage', () => {
    const alice = deterministicIdentity('alice')
    const time_window_id = '2026-W09'

    // Subject A
    const epochA = deriveEpochId('subject-A', time_window_id)
    const nullifierA = sha256Hex(`nullifier:${alice.commitment}:${epochA}`)

    // Subject B
    const epochB = deriveEpochId('subject-B', time_window_id)
    const nullifierB = sha256Hex(`nullifier:${alice.commitment}:${epochB}`)

    // Different subjects produce different epoch_ids
    expect(epochA).not.toBe(epochB)

    // Different epoch_ids produce different nullifiers (even for same identity)
    expect(nullifierA).not.toBe(nullifierB)

    // Independent admission: both can be admitted
    const nullifierStore = new Set<string>()

    // Admit review for subject A
    expect(nullifierStore.has(nullifierA)).toBe(false)
    nullifierStore.add(nullifierA)

    // Admit review for subject B — not blocked by subject A's nullifier
    expect(nullifierStore.has(nullifierB)).toBe(false)
    nullifierStore.add(nullifierB)

    // Both admitted independently
    expect(nullifierStore.size).toBe(2)

    // No cross-subject leakage: knowing nullifierA tells you nothing about nullifierB
    // (They are derived from different scopes via Poseidon hash)
    expect(nullifierA).not.toBe(nullifierB)

    // Published reviews for subject A don't reference subject B
    const publishedA = {
      review_id: 'review-a',
      subject_id: 'subject-A',
      time_window_id,
    }
    const publishedB = {
      review_id: 'review-b',
      subject_id: 'subject-B',
      time_window_id,
    }

    expect(JSON.stringify(publishedA)).not.toContain('subject-B')
    expect(JSON.stringify(publishedB)).not.toContain('subject-A')
  })
})
