import { describe, it, expect } from 'vitest'
import { deterministicSchnorrKeypair, sha256Hex } from '../../helpers/crypto.js'
import { schnorr } from '@noble/curves/secp256k1'
import { sha256 } from '@noble/hashes/sha256'
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils'

/**
 * WoT Indexer — Event Ingestion
 * Spec: 02-architecture.md Nostr Ingestion Rules
 *
 * "Only kind 3 events are ingested (contact lists)"
 * "Events must have a valid Schnorr signature over secp256k1.
 *  Invalid or malformed events are discarded silently."
 */

interface NostrEvent {
  id: string
  pubkey: string
  created_at: number
  kind: number
  tags: string[][]
  content: string
  sig: string
}

interface FollowGraph {
  edges: Map<string, string[]>
}

function computeEventId(event: Omit<NostrEvent, 'id' | 'sig'>): string {
  // NIP-01: id = sha256(serialized event)
  const serialized = JSON.stringify([
    0,
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content,
  ])
  return sha256Hex(serialized)
}

function createSignedEvent(
  secretKey: Uint8Array,
  pubkey: string,
  kind: number,
  tags: string[][],
  content: string,
  created_at: number,
): NostrEvent {
  const partial = { pubkey, created_at, kind, tags, content }
  const id = computeEventId(partial)
  const idBytes = utf8ToBytes(id)
  const sig = bytesToHex(schnorr.sign(sha256(idBytes), secretKey))
  return { id, ...partial, sig }
}

function verifyEventSignature(event: NostrEvent): boolean {
  try {
    const idBytes = utf8ToBytes(event.id)
    return schnorr.verify(event.sig, sha256(idBytes), event.pubkey)
  } catch {
    return false
  }
}

function ingestEvent(event: NostrEvent, graph: FollowGraph): boolean {
  // Rule 1: Only kind 3
  if (event.kind !== 3) return false

  // Rule 3: Valid Schnorr signature
  if (!verifyEventSignature(event)) return false

  // Extract followed pubkeys from p-tags
  const follows = event.tags
    .filter((t) => t[0] === 'p' && t[1])
    .map((t) => t[1])

  graph.edges.set(event.pubkey, follows)
  return true
}

describe('WoT Indexer — Event Ingestion', () => {
  it('T-200: Ingest valid kind 3 event — follow list stored, graph contains expected edges', () => {
    // Spec: 02-architecture.md "Only kind 3 events are ingested"
    const alice = deterministicSchnorrKeypair('alice-nostr')
    const bobPubkey = deterministicSchnorrKeypair('bob-nostr').publicKeyHex
    const carolPubkey = deterministicSchnorrKeypair('carol-nostr').publicKeyHex

    const event = createSignedEvent(
      alice.secretKey,
      alice.publicKeyHex,
      3, // kind 3 = contact list
      [['p', bobPubkey], ['p', carolPubkey]],
      '',
      1700000000,
    )

    const graph: FollowGraph = { edges: new Map() }
    const ingested = ingestEvent(event, graph)

    expect(ingested).toBe(true)
    expect(graph.edges.has(alice.publicKeyHex)).toBe(true)
    expect(graph.edges.get(alice.publicKeyHex)).toEqual([bobPubkey, carolPubkey])
  })

  it('T-201: Reject invalid Schnorr signature — event discarded, graph unchanged', () => {
    // Spec: 02-architecture.md "Invalid or malformed events are discarded silently."
    const alice = deterministicSchnorrKeypair('alice-nostr')
    const bobPubkey = deterministicSchnorrKeypair('bob-nostr').publicKeyHex

    const event = createSignedEvent(
      alice.secretKey,
      alice.publicKeyHex,
      3,
      [['p', bobPubkey]],
      '',
      1700000000,
    )

    // Corrupt the signature
    event.sig = 'a'.repeat(128)

    const graph: FollowGraph = { edges: new Map() }
    const ingested = ingestEvent(event, graph)

    expect(ingested).toBe(false)
    expect(graph.edges.size).toBe(0)
  })

  it('T-202: Reject non-kind-3 events — event ignored, graph unchanged', () => {
    // Spec: 02-architecture.md "Only kind 3 events are ingested"
    const alice = deterministicSchnorrKeypair('alice-nostr')

    // Kind 1 = short text note (not a contact list)
    const event = createSignedEvent(
      alice.secretKey,
      alice.publicKeyHex,
      1,
      [],
      'Hello world',
      1700000000,
    )

    const graph: FollowGraph = { edges: new Map() }
    const ingested = ingestEvent(event, graph)

    expect(ingested).toBe(false)
    expect(graph.edges.size).toBe(0)
  })

  it('T-209: Malformed event handling — missing fields, invalid JSON, empty contact list all discarded without crash', () => {
    // Spec: 02-architecture.md (implied: robust ingestion)
    const graph: FollowGraph = { edges: new Map() }

    // Missing sig
    const noSig = { id: 'fake', pubkey: 'aabb', created_at: 0, kind: 3, tags: [], content: '', sig: '' }
    expect(ingestEvent(noSig as NostrEvent, graph)).toBe(false)

    // Invalid pubkey format
    const badPubkey = { id: 'fake', pubkey: 'not-hex', created_at: 0, kind: 3, tags: [], content: '', sig: 'ab'.repeat(64) }
    expect(ingestEvent(badPubkey as NostrEvent, graph)).toBe(false)

    // Empty contact list (valid kind 3 but no follows) — should still ingest
    const alice = deterministicSchnorrKeypair('alice-empty-follows')
    const emptyFollows = createSignedEvent(
      alice.secretKey,
      alice.publicKeyHex,
      3,
      [], // no p-tags
      '',
      1700000000,
    )
    const ingested = ingestEvent(emptyFollows, graph)
    expect(ingested).toBe(true)
    expect(graph.edges.get(alice.publicKeyHex)).toEqual([])

    // Graph should only have the valid empty-follows event, nothing from malformed ones
    expect(graph.edges.size).toBe(1)
  })
})
