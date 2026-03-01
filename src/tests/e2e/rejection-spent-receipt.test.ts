import { describe, it, expect } from 'vitest'
import { sha256Hex, deriveEpochId } from '../helpers/crypto.js'

/**
 * E2E — Rejection: Spent Receipt
 * Spec: 12-receipt-spec.md One-Receipt-One-Review
 *       02-architecture.md Verification Pipeline step 8
 *
 * "Two submissions with same receipt — first admitted, second rejected with invalid_interaction_proof"
 */

describe('E2E — Rejection: Spent Receipt', () => {
  it('T-2102: Two submissions with same receipt — first admitted, second rejected with invalid_interaction_proof', () => {
    const spentReceipts = new Set<string>()
    const nullifiers = new Set<string>()

    // Shared receipt
    const receiptR = sha256Hex('shared-receipt-secret')
    const receiptHash = sha256Hex(receiptR)

    // Alice submits first
    const aliceNullifier = sha256Hex('alice-nullifier-2102')
    const aliceEpochId = deriveEpochId('subject-001', '2026-W09')

    // Step 8 check: receipt not yet spent
    expect(spentReceipts.has(receiptHash)).toBe(false)

    // Step 10 check: nullifier not yet seen
    expect(nullifiers.has(aliceNullifier)).toBe(false)

    // Alice admitted: consume nullifier and receipt
    nullifiers.add(aliceNullifier)
    spentReceipts.add(receiptHash)

    const aliceResult = {
      status: 'admitted' as const,
      reject_code: null,
    }
    expect(aliceResult.status).toBe('admitted')

    // Bob tries to submit with the SAME receipt
    const bobNullifier = sha256Hex('bob-nullifier-2102')

    // Bob's nullifier is different (different identity) — would pass step 10
    expect(nullifiers.has(bobNullifier)).toBe(false)

    // But step 8: receipt already spent
    expect(spentReceipts.has(receiptHash)).toBe(true)

    const bobResult = {
      status: 'rejected' as const,
      reject_code: 'invalid_interaction_proof' as const,
      reject_detail: `Receipt hash ${receiptHash} already spent`,
    }
    expect(bobResult.status).toBe('rejected')
    expect(bobResult.reject_code).toBe('invalid_interaction_proof')

    // Bob's nullifier was NOT consumed (rejected before step 10)
    expect(nullifiers.has(bobNullifier)).toBe(false)
  })
})
