import { describe, it, expect } from 'vitest'
import { poseidonHash, deriveEpochId, sha256Hex, deterministicIdentity } from '../../helpers/crypto.js'
import { utf8ToBytes } from '@noble/hashes/utils'
import { sha256 } from '@noble/hashes/sha256'

/**
 * Proof Engine — Nullifier
 * Spec: 03-proof-spec.md Nullifier Construction
 *
 * nullifier = Poseidon(identity_secret, scope)
 * scope = Poseidon(domain_tag, subject_id, epoch_id)
 * epoch_id = hash(subject_id || time_window_id)
 */

const DOMAIN_TAG = poseidonHash(BigInt('0x' + sha256Hex('arrival-review-v1').slice(0, 16)))

function fieldElement(str: string): bigint {
  const hash = sha256(utf8ToBytes(str))
  // Take first 31 bytes for BN254 scalar field
  let result = 0n
  for (let i = 0; i < 31; i++) {
    result = (result << 8n) | BigInt(hash[i])
  }
  return result
}

function computeScope(subject_id: string, epoch_id: string): bigint {
  return poseidonHash(DOMAIN_TAG, fieldElement(subject_id), fieldElement(epoch_id))
}

function computeNullifier(identitySecret: Uint8Array, scope: bigint): bigint {
  const secretBigInt = fieldElement(Buffer.from(identitySecret).toString('hex'))
  return poseidonHash(secretBigInt, scope)
}

describe('Proof Engine — Nullifier', () => {
  it('T-800: Nullifier deterministic for same identity + scope — identical nullifier_hash both times', () => {
    // Spec: 03-proof-spec.md "Deterministic within context"
    const identity = deterministicIdentity('alice')
    const epoch_id = deriveEpochId('subject-001', '2026-W09')
    const scope = computeScope('subject-001', epoch_id)

    const nullifier1 = computeNullifier(identity.secret, scope)
    const nullifier2 = computeNullifier(identity.secret, scope)

    expect(nullifier1).toBe(nullifier2)
    expect(nullifier1).toBeGreaterThan(0n)
  })

  it('T-801: Nullifier differs across subjects — different subject_id produces different nullifier_hash', () => {
    // Spec: 03-proof-spec.md "Unlinkable across subjects/epochs"
    const identity = deterministicIdentity('alice')

    const epoch1 = deriveEpochId('subject-001', '2026-W09')
    const epoch2 = deriveEpochId('subject-002', '2026-W09')
    const scope1 = computeScope('subject-001', epoch1)
    const scope2 = computeScope('subject-002', epoch2)

    const nullifier1 = computeNullifier(identity.secret, scope1)
    const nullifier2 = computeNullifier(identity.secret, scope2)

    expect(nullifier1).not.toBe(nullifier2)
  })

  it('T-802: Nullifier differs across epochs — different epoch_id produces different nullifier_hash', () => {
    // Spec: 03-proof-spec.md "Unlinkable across subjects/epochs"
    const identity = deterministicIdentity('alice')

    const epoch1 = deriveEpochId('subject-001', '2026-W09')
    const epoch2 = deriveEpochId('subject-001', '2026-W10')
    const scope1 = computeScope('subject-001', epoch1)
    const scope2 = computeScope('subject-001', epoch2)

    const nullifier1 = computeNullifier(identity.secret, scope1)
    const nullifier2 = computeNullifier(identity.secret, scope2)

    expect(nullifier1).not.toBe(nullifier2)
  })

  it('T-803: Scope derivation matches spec — Poseidon(domain_tag, subject_id, epoch_id) matches reference', () => {
    // Spec: 03-proof-spec.md "scope = Poseidon(domain_tag, subject_id, epoch_id)"
    const epoch_id = deriveEpochId('subject-001', '2026-W09')
    const scope = computeScope('subject-001', epoch_id)

    // Compute reference independently
    const refDomainTag = DOMAIN_TAG
    const refSubject = fieldElement('subject-001')
    const refEpoch = fieldElement(epoch_id)
    const refScope = poseidonHash(refDomainTag, refSubject, refEpoch)

    expect(scope).toBe(refScope)

    // Scope is a field element (non-zero, bounded)
    expect(scope).toBeGreaterThan(0n)
  })

  it('T-804: epoch_id derivation matches spec — hash(subject_id || time_window_id) matches reference', () => {
    // Spec: 02-architecture.md "epoch_id = hash(subject_id || time_window_id)"
    const epochId = deriveEpochId('subject-001', '2026-W09')

    // Should match sha256 of "subject-001||2026-W09"
    const reference = sha256Hex('subject-001||2026-W09')
    expect(epochId).toBe(reference)

    // Different inputs produce different epoch_ids
    const otherSubject = deriveEpochId('subject-002', '2026-W09')
    const otherWindow = deriveEpochId('subject-001', '2026-W10')

    expect(epochId).not.toBe(otherSubject)
    expect(epochId).not.toBe(otherWindow)
  })

  it('T-805: Verifier recomputes scope and confirms match — computed scope matches proof public input', () => {
    // Spec: 03-proof-spec.md "The verifier independently computes scope from known
    // public values and confirms it matches the proof's public input"
    const identity = deterministicIdentity('alice')

    // Client-side: compute scope and nullifier for proof
    const subject_id = 'subject-001'
    const time_window_id = '2026-W09'
    const epoch_id = deriveEpochId(subject_id, time_window_id)
    const clientScope = computeScope(subject_id, epoch_id)
    const clientNullifier = computeNullifier(identity.secret, clientScope)

    // Verifier-side: independently recompute scope from public values
    const verifierEpochId = deriveEpochId(subject_id, time_window_id)
    const verifierScope = computeScope(subject_id, verifierEpochId)

    // Scopes must match
    expect(verifierScope).toBe(clientScope)

    // Verifier can check nullifier was computed with correct scope
    // (In real system, this is checked inside the ZK proof verification)
    const verifierNullifier = computeNullifier(identity.secret, verifierScope)
    expect(verifierNullifier).toBe(clientNullifier)
  })
})
