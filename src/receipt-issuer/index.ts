/**
 * Receipt Issuer — Blind signing and keyset management.
 *
 * Spec: 12-receipt-spec.md (Issuance Flow, Keyset Rotation and Temporal Binding)
 *
 * Responsibilities:
 * - Blind-sign interaction receipts via RSABSSA (RFC 9474)
 * - Manage per-subject keysets with temporal rotation
 * - Enforce non-overlapping keyset validity periods
 * - Maintain keyset registry (expired keysets remain for verification)
 */

import { RSABSSA } from '@cloudflare/blindrsa-ts'
import type { KeysetRecord } from '../shared/types.js'

// ── RSABSSA suite ────────────────────────────────────────────────────

/** RFC 9474 RSABSSA-SHA384-PSS-Randomized — the standard suite for blind RSA. */
const suite = RSABSSA.SHA384.PSS.Randomized()

// ── Key generation ───────────────────────────────────────────────────

/**
 * Generate an RSA key pair for blind signing.
 * Per 12-receipt-spec.md: issuer maintains RSA keys per subject keyset.
 */
export async function generateIssuerKeyPair(
  modulusLength = 2048,
): Promise<CryptoKeyPair> {
  return suite.generateKey({
    modulusLength,
    publicExponent: new Uint8Array([1, 0, 1]),
  })
}

// ── Blind signing (issuer endpoint) ──────────────────────────────────

/**
 * Sign a blinded value B, returning S_blind.
 *
 * Per 12-receipt-spec.md Issuance Flow step 5:
 * "Issuer validates context, signs with the active keyset:
 *  S_blind = Sign(sk, B)"
 *
 * The issuer never sees the original value r — only the blinded B.
 */
export async function blindSign(
  privateKey: CryptoKey,
  blindedMsg: Uint8Array,
): Promise<Uint8Array> {
  return suite.blindSign(privateKey, blindedMsg)
}

// ── Client-side helpers (used by proof-engine) ──────────────────────

/**
 * Client blinds a message before sending to issuer.
 * Per 12-receipt-spec.md Issuance Flow step 3:
 * "Client blinds: B = Blind(pk, r)"
 *
 * Returns { blindedMsg, inv } where inv is needed for unblinding.
 */
export async function blindMessage(
  publicKey: CryptoKey,
  msg: Uint8Array,
): Promise<{ blindedMsg: Uint8Array; inv: Uint8Array }> {
  return suite.blind(publicKey, msg)
}

/**
 * Client unblinds the issuer's blind signature to get the final signature.
 * Per 12-receipt-spec.md Issuance Flow step 6:
 * "Client unblinds: S = Unblind(pk, r, S_blind, inv)"
 */
export async function finalize(
  publicKey: CryptoKey,
  msg: Uint8Array,
  blindSig: Uint8Array,
  inv: Uint8Array,
): Promise<Uint8Array> {
  return suite.finalize(publicKey, msg, blindSig, inv)
}

/**
 * Verify an unblinded signature.
 * Per 12-receipt-spec.md Verification step 2:
 * "Verify(pk, r, S) succeeds"
 */
export async function verifySignature(
  publicKey: CryptoKey,
  signature: Uint8Array,
  message: Uint8Array,
): Promise<boolean> {
  return suite.verify(publicKey, signature, message)
}

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
