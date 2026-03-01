import { describe, it, expect } from 'vitest'
import { sha256Hex, deterministicIdentity, graphSnapshotHash } from '../../helpers/crypto.js'
import type { RootRecord } from '../../helpers/types.js'

/**
 * Cohort Root Publisher — Merkle Tree
 * Spec: 02-architecture.md Component 3 (cohort-root-publisher)
 *
 * "builds cohort Merkle trees per distance tier (d<=1, d<=2, d<=3) for each subject"
 * "publishes roots and metadata including distance bucket and cohort size per tier"
 */

interface MemberCommitment {
  commitment: string
  distance: number
}

function buildMerkleRoot(commitments: string[]): string {
  if (commitments.length === 0) return sha256Hex('empty-tree')
  const sorted = [...commitments].sort()
  // Simple hash-chain Merkle root for testing
  let hash = sorted[0]
  for (let i = 1; i < sorted.length; i++) {
    hash = sha256Hex(`${hash}:${sorted[i]}`)
  }
  return hash
}

function buildCohortRoots(
  subject_id: string,
  members: MemberCommitment[],
  graph: Map<string, string[]>,
  validFrom: number,
  validTo: number,
): RootRecord[] {
  const tiers = [1, 2, 3]
  const snapshot = graphSnapshotHash(graph)

  return tiers.map((bucket) => {
    const tierMembers = members.filter((m) => m.distance <= bucket)
    const commitments = tierMembers.map((m) => m.commitment)
    const rootHash = buildMerkleRoot(commitments)

    return {
      root_id: `root-${subject_id}-d${bucket}`,
      subject_id,
      root_hash: rootHash,
      k_size: tierMembers.length,
      distance_bucket: bucket,
      graph_snapshot_hash: snapshot,
      valid_from: validFrom,
      valid_to: validTo,
    }
  })
}

describe('Cohort Root Publisher — Merkle Tree', () => {
  it('T-300: Build Merkle tree per distance tier — three roots with correct members and k_size', () => {
    // Spec: 02-architecture.md "builds cohort Merkle trees per distance tier (d<=1, d<=2, d<=3)"
    const d1Members = Array.from({ length: 5 }, (_, i) =>
      ({ commitment: deterministicIdentity(`d1-member-${i}`).commitment, distance: 1 }),
    )
    const d2Members = Array.from({ length: 10 }, (_, i) =>
      ({ commitment: deterministicIdentity(`d2-member-${i}`).commitment, distance: 2 }),
    )
    const d3Members = Array.from({ length: 15 }, (_, i) =>
      ({ commitment: deterministicIdentity(`d3-member-${i}`).commitment, distance: 3 }),
    )

    const allMembers = [...d1Members, ...d2Members, ...d3Members]
    const graph = new Map([['subject-pub', ['follow1', 'follow2']]])
    const now = Math.floor(Date.now() / 1000)

    const roots = buildCohortRoots('subject-001', allMembers, graph, now, now + 86400)

    // Three roots, one per tier
    expect(roots).toHaveLength(3)

    // d<=1 tier: 5 members
    expect(roots[0].distance_bucket).toBe(1)
    expect(roots[0].k_size).toBe(5)

    // d<=2 tier: 5 + 10 = 15 members (cumulative)
    expect(roots[1].distance_bucket).toBe(2)
    expect(roots[1].k_size).toBe(15)

    // d<=3 tier: 5 + 10 + 15 = 30 members (cumulative)
    expect(roots[2].distance_bucket).toBe(3)
    expect(roots[2].k_size).toBe(30)

    // Each tier has a distinct root hash (different member sets)
    const rootHashes = new Set(roots.map((r) => r.root_hash))
    expect(rootHashes.size).toBe(3)

    // All roots share the same subject_id
    expect(roots.every((r) => r.subject_id === 'subject-001')).toBe(true)
  })

  it('T-301: Root metadata includes required fields — root_hash, k_size, distance_bucket, graph_snapshot_hash, valid_from, valid_to', () => {
    // Spec: 02-architecture.md Storage Model "roots table"
    const members = [
      { commitment: deterministicIdentity('member-0').commitment, distance: 1 },
    ]
    const graph = new Map([['pub1', ['pub2']]])
    const now = Math.floor(Date.now() / 1000)

    const roots = buildCohortRoots('subject-001', members, graph, now, now + 86400)
    const root = roots[0]

    // All required fields present per 02-architecture.md Storage Model
    expect(root).toHaveProperty('root_id')
    expect(root).toHaveProperty('subject_id')
    expect(root).toHaveProperty('root_hash')
    expect(root).toHaveProperty('k_size')
    expect(root).toHaveProperty('distance_bucket')
    expect(root).toHaveProperty('graph_snapshot_hash')
    expect(root).toHaveProperty('valid_from')
    expect(root).toHaveProperty('valid_to')

    // Values are meaningful
    expect(root.root_hash.length).toBe(64)
    expect(root.k_size).toBeGreaterThan(0)
    expect(root.graph_snapshot_hash.length).toBe(64)
    expect(root.valid_to).toBeGreaterThan(root.valid_from)
  })
})
