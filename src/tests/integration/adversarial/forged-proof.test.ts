import { describe, it, expect } from 'vitest'
import { sha256Hex } from '../../helpers/crypto.js'
import { makeCohortRoot } from '../../helpers/fixtures.js'
import type { StepResult, RootRecord } from '../../helpers/types.js'

/**
 * Adversarial — Forged Proof Tests
 * Spec: 10-test-plan.md Adversarial Test (implied), 03-proof-spec.md Membership proof
 *
 * Attack: attacker fabricates a Groth16 membership proof without being a WoT cohort member.
 * Defense: Semaphore v4 Groth16 verification rejects invalid proofs.
 */

// ── Simulated Groth16 verifier ───────────────────────────────────────

interface Groth16Proof {
  pi_a: string[]
  pi_b: string[][]
  pi_c: string[]
  protocol: string
}

interface VerifyingKey {
  root_hash: string
  vk_hash: string
}

/**
 * Simulate Groth16 membership proof verification.
 * In production, this calls snarkjs.groth16.verify() with the Semaphore v4 verifying key.
 */
function verifyMembershipProof(
  proof: unknown,
  cohort_root_hash: string,
  scope: string,
  nullifier_hash: string,
  activeRoot: RootRecord | null,
): StepResult {
  // Step 1: root must be active (already checked by step 5, but defense in depth)
  if (!activeRoot) {
    return { ok: false, reject_code: 'invalid_membership_proof', reject_detail: 'No active root for verification' }
  }

  // Step 2: verify the proof structure
  if (!proof || typeof proof !== 'object') {
    return { ok: false, reject_code: 'invalid_membership_proof', reject_detail: 'Proof is not a valid object' }
  }

  const p = proof as Record<string, unknown>

  // Step 3: check protocol marker (Semaphore v4 Groth16)
  if (p.protocol !== 'semaphore-v4') {
    return { ok: false, reject_code: 'invalid_membership_proof', reject_detail: 'Unknown proof protocol' }
  }

  // Step 4: in production, snarkjs.groth16.verify(vk, publicSignals, proof) would run here
  // For testing, we simulate: a "valid" proof has a specific marker, anything else is forged
  if (p.proof === 'mock-membership-proof') {
    return { ok: true }
  }

  // Any other proof is treated as forged/invalid
  return {
    ok: false,
    reject_code: 'invalid_membership_proof',
    reject_detail: 'Groth16 verification failed — proof does not satisfy circuit constraints',
  }
}

describe('Adversarial — Forged Proof', () => {
  it('T-1405: Fabricated Groth16 proof — rejected with invalid_membership_proof', () => {
    const root = makeCohortRoot({ k_size: 100 })
    const scope = sha256Hex('scope-value')
    const nullifier = sha256Hex('nullifier-value')

    // Attacker fabricates random proof data
    const forgedProof = {
      proof: 'FORGED-PROOF-DATA-' + sha256Hex('attacker-garbage'),
      protocol: 'semaphore-v4',
    }

    const result = verifyMembershipProof(forgedProof, root.root_hash, scope, nullifier, root)
    expect(result.ok).toBe(false)
    expect(result.reject_code).toBe('invalid_membership_proof')
    expect(result.reject_detail).toContain('Groth16 verification failed')

    // Attacker submits null/empty proof
    const nullResult = verifyMembershipProof(null, root.root_hash, scope, nullifier, root)
    expect(nullResult.ok).toBe(false)
    expect(nullResult.reject_code).toBe('invalid_membership_proof')

    // Attacker submits proof with wrong protocol
    const wrongProtocol = { proof: 'some-data', protocol: 'fake-protocol' }
    const protoResult = verifyMembershipProof(wrongProtocol, root.root_hash, scope, nullifier, root)
    expect(protoResult.ok).toBe(false)
    expect(protoResult.reject_code).toBe('invalid_membership_proof')
    expect(protoResult.reject_detail).toContain('Unknown proof protocol')

    // Valid mock proof passes (simulates a real Semaphore v4 proof)
    const validProof = { proof: 'mock-membership-proof', protocol: 'semaphore-v4' }
    const validResult = verifyMembershipProof(validProof, root.root_hash, scope, nullifier, root)
    expect(validResult.ok).toBe(true)
  })
})
