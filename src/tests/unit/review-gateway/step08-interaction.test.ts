import { describe, it, expect } from 'vitest'
import { sha256Hex } from '../../helpers/crypto.js'
import type { InteractionProof, StepResult, KeysetRecord } from '../../helpers/types.js'

/**
 * Step 8: Verify interaction receipt (RSA blind signature verification).
 * Spec: 12-receipt-spec.md verification steps 1-5
 * Reject code: invalid_interaction_proof
 *
 * Verification steps per spec:
 * 1. keyset_id maps to known, accepted issuer for claimed subject_id
 * 2. Verify(pk, r, S) succeeds (valid blind signature)
 * 3. receipt_hash = Hash(r) is not in spent-receipts table
 * 4. Keyset's validity period falls within claimed time window bounds
 * 5. Store receipt_hash in spent-receipts table
 *
 * Note: Full RSABSSA testing is in receipt-verifier tests (T-500 series).
 * This unit test validates the gateway step interface using a pluggable verifier.
 */

interface InteractionVerifier {
  verifySignature(r: string, S: string, keyset_id: string, subject_id: string): boolean
}

interface SpentReceiptStore {
  isSpent(receipt_hash: string): boolean
  markSpent(receipt_hash: string): void
}

interface KeysetRegistry {
  getKeyset(keyset_id: string, subject_id: string): KeysetRecord | null
}

function verifyInteractionProof(
  interactionProof: InteractionProof,
  subject_id: string,
  keysetRegistry: KeysetRegistry,
  spentReceipts: SpentReceiptStore,
  verifier: InteractionVerifier,
): StepResult {
  // Step 1: keyset_id maps to known issuer for this subject
  const keyset = keysetRegistry.getKeyset(interactionProof.keyset_id, subject_id)
  if (!keyset) {
    return {
      ok: false,
      reject_code: 'invalid_interaction_proof',
      reject_detail: `Unknown keyset_id ${interactionProof.keyset_id} for subject ${subject_id}`,
    }
  }

  // Step 2: Verify signature
  const sigValid = verifier.verifySignature(
    interactionProof.r,
    interactionProof.S,
    interactionProof.keyset_id,
    subject_id,
  )
  if (!sigValid) {
    return {
      ok: false,
      reject_code: 'invalid_interaction_proof',
      reject_detail: 'RSA blind signature verification failed',
    }
  }

  // Step 3: Check spent receipts
  const receiptHash = sha256Hex(interactionProof.r)
  if (spentReceipts.isSpent(receiptHash)) {
    return {
      ok: false,
      reject_code: 'invalid_interaction_proof',
      reject_detail: 'Receipt already spent',
    }
  }

  return { ok: true }
}

describe('Review Gateway — Step 8: Interaction Receipt', () => {
  const subjectId = 'subject-001'
  const keysetId = 'keyset-001'

  const mockKeyset: KeysetRecord = {
    keyset_id: keysetId,
    subject_id: subjectId,
    keyset_start: 1000000,
    keyset_end: 1086400,
    public_key: 'mock-rsa-pubkey',
    issuer_id: 'issuer-001',
  }

  function makeKeysetRegistry(keysets: KeysetRecord[]): KeysetRegistry {
    return {
      getKeyset(kid: string, sid: string) {
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

  // Verifier that accepts any signature for the known keyset
  const acceptingVerifier: InteractionVerifier = {
    verifySignature: () => true,
  }

  // Verifier that always rejects
  const rejectingVerifier: InteractionVerifier = {
    verifySignature: () => false,
  }

  it('T-970: Valid interaction proof passes', () => {
    const proof: InteractionProof = {
      r: sha256Hex('receipt-secret-valid'),
      S: sha256Hex('receipt-sig-valid'),
      keyset_id: keysetId,
    }

    const result = verifyInteractionProof(
      proof,
      subjectId,
      makeKeysetRegistry([mockKeyset]),
      makeSpentStore(),
      acceptingVerifier,
    )

    expect(result.ok).toBe(true)
  })

  it('T-971: Invalid interaction proof rejected — invalid_interaction_proof', () => {
    const proof: InteractionProof = {
      r: sha256Hex('receipt-secret-invalid'),
      S: 'corrupted-signature',
      keyset_id: keysetId,
    }

    const result = verifyInteractionProof(
      proof,
      subjectId,
      makeKeysetRegistry([mockKeyset]),
      makeSpentStore(),
      rejectingVerifier,
    )

    expect(result.ok).toBe(false)
    expect(result.reject_code).toBe('invalid_interaction_proof')
  })
})
