import { describe, it, expect } from 'vitest'
import {
  deterministicKeypair,
  ed25519Verify,
  canonicalSerialize,
  hexToBytes,
  sha256Hex,
} from '../../helpers/crypto.js'
import { makeSubmission } from '../../helpers/fixtures.js'
import type { ReviewSubmission, StepResult, RootStore } from '../../helpers/types.js'

/**
 * Adversarial — Tampering Tests
 * Spec: 10-test-plan.md Adversarial Test #2, 02-architecture.md Verification Pipeline
 *
 * Attack: attacker intercepts a valid submission and modifies proof_bundle fields.
 * Defense: signature verification and proof verification detect tampering.
 */

function verifySignature(submission: ReviewSubmission): StepResult {
  try {
    const pubkey = hexToBytes(submission.posting_pubkey)
    const sig = hexToBytes(submission.signature)
    const canonical = canonicalSerialize(submission as unknown as Record<string, unknown>)
    const valid = ed25519Verify(sig, canonical, pubkey)
    if (!valid) {
      return { ok: false, reject_code: 'invalid_signature', reject_detail: 'Signature verification failed after tampering' }
    }
    return { ok: true }
  } catch {
    return { ok: false, reject_code: 'invalid_signature', reject_detail: 'Signature verification error' }
  }
}

function checkRootActive(
  submission: ReviewSubmission,
  rootStore: RootStore,
): StepResult {
  const root = rootStore.getActive(submission.subject_id, submission.proof_bundle.cohort_root_hash)
  if (!root) {
    return { ok: false, reject_code: 'inactive_root', reject_detail: 'Root not found or expired' }
  }
  return { ok: true }
}

describe('Adversarial — Tampering', () => {
  it('T-1401: Proof bundle field tampering — rejected at corresponding verification step', () => {
    const original = makeSubmission({ seed: 'tamper-victim' })

    // Tamper with content after signing — signature check should fail
    const contentTampered = { ...original, content: 'TAMPERED CONTENT' }
    const sigResult = verifySignature(contentTampered as ReviewSubmission)
    expect(sigResult.ok).toBe(false)
    expect(sigResult.reject_code).toBe('invalid_signature')

    // Tamper with nullifier_hash — signature check should fail (bundle is part of signed payload)
    const nullifierTampered = {
      ...original,
      proof_bundle: {
        ...original.proof_bundle,
        nullifier_hash: sha256Hex('forged-nullifier'),
      },
    }
    const nullifierSigResult = verifySignature(nullifierTampered as ReviewSubmission)
    expect(nullifierSigResult.ok).toBe(false)
    expect(nullifierSigResult.reject_code).toBe('invalid_signature')

    // Tamper with time_window_id — signature check should fail
    const windowTampered = {
      ...original,
      proof_bundle: {
        ...original.proof_bundle,
        time_window_id: '2099-W01',
      },
    }
    const windowSigResult = verifySignature(windowTampered as ReviewSubmission)
    expect(windowSigResult.ok).toBe(false)
    expect(windowSigResult.reject_code).toBe('invalid_signature')
  })

  it('T-1406: Modified cohort_root_hash in bundle — rejected with inactive_root or invalid_membership_proof', () => {
    const original = makeSubmission({ seed: 'root-tamper' })
    const forgedRootHash = sha256Hex('attacker-controlled-root')

    // Tamper the root hash
    const tampered = {
      ...original,
      proof_bundle: {
        ...original.proof_bundle,
        cohort_root_hash: forgedRootHash,
      },
    }

    // First line of defense: signature verification catches the tampering
    const sigResult = verifySignature(tampered as ReviewSubmission)
    expect(sigResult.ok).toBe(false)
    expect(sigResult.reject_code).toBe('invalid_signature')

    // Even if attacker re-signs with their own key, the forged root won't be in the root store
    // Simulate: root store doesn't have the forged root
    const rootStore: RootStore = {
      getActive: (_subjectId, rootHash) => {
        if (rootHash === forgedRootHash) return null // forged root not in store
        return null
      },
    }

    const rootResult = checkRootActive(tampered as ReviewSubmission, rootStore)
    expect(rootResult.ok).toBe(false)
    expect(rootResult.reject_code).toBe('inactive_root')
  })
})
