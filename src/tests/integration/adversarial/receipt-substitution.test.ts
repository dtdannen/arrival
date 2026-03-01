import { describe, it, expect } from 'vitest'
import { sha256Hex } from '../../helpers/crypto.js'
import { makeReceipt, makeKeyset } from '../../helpers/fixtures.js'
import type { InteractionProof, KeysetRecord, StepResult } from '../../helpers/types.js'

/**
 * Adversarial — Receipt Substitution Tests
 * Spec: 10-test-plan.md Adversarial Test #3, 12-receipt-spec.md Subject Binding
 *
 * Attack: attacker uses a receipt issued for subject A to submit a review for subject B.
 * Defense: issuer keys are scoped per subject_id; receipt verification rejects cross-subject receipts.
 */

// ── Simulated issuer registry ────────────────────────────────────────

interface IssuerRegistry {
  getKeyset(keyset_id: string, subject_id: string): KeysetRecord | null
}

function makeIssuerRegistry(keysets: KeysetRecord[]): IssuerRegistry {
  return {
    getKeyset(keyset_id, subject_id) {
      return keysets.find((k) => k.keyset_id === keyset_id && k.subject_id === subject_id) || null
    },
  }
}

function verifyInteractionReceipt(
  receipt: InteractionProof,
  claimed_subject_id: string,
  registry: IssuerRegistry,
): StepResult {
  // Step 1: keyset_id maps to a known, accepted issuer for the claimed subject_id
  const keyset = registry.getKeyset(receipt.keyset_id, claimed_subject_id)
  if (!keyset) {
    return {
      ok: false,
      reject_code: 'invalid_interaction_proof',
      reject_detail: `Keyset ${receipt.keyset_id} not found for subject ${claimed_subject_id}`,
    }
  }

  // Step 2: Verify blind signature (mocked — would use RSABSSA Verify(pk, r, S))
  // In production: verify the RSA signature S over r using the keyset's public key
  // For this test we assume signature verification passes when keyset matches

  return { ok: true }
}

describe('Adversarial — Receipt Substitution', () => {
  it('T-1402: Wrong receipt for subject — rejected with invalid_interaction_proof', () => {
    // Issuer has keysets scoped per subject
    const keysetA = makeKeyset({ keyset_id: 'ks-subjectA', subject_id: 'subject-A' })
    const keysetB = makeKeyset({ keyset_id: 'ks-subjectB', subject_id: 'subject-B' })
    const registry = makeIssuerRegistry([keysetA, keysetB])

    // Attacker has a receipt issued for subject-A
    const receiptForA: InteractionProof = {
      r: sha256Hex('attacker-receipt-secret'),
      S: sha256Hex('attacker-receipt-sig'),
      keyset_id: 'ks-subjectA', // This keyset belongs to subject-A
    }

    // Attacker tries to use it for a review of subject-B
    const result = verifyInteractionReceipt(receiptForA, 'subject-B', registry)

    expect(result.ok).toBe(false)
    expect(result.reject_code).toBe('invalid_interaction_proof')
    expect(result.reject_detail).toContain('not found for subject subject-B')

    // Verify the same receipt works for the correct subject
    const validResult = verifyInteractionReceipt(receiptForA, 'subject-A', registry)
    expect(validResult.ok).toBe(true)
  })

  it('T-1408: Issuer collusion receipt for non-customer — passes verification (known residual risk)', () => {
    // Per 12-receipt-spec.md Residual Risk #1 and 06-trust-model.md Residual Risk #6:
    // "An issuer could issue receipts to non-customers (fake interactions).
    //  Mitigated by issuer governance and reputation."
    //
    // This is a KNOWN residual risk. A colluding issuer can produce valid
    // receipts for people who never interacted. The protocol cannot prevent this
    // cryptographically — the mitigation is governance (issuer vetting).

    const colludingKeyset = makeKeyset({
      keyset_id: 'ks-colluding',
      subject_id: 'subject-colluding',
      issuer_id: 'issuer-colluding',
    })
    const registry = makeIssuerRegistry([colludingKeyset])

    // Non-customer gets a receipt from colluding issuer
    const fakeReceipt: InteractionProof = {
      r: sha256Hex('non-customer-secret'),
      S: sha256Hex('colluding-issuer-signed-this'),
      keyset_id: 'ks-colluding',
    }

    // This passes verification — the receipt is technically valid
    const result = verifyInteractionReceipt(fakeReceipt, 'subject-colluding', registry)

    // This is expected: the protocol cannot distinguish real from colluded receipts
    expect(result.ok).toBe(true)
    // The test documents this as a known residual risk, not a bug
  })
})
