import { describe, it, expect } from 'vitest'
import { sha256Hex } from '../../helpers/crypto.js'
import type { KeysetRecord, StepResult } from '../../helpers/types.js'

/**
 * Receipt Verifier — Verification
 * Spec: 12-receipt-spec.md Verification steps 1-5
 *
 * 1. keyset_id maps to known, accepted issuer for claimed subject_id
 * 2. Verify(pk, r, S) succeeds
 * 3. receipt_hash = Hash(r) not in spent-receipts
 * 4. Keyset's validity period falls within claimed time window bounds
 * 5. Store receipt_hash in spent-receipts
 */

interface ReceiptData {
  r: string
  S: string
  keyset_id: string
}

interface SignatureVerifier {
  verify(publicKey: string, r: string, S: string): boolean
}

interface SpentReceiptStore {
  isSpent(receipt_hash: string): boolean
  markSpent(receipt_hash: string): void
}

interface KeysetStore {
  getKeyset(keyset_id: string, subject_id: string): KeysetRecord | null
}

function verifyReceipt(
  receipt: ReceiptData,
  subject_id: string,
  keysetStore: KeysetStore,
  spentStore: SpentReceiptStore,
  sigVerifier: SignatureVerifier,
): StepResult {
  // Step 1: keyset_id maps to known issuer for subject
  const keyset = keysetStore.getKeyset(receipt.keyset_id, subject_id)
  if (!keyset) {
    return {
      ok: false,
      reject_code: 'invalid_interaction_proof',
      reject_detail: `Unknown keyset ${receipt.keyset_id} for subject ${subject_id}`,
    }
  }

  // Step 2: Verify signature
  if (!sigVerifier.verify(keyset.public_key, receipt.r, receipt.S)) {
    return {
      ok: false,
      reject_code: 'invalid_interaction_proof',
      reject_detail: 'Blind signature verification failed',
    }
  }

  // Step 3: Check spent receipts
  const receiptHash = sha256Hex(receipt.r)
  if (spentStore.isSpent(receiptHash)) {
    return {
      ok: false,
      reject_code: 'invalid_interaction_proof',
      reject_detail: 'Receipt already spent',
    }
  }

  return { ok: true }
}

// ── Test helpers ─────────────────────────────────────────────────────

function makeKeysetStore(keysets: KeysetRecord[]): KeysetStore {
  return {
    getKeyset(kid, sid) {
      return keysets.find((k) => k.keyset_id === kid && k.subject_id === sid) ?? null
    },
  }
}

function makeSpentStore(): SpentReceiptStore {
  const spent = new Set<string>()
  return {
    isSpent: (h) => spent.has(h),
    markSpent: (h) => { spent.add(h) },
  }
}

const SUBJECT_ID = 'subject-001'
const KEYSET_ID = 'keyset-001'
const VALID_KEYSET: KeysetRecord = {
  keyset_id: KEYSET_ID,
  subject_id: SUBJECT_ID,
  keyset_start: 1000,
  keyset_end: 2000,
  public_key: sha256Hex('issuer-pk'),
  issuer_id: 'issuer-001',
}

describe('Receipt Verifier — Verification', () => {
  it('T-500: Valid receipt accepted — passes all checks', () => {
    const receipt: ReceiptData = {
      r: sha256Hex('valid-secret'),
      S: sha256Hex('valid-sig'),
      keyset_id: KEYSET_ID,
    }
    const acceptSig: SignatureVerifier = { verify: () => true }

    const result = verifyReceipt(
      receipt, SUBJECT_ID, makeKeysetStore([VALID_KEYSET]), makeSpentStore(), acceptSig,
    )

    expect(result.ok).toBe(true)
  })

  it('T-501: Unknown keyset_id rejected — invalid_interaction_proof', () => {
    const receipt: ReceiptData = {
      r: sha256Hex('unknown-keyset-secret'),
      S: sha256Hex('unknown-keyset-sig'),
      keyset_id: 'keyset-unknown',
    }
    const acceptSig: SignatureVerifier = { verify: () => true }

    const result = verifyReceipt(
      receipt, SUBJECT_ID, makeKeysetStore([VALID_KEYSET]), makeSpentStore(), acceptSig,
    )

    expect(result.ok).toBe(false)
    expect(result.reject_code).toBe('invalid_interaction_proof')
    expect(result.reject_detail).toContain('Unknown keyset')
  })

  it('T-502: Wrong subject_id for keyset rejected — invalid_interaction_proof', () => {
    // Keyset exists for subject-001, but receipt claims subject-002
    const receipt: ReceiptData = {
      r: sha256Hex('wrong-subject-secret'),
      S: sha256Hex('wrong-subject-sig'),
      keyset_id: KEYSET_ID,
    }
    const acceptSig: SignatureVerifier = { verify: () => true }

    const result = verifyReceipt(
      receipt, 'subject-002', makeKeysetStore([VALID_KEYSET]), makeSpentStore(), acceptSig,
    )

    expect(result.ok).toBe(false)
    expect(result.reject_code).toBe('invalid_interaction_proof')
  })

  it('T-503: Invalid RSA signature rejected — invalid_interaction_proof', () => {
    const receipt: ReceiptData = {
      r: sha256Hex('bad-sig-secret'),
      S: 'corrupted-signature',
      keyset_id: KEYSET_ID,
    }
    const rejectSig: SignatureVerifier = { verify: () => false }

    const result = verifyReceipt(
      receipt, SUBJECT_ID, makeKeysetStore([VALID_KEYSET]), makeSpentStore(), rejectSig,
    )

    expect(result.ok).toBe(false)
    expect(result.reject_code).toBe('invalid_interaction_proof')
    expect(result.reject_detail).toContain('signature verification failed')
  })
})
