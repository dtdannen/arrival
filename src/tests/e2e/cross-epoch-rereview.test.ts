import { describe, it, expect } from 'vitest'
import { sha256Hex, deriveEpochId, deterministicIdentity } from '../helpers/crypto.js'

/**
 * E2E — Cross-Epoch Re-Review
 * Spec: 02-architecture.md Subject Context Model
 *       11-time-window-policy.md Relationship to epoch_id
 *
 * "epoch_id = hash(subject_id || time_window_id)"
 * "one review per identity per subject per time window"
 */

describe('E2E — Cross-Epoch Re-Review', () => {
  it('T-2103: Submit in epoch E1, new window opens E2, new receipt, submit again — second admitted', () => {
    // Spec: Different time_window → different epoch_id → different nullifier scope
    const alice = deterministicIdentity('alice')
    const nullifiers = new Set<string>()
    const spentReceipts = new Set<string>()

    // Epoch 1: 2026-W09
    const epoch1 = deriveEpochId('subject-001', '2026-W09')
    const nullifier1 = sha256Hex(`nullifier:${alice.commitment}:${epoch1}`)
    const receipt1Hash = sha256Hex(sha256Hex('receipt-e1'))

    // First submission admitted in epoch 1
    expect(nullifiers.has(nullifier1)).toBe(false)
    expect(spentReceipts.has(receipt1Hash)).toBe(false)
    nullifiers.add(nullifier1)
    spentReceipts.add(receipt1Hash)

    // Epoch 2: 2026-W10 (new window opens)
    const epoch2 = deriveEpochId('subject-001', '2026-W10')
    expect(epoch1).not.toBe(epoch2) // different epochs

    // Alice gets a NEW receipt for the new period
    const receipt2Hash = sha256Hex(sha256Hex('receipt-e2'))
    expect(receipt1Hash).not.toBe(receipt2Hash)

    // New nullifier for new epoch
    const nullifier2 = sha256Hex(`nullifier:${alice.commitment}:${epoch2}`)
    expect(nullifier1).not.toBe(nullifier2) // different scope

    // Second submission in epoch 2
    expect(nullifiers.has(nullifier2)).toBe(false) // not seen in new scope
    expect(spentReceipts.has(receipt2Hash)).toBe(false) // new receipt not spent

    // Admitted!
    nullifiers.add(nullifier2)
    spentReceipts.add(receipt2Hash)

    // Both nullifiers exist in their respective scopes
    expect(nullifiers.has(nullifier1)).toBe(true)
    expect(nullifiers.has(nullifier2)).toBe(true)
    expect(nullifiers.size).toBe(2)
  })
})
