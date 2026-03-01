import { describe, it, expect } from 'vitest'
import { sha256Hex } from '../../helpers/crypto.js'
import type { KeysetRecord, StepResult } from '../../helpers/types.js'

/**
 * Receipt Verifier — Spent Receipts
 * Spec: 12-receipt-spec.md One-Receipt-One-Review, Cross-epoch receipt reuse,
 *        Receipt Expiration and Epoch Interaction
 *
 * Key requirements:
 * - receipt_hash = Hash(r) is stored in spent-receipts table on admission
 * - Spent receipt blocks reuse in any epoch (epoch-independent)
 * - Keyset period must fall within claimed time window bounds
 */

interface SpentReceiptStore {
  isSpent(receipt_hash: string): boolean
  markSpent(receipt_hash: string): void
}

function makeSpentStore(): SpentReceiptStore & { entries: Set<string> } {
  const entries = new Set<string>()
  return {
    entries,
    isSpent: (h) => entries.has(h),
    markSpent: (h) => { entries.add(h) },
  }
}

function checkReceiptSpent(r: string, spentStore: SpentReceiptStore): StepResult {
  const receiptHash = sha256Hex(r)
  if (spentStore.isSpent(receiptHash)) {
    return {
      ok: false,
      reject_code: 'invalid_interaction_proof',
      reject_detail: `Receipt hash ${receiptHash} already spent`,
    }
  }
  return { ok: true }
}

function checkKeysetWindowBounds(
  keyset: KeysetRecord,
  window_start: number,
  window_end: number,
): StepResult {
  // Spec: "The verifier confirms the keyset's time period falls within
  // the claimed time_window_id's bounds"
  if (keyset.keyset_start < window_start || keyset.keyset_end > window_end) {
    return {
      ok: false,
      reject_code: 'invalid_timeblind_proof',
      reject_detail: `Keyset period [${keyset.keyset_start},${keyset.keyset_end}] outside window [${window_start},${window_end}]`,
    }
  }
  return { ok: true }
}

describe('Receipt Verifier — Spent Receipts', () => {
  it('T-504: Spent receipt rejected — duplicate receipt_hash returns invalid_interaction_proof', () => {
    // Spec: 12-receipt-spec.md One-Receipt-One-Review
    const spentStore = makeSpentStore()
    const r = sha256Hex('receipt-secret-504')
    const receiptHash = sha256Hex(r)

    // First use: mark spent
    spentStore.markSpent(receiptHash)

    // Second use: should be rejected
    const result = checkReceiptSpent(r, spentStore)

    expect(result.ok).toBe(false)
    expect(result.reject_code).toBe('invalid_interaction_proof')
    expect(result.reject_detail).toContain('already spent')
  })

  it('T-505: Keyset period outside claimed time window rejected — invalid_timeblind_proof', () => {
    // Spec: 12-receipt-spec.md Verification step 4
    const keyset: KeysetRecord = {
      keyset_id: 'keyset-505',
      subject_id: 'subject-001',
      keyset_start: 500,
      keyset_end: 1500,
      public_key: sha256Hex('pk'),
      issuer_id: 'issuer-001',
    }

    // Window is [2000, 3000] but keyset period is [500, 1500] — entirely outside
    const result = checkKeysetWindowBounds(keyset, 2000, 3000)

    expect(result.ok).toBe(false)
    expect(result.reject_code).toBe('invalid_timeblind_proof')
    expect(result.reject_detail).toContain('outside window')

    // Keyset that falls within window should pass
    const validKeyset: KeysetRecord = {
      ...keyset,
      keyset_id: 'keyset-505-valid',
      keyset_start: 2100,
      keyset_end: 2200,
    }
    const validResult = checkKeysetWindowBounds(validKeyset, 2000, 3000)
    expect(validResult.ok).toBe(true)
  })

  it('T-507: Receipt unusable after keyset period time window closes', () => {
    // Spec: 12-receipt-spec.md "Receipt Expiration and Epoch Interaction"
    // "A receipt is usable as long as its keyset period falls within an open
    // time window for the subject."
    //
    // Once the window closes, the keyset period won't match any open window,
    // so the receipt naturally becomes unusable.

    const keyset: KeysetRecord = {
      keyset_id: 'keyset-507',
      subject_id: 'subject-001',
      keyset_start: 1000,
      keyset_end: 1500,
      public_key: sha256Hex('pk'),
      issuer_id: 'issuer-001',
    }

    // During the open window [500, 2000], keyset period [1000, 1500] is valid
    const duringWindow = checkKeysetWindowBounds(keyset, 500, 2000)
    expect(duringWindow.ok).toBe(true)

    // After window closes, next window is [2000, 3000]
    // Keyset period [1000, 1500] no longer falls within any open window
    const afterWindow = checkKeysetWindowBounds(keyset, 2000, 3000)
    expect(afterWindow.ok).toBe(false)
    expect(afterWindow.reject_code).toBe('invalid_timeblind_proof')
  })
})
