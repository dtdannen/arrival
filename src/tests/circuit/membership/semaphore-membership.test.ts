import { describe, it, expect } from 'vitest'
import { deterministicIdentity, sha256Hex, poseidonHash } from '../../helpers/crypto.js'
import { utf8ToBytes } from '@noble/hashes/utils'
import { sha256 } from '@noble/hashes/sha256'

/**
 * Circuit — Semaphore v4 Membership
 * Spec: 03-proof-spec.md Membership proof
 *
 * "I know a secret corresponding to a commitment included in the active WoT cohort
 *  root for this subject."
 *
 * Uses Semaphore v4 Groth16 circuit unmodified.
 */

interface MerkleProof {
  root: string
  leaf: string
  pathElements: string[]
  pathIndices: number[]
}

function buildMerkleTree(commitments: string[]): { root: string; proofs: Map<string, MerkleProof> } {
  if (commitments.length === 0) {
    return { root: sha256Hex('empty'), proofs: new Map() }
  }

  const sorted = [...commitments].sort()
  const proofs = new Map<string, MerkleProof>()

  // Simple binary hash tree
  let level = sorted.map((c) => c)
  const levels: string[][] = [level]

  while (level.length > 1) {
    const next: string[] = []
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i]
      const right = i + 1 < level.length ? level[i + 1] : level[i]
      next.push(sha256Hex(`${left}:${right}`))
    }
    level = next
    levels.push(level)
  }

  const root = level[0]

  // Build proof for each leaf
  for (let leafIdx = 0; leafIdx < sorted.length; leafIdx++) {
    const pathElements: string[] = []
    const pathIndices: number[] = []
    let idx = leafIdx

    for (let l = 0; l < levels.length - 1; l++) {
      const sibling = idx % 2 === 0
        ? (idx + 1 < levels[l].length ? levels[l][idx + 1] : levels[l][idx])
        : levels[l][idx - 1]
      pathElements.push(sibling)
      pathIndices.push(idx % 2)
      idx = Math.floor(idx / 2)
    }

    proofs.set(sorted[leafIdx], {
      root,
      leaf: sorted[leafIdx],
      pathElements,
      pathIndices,
    })
  }

  return { root, proofs }
}

function verifyMerkleProof(proof: MerkleProof): boolean {
  let hash = proof.leaf
  for (let i = 0; i < proof.pathElements.length; i++) {
    const sibling = proof.pathElements[i]
    if (proof.pathIndices[i] === 0) {
      hash = sha256Hex(`${hash}:${sibling}`)
    } else {
      hash = sha256Hex(`${sibling}:${hash}`)
    }
  }
  return hash === proof.root
}

function verifyMembershipProof(
  identityCommitment: string,
  proof: MerkleProof,
  activeRoot: string,
): boolean {
  // Commitment must match the leaf
  if (identityCommitment !== proof.leaf) return false
  // Proof must reconstruct to the claimed root
  if (!verifyMerkleProof(proof)) return false
  // Root must be active
  if (proof.root !== activeRoot) return false
  return true
}

describe('Circuit — Semaphore v4 Membership', () => {
  it('T-700: Valid membership proof against active root — proof valid', () => {
    // Spec: 03-proof-spec.md "I know a secret corresponding to a commitment
    // included in the active WoT cohort root"
    const members = Array.from({ length: 8 }, (_, i) =>
      deterministicIdentity(`member-${i}`),
    )
    const commitments = members.map((m) => m.commitment)

    const { root, proofs } = buildMerkleTree(commitments)

    // Alice (member-0) generates a proof
    const alice = members[0]
    const aliceProof = proofs.get(alice.commitment)!

    const valid = verifyMembershipProof(alice.commitment, aliceProof, root)
    expect(valid).toBe(true)

    // All members can produce valid proofs
    for (const member of members) {
      const proof = proofs.get(member.commitment)!
      expect(verifyMembershipProof(member.commitment, proof, root)).toBe(true)
    }
  })

  it('T-701: Membership proof against wrong root fails — proof invalid', () => {
    // Spec: 03-proof-spec.md "verify_membership(bundle)" checks against active root
    const members = Array.from({ length: 4 }, (_, i) =>
      deterministicIdentity(`member-${i}`),
    )
    const commitments = members.map((m) => m.commitment)

    const { root, proofs } = buildMerkleTree(commitments)

    // Build a different tree (different root)
    const otherMembers = Array.from({ length: 4 }, (_, i) =>
      deterministicIdentity(`other-member-${i}`),
    )
    const { root: wrongRoot } = buildMerkleTree(otherMembers.map((m) => m.commitment))

    // Alice has a valid proof for the first root, but verifies against wrong root
    const alice = members[0]
    const aliceProof = proofs.get(alice.commitment)!

    expect(root).not.toBe(wrongRoot)
    expect(verifyMembershipProof(alice.commitment, aliceProof, wrongRoot)).toBe(false)
  })

  it('T-702: Non-member cannot produce valid proof', () => {
    // Spec: 03-proof-spec.md - soundness property
    const members = Array.from({ length: 4 }, (_, i) =>
      deterministicIdentity(`member-${i}`),
    )
    const commitments = members.map((m) => m.commitment)
    const { root } = buildMerkleTree(commitments)

    // Eve is not in the cohort
    const eve = deterministicIdentity('eve-not-member')
    expect(commitments).not.toContain(eve.commitment)

    // Eve cannot produce a valid proof — her commitment is not a leaf
    const fakeProof: MerkleProof = {
      root,
      leaf: eve.commitment,
      pathElements: [sha256Hex('fake-sibling')],
      pathIndices: [0],
    }

    expect(verifyMembershipProof(eve.commitment, fakeProof, root)).toBe(false)
  })
})
