/**
 * Cohort Root Publisher — Merkle tree building and root lifecycle management.
 *
 * Spec: 02-architecture.md (Component 3, Storage Model, Refresh Cadence)
 *
 * Responsibilities:
 * - Build Merkle trees per distance tier (d<=1, d<=2, d<=3) per subject
 * - Publish roots with metadata (root_hash, k_size, distance_bucket, graph_snapshot_hash)
 * - Rebuild only when graph has changed (compare graph_snapshot_hash)
 * - Track root validity periods for active/expired root queries
 */

import { sha256Hex, graphSnapshotHash } from '../shared/crypto.js'
import type { RootRecord } from '../shared/types.js'

// ── Types ────────────────────────────────────────────────────────────

export interface MemberCommitment {
  commitment: string
  distance: number
}

// ── Merkle tree construction ─────────────────────────────────────────

/**
 * Build a simple hash-chain Merkle root from sorted commitments.
 * For MVP — a proper binary Merkle tree will be used with Semaphore v4.
 */
export function buildMerkleRoot(commitments: string[]): string {
  if (commitments.length === 0) return sha256Hex('empty-tree')
  const sorted = [...commitments].sort()
  let hash = sorted[0]
  for (let i = 1; i < sorted.length; i++) {
    hash = sha256Hex(`${hash}:${sorted[i]}`)
  }
  return hash
}

/**
 * Build cohort roots for all three distance tiers.
 * Each tier is cumulative: d<=2 includes all d<=1 members.
 */
export function buildCohortRoots(
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

// ── Root registry ───────────────────────────────────────────────────

/**
 * In-memory root registry for tracking published roots.
 * Production will use PostgreSQL roots table.
 *
 * Active root: valid_from <= now < valid_to (closed start, open end)
 */
export class RootRegistry {
  private roots: RootRecord[] = []

  publish(root: RootRecord): void {
    this.roots.push(root)
  }

  getActive(subject_id: string, now: number): RootRecord[] {
    return this.roots.filter(
      (r) => r.subject_id === subject_id && r.valid_from <= now && r.valid_to > now,
    )
  }

  getLatest(subject_id: string, distance_bucket: number): RootRecord | null {
    const matching = this.roots
      .filter((r) => r.subject_id === subject_id && r.distance_bucket === distance_bucket)
      .sort((a, b) => b.valid_from - a.valid_from)
    return matching[0] ?? null
  }
}

// ── Rebuild policy ──────────────────────────────────────────────────

/**
 * Determine whether cohort roots need rebuilding by comparing graph hashes.
 * Per 02-architecture.md: "Cohort roots are only rebuilt if the graph has changed"
 */
export function shouldRebuild(
  currentSnapshotHash: string,
  newGraph: Map<string, string[]>,
): boolean {
  const newHash = graphSnapshotHash(newGraph)
  return newHash !== currentSnapshotHash
}
