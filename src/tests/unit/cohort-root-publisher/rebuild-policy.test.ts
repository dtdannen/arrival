import { describe, it, expect } from 'vitest'
import { graphSnapshotHash, sha256Hex, deterministicIdentity } from '../../helpers/crypto.js'
import type { RootRecord } from '../../helpers/types.js'

/**
 * Cohort Root Publisher — Rebuild Policy
 * Spec: 02-architecture.md Refresh Cadence & Operational Defaults
 *
 * "Cohort roots are only rebuilt if the graph has changed"
 * "Root refresh: daily or on significant WoT graph changes"
 */

class RootRegistry {
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

function shouldRebuild(currentSnapshotHash: string, newGraph: Map<string, string[]>): boolean {
  const newHash = graphSnapshotHash(newGraph)
  return newHash !== currentSnapshotHash
}

describe('Cohort Root Publisher — Rebuild Policy', () => {
  it('T-302: Root not rebuilt when graph unchanged — existing root reused', () => {
    // Spec: 02-architecture.md "Cohort roots are only rebuilt if the graph has changed"
    const graph = new Map([
      ['alice', ['bob', 'carol']],
      ['bob', ['alice']],
    ])

    const snapshotHash = graphSnapshotHash(graph)

    // Same graph: should NOT rebuild
    expect(shouldRebuild(snapshotHash, graph)).toBe(false)

    // Same graph with different insertion order: still no rebuild
    const sameGraphDiffOrder = new Map([
      ['bob', ['alice']],
      ['alice', ['carol', 'bob']],
    ])
    expect(shouldRebuild(snapshotHash, sameGraphDiffOrder)).toBe(false)
  })

  it('T-303: Root rebuilt when graph changes — new root with updated graph_snapshot_hash', () => {
    // Spec: 02-architecture.md "Cohort roots are only rebuilt if the graph has changed"
    const graph = new Map([
      ['alice', ['bob']],
    ])
    const snapshotHash = graphSnapshotHash(graph)

    // Add an edge: should trigger rebuild
    const updatedGraph = new Map([
      ['alice', ['bob', 'carol']],
    ])
    expect(shouldRebuild(snapshotHash, updatedGraph)).toBe(true)

    // Remove an edge: should also trigger rebuild
    const smallerGraph = new Map([
      ['alice', []],
    ])
    expect(shouldRebuild(snapshotHash, smallerGraph)).toBe(true)

    // The new snapshot hash is different
    const newHash = graphSnapshotHash(updatedGraph)
    expect(newHash).not.toBe(snapshotHash)
  })

  it('T-304: Expired root is not active — expired root not returned from active roots query', () => {
    // Spec: 02-architecture.md "root_id, subject_id, root_hash, k_size, ..., valid_from, valid_to"
    const now = 5000
    const registry = new RootRegistry()

    const expiredRoot: RootRecord = {
      root_id: 'root-expired',
      subject_id: 'subject-001',
      root_hash: sha256Hex('expired-root'),
      k_size: 50,
      distance_bucket: 1,
      graph_snapshot_hash: sha256Hex('old-graph'),
      valid_from: 1000,
      valid_to: 3000, // expired: valid_to < now
    }

    const activeRoot: RootRecord = {
      root_id: 'root-active',
      subject_id: 'subject-001',
      root_hash: sha256Hex('active-root'),
      k_size: 60,
      distance_bucket: 1,
      graph_snapshot_hash: sha256Hex('current-graph'),
      valid_from: 4000,
      valid_to: 6000, // active: valid_from <= now < valid_to
    }

    registry.publish(expiredRoot)
    registry.publish(activeRoot)

    const active = registry.getActive('subject-001', now)

    // Only the active root should be returned
    expect(active).toHaveLength(1)
    expect(active[0].root_id).toBe('root-active')

    // Expired root is not in active set
    expect(active.find((r) => r.root_id === 'root-expired')).toBeUndefined()
  })
})
