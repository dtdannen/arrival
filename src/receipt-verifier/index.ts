/**
 * Receipt Verifier — Interaction receipt verification and spent-receipt tracking.
 *
 * Spec: 12-receipt-spec.md (Verification steps 1-5, One-Receipt-One-Review)
 *
 * Verification steps:
 * 1. keyset_id maps to known, accepted issuer for claimed subject_id
 * 2. Verify(pk, r, S) succeeds (blind signature verification)
 * 3. receipt_hash = Hash(r) is not in spent-receipts table
 * 4. Keyset's validity period falls within claimed time window bounds
 */

import { sha256Hex } from '../shared/crypto.js'
import type { KeysetRecord, StepResult } from '../shared/types.js'

// ── Interfaces ──────────────────────────────────────────────────────

export interface ReceiptData {
  r: string
  S: string
  keyset_id: string
}

export interface SignatureVerifier {
  verify(publicKey: string, r: string, S: string): boolean
}

export interface SpentReceiptStore {
  isSpent(receipt_hash: string): boolean
  markSpent(receipt_hash: string): void
}

export interface KeysetStore {
  getKeyset(keyset_id: string, subject_id: string): KeysetRecord | null
}

// ── Receipt verification ────────────────────────────────────────────

/**
 * Verify an interaction receipt per 12-receipt-spec.md verification steps.
 *
 * Returns StepResult with ok=true if all checks pass, or ok=false with
 * the appropriate reject_code and reject_detail.
 */
export function verifyReceipt(
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

// ── Spent receipt check ─────────────────────────────────────────────

/**
 * Check if a receipt's hash has already been spent.
 * receipt_hash = sha256Hex(r) per 12-receipt-spec.md.
 */
export function checkReceiptSpent(
  r: string,
  spentStore: SpentReceiptStore,
): StepResult {
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

// ── Keyset window bounds check ──────────────────────────────────────

/**
 * Verify that a keyset's validity period falls within the claimed time window.
 *
 * Per 12-receipt-spec.md: "The verifier confirms the keyset's time period
 * falls within the claimed time_window_id's bounds"
 */
export function checkKeysetWindowBounds(
  keyset: KeysetRecord,
  window_start: number,
  window_end: number,
): StepResult {
  if (keyset.keyset_start < window_start || keyset.keyset_end > window_end) {
    return {
      ok: false,
      reject_code: 'invalid_timeblind_proof',
      reject_detail: `Keyset period [${keyset.keyset_start},${keyset.keyset_end}] outside window [${window_start},${window_end}]`,
    }
  }
  return { ok: true }
}
