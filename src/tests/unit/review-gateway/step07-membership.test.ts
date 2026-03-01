import { describe, it, expect } from 'vitest'
import { sha256Hex } from '../../helpers/crypto.js'
import type { StepResult } from '../../helpers/types.js'

/**
 * Step 7: Verify WoT membership proof (Semaphore v4 Groth16).
 * Spec: 03-proof-spec.md statement 1
 * Reject code: invalid_membership_proof
 *
 * Note: Full ZK proof generation/verification is tested in circuit tests (T-700 series).
 * This unit test validates the gateway's verification interface and error handling
 * using a pluggable verifier.
 */

interface MembershipVerifier {
  verify(proof: unknown, root_hash: string): boolean
}

function verifyMembershipProof(
  membershipProof: unknown,
  cohortRootHash: string,
  verifier: MembershipVerifier,
): StepResult {
  try {
    if (!membershipProof || typeof membershipProof !== 'object') {
      return {
        ok: false,
        reject_code: 'invalid_membership_proof',
        reject_detail: 'Membership proof is missing or malformed',
      }
    }
    const valid = verifier.verify(membershipProof, cohortRootHash)
    if (!valid) {
      return {
        ok: false,
        reject_code: 'invalid_membership_proof',
        reject_detail: 'Membership ZK proof verification failed',
      }
    }
    return { ok: true }
  } catch {
    return {
      ok: false,
      reject_code: 'invalid_membership_proof',
      reject_detail: 'Membership proof verification threw an error',
    }
  }
}

describe('Review Gateway — Step 7: Membership Proof', () => {
  const validRootHash = sha256Hex('valid-cohort-root')

  // A verifier that accepts proofs containing a matching root_hash marker
  const testVerifier: MembershipVerifier = {
    verify(proof: unknown, root_hash: string): boolean {
      const p = proof as Record<string, unknown>
      return p.protocol === 'semaphore-v4' && p.target_root === root_hash
    },
  }

  it('T-960: Valid ZK membership proof passes', () => {
    const validProof = {
      protocol: 'semaphore-v4',
      target_root: validRootHash,
      proof_data: 'groth16-proof-bytes',
    }

    const result = verifyMembershipProof(validProof, validRootHash, testVerifier)

    expect(result.ok).toBe(true)
  })

  it('T-961: Invalid membership proof rejected — invalid_membership_proof', () => {
    // Proof that targets a different root
    const invalidProof = {
      protocol: 'semaphore-v4',
      target_root: sha256Hex('wrong-root'),
      proof_data: 'groth16-proof-bytes',
    }

    const result = verifyMembershipProof(invalidProof, validRootHash, testVerifier)

    expect(result.ok).toBe(false)
    expect(result.reject_code).toBe('invalid_membership_proof')
  })
})
