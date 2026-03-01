import { describe, it, expect } from 'vitest'
import { graphSnapshotHash, deterministicSchnorrKeypair } from '../../helpers/crypto.js'

/**
 * WoT Indexer — Graph Snapshot Hash
 * Spec: 02-architecture.md Graph Snapshot Determinism
 *
 * "The indexer computes a deterministic graph_snapshot_hash over this normalized map
 *  (sorted by author pubkey, then sorted follow lists)"
 * "graph_snapshot_hash is included in cohort root metadata, allowing any node to
 *  verify it built the same graph from the same events"
 */

describe('WoT Indexer — Graph Snapshot Hash', () => {
  it('T-207: Deterministic graph_snapshot_hash — identical hash regardless of ingestion order', () => {
    // Spec: 02-architecture.md "deterministic graph_snapshot_hash over this normalized map
    // (sorted by author pubkey, then sorted follow lists)"
    const alice = deterministicSchnorrKeypair('alice').publicKeyHex
    const bob = deterministicSchnorrKeypair('bob').publicKeyHex
    const carol = deterministicSchnorrKeypair('carol').publicKeyHex

    // Build graph in one order
    const graph1 = new Map<string, string[]>()
    graph1.set(alice, [bob, carol])
    graph1.set(bob, [alice])

    // Build same graph in different insertion order
    const graph2 = new Map<string, string[]>()
    graph2.set(bob, [alice])
    graph2.set(alice, [carol, bob]) // follows in different order too

    const hash1 = graphSnapshotHash(graph1)
    const hash2 = graphSnapshotHash(graph2)

    expect(hash1).toBe(hash2)
    expect(hash1).toBeTruthy()
    expect(hash1.length).toBe(64) // SHA-256 hex
  })

  it('T-208: graph_snapshot_hash changes when graph changes — new edge produces different hash', () => {
    // Spec: 02-architecture.md "Cohort roots are only rebuilt if the graph has changed"
    const alice = deterministicSchnorrKeypair('alice').publicKeyHex
    const bob = deterministicSchnorrKeypair('bob').publicKeyHex
    const carol = deterministicSchnorrKeypair('carol').publicKeyHex

    const graphBefore = new Map<string, string[]>()
    graphBefore.set(alice, [bob])

    const graphAfter = new Map<string, string[]>()
    graphAfter.set(alice, [bob, carol])

    const hashBefore = graphSnapshotHash(graphBefore)
    const hashAfter = graphSnapshotHash(graphAfter)

    expect(hashBefore).not.toBe(hashAfter)

    // Removing an edge also changes hash
    const graphSmaller = new Map<string, string[]>()
    graphSmaller.set(alice, [])

    expect(graphSnapshotHash(graphSmaller)).not.toBe(hashBefore)
  })
})
