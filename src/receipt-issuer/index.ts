/**
 * Receipt Issuer — Blind signing and keyset management.
 *
 * Spec: 12-receipt-spec.md (Issuance Flow, Keyset Rotation and Temporal Binding)
 *
 * Responsibilities:
 * - Manage per-subject keysets with temporal rotation
 * - Enforce non-overlapping keyset validity periods
 * - Maintain keyset registry (expired keysets remain for verification)
 */

import type { KeysetRecord } from '../shared/types.js'

// ── Keyset registry ─────────────────────────────────────────────────

/**
 * Manages issuer keysets with overlap detection and subject scoping.
 *
 * Per 12-receipt-spec.md:
 * - Keysets are scoped per subject_id
 * - Validity periods [keyset_start, keyset_end) must not overlap for same subject
 * - Expired keysets remain in registry for verification of previously-issued receipts
 */
export class KeysetRegistry {
  private keysets: KeysetRecord[] = []

  add(keyset: KeysetRecord): void {
    for (const existing of this.keysets) {
      if (
        existing.subject_id === keyset.subject_id &&
        existing.keyset_start < keyset.keyset_end &&
        keyset.keyset_start < existing.keyset_end
      ) {
        throw new Error(
          `Keyset overlap: ${existing.keyset_id} [${existing.keyset_start},${existing.keyset_end}] ` +
          `overlaps with ${keyset.keyset_id} [${keyset.keyset_start},${keyset.keyset_end}]`,
        )
      }
    }
    this.keysets.push(keyset)
  }

  getForSubject(keyset_id: string, subject_id: string): KeysetRecord | null {
    return this.keysets.find(
      (k) => k.keyset_id === keyset_id && k.subject_id === subject_id,
    ) ?? null
  }

  getAllForSubject(subject_id: string): KeysetRecord[] {
    return this.keysets.filter((k) => k.subject_id === subject_id)
  }
}
