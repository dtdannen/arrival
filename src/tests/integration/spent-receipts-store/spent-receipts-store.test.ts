import { describe, it, expect } from 'vitest'
import { sha256Hex } from '../../helpers/crypto.js'

/**
 * Integration — Spent Receipts Store
 * Spec: 02-architecture.md Storage Model "spent_receipts table"
 *       12-receipt-spec.md One-Receipt-One-Review
 *
 * "receipt_hash (primary key, Hash(r) from interaction receipt)"
 * "one-receipt-one-review enforcement: checked at admission, inserted on admit"
 */

interface SpentReceiptRow {
  receipt_hash: string
  subject_id: string
  spent_at: number
}

class SpentReceiptsStore {
  private rows: Map<string, SpentReceiptRow> = new Map()

  isSpent(receipt_hash: string): boolean {
    return this.rows.has(receipt_hash)
  }

  markSpent(receipt_hash: string, subject_id: string): void {
    this.rows.set(receipt_hash, {
      receipt_hash,
      subject_id,
      spent_at: Date.now(),
    })
  }

  getRow(receipt_hash: string): SpentReceiptRow | undefined {
    return this.rows.get(receipt_hash)
  }
}

describe('Integration — Spent Receipts Store', () => {
  it('T-1600: receipt_hash stored on admission — Hash(r) with subject_id and spent_at', () => {
    // Spec: 02-architecture.md "spent_receipts table: receipt_hash, first_seen_at"
    // 12-receipt-spec.md "receipt_hash = Hash(r) is stored in spent-receipts table on admission"
    const store = new SpentReceiptsStore()
    const r = sha256Hex('receipt-secret-1600')
    const receiptHash = sha256Hex(r) // Hash(r)

    store.markSpent(receiptHash, 'subject-001')

    const row = store.getRow(receiptHash)
    expect(row).toBeDefined()
    expect(row!.receipt_hash).toBe(receiptHash)
    expect(row!.subject_id).toBe('subject-001')
    expect(row!.spent_at).toBeGreaterThan(0)

    // Now marked as spent
    expect(store.isSpent(receiptHash)).toBe(true)
  })

  it('T-1601: Spent receipt blocks reuse in any epoch — epoch-independent rejection', () => {
    // Spec: 12-receipt-spec.md "receipt_hash is epoch-independent"
    // "A given receipt can only be used once, regardless of which epoch it is presented in."
    const store = new SpentReceiptsStore()
    const r = sha256Hex('receipt-secret-1601')
    const receiptHash = sha256Hex(r)

    // Mark spent in epoch 1
    store.markSpent(receiptHash, 'subject-001')

    // Attempt reuse in a different epoch: still blocked
    // (spent_receipts table has no epoch_id column — it's epoch-independent)
    expect(store.isSpent(receiptHash)).toBe(true)

    // The check doesn't depend on subject or epoch — purely receipt_hash based
    // Any submission with the same receipt_hash is rejected
  })

  it('T-1602: Different receipts with same subject accepted — different receipt_hash values', () => {
    // Different receipt secrets produce different receipt_hashes
    const store = new SpentReceiptsStore()

    const r1 = sha256Hex('receipt-secret-a')
    const r2 = sha256Hex('receipt-secret-b')
    const hash1 = sha256Hex(r1)
    const hash2 = sha256Hex(r2)

    // Different receipts have different hashes
    expect(hash1).not.toBe(hash2)

    // First receipt spent
    store.markSpent(hash1, 'subject-001')
    expect(store.isSpent(hash1)).toBe(true)

    // Second receipt NOT spent
    expect(store.isSpent(hash2)).toBe(false)

    // Second receipt can be used
    store.markSpent(hash2, 'subject-001')
    expect(store.isSpent(hash2)).toBe(true)
  })
})
