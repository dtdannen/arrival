/**
 * WoT Indexer — Nostr kind 3 event ingestion and follow graph management.
 *
 * Spec: 02-architecture.md (Nostr Ingestion Rules, Conflict Resolution)
 *
 * Responsibilities:
 * - Ingest kind 3 (contact list) events with Schnorr signature verification
 * - Apply replaceable event semantics (highest created_at wins, tie-break on lowest event id)
 * - Union-then-replace across relay responses
 * - Maintain deterministic follow graph for cohort root building
 */

import { schnorr } from '@noble/curves/secp256k1'
import { sha256 } from '@noble/hashes/sha256'
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils'
import { sha256Hex } from '../shared/crypto.js'

// ── Types ────────────────────────────────────────────────────────────

export interface NostrEvent {
  id: string
  pubkey: string
  created_at: number
  kind: number
  tags: string[][]
  content: string
  sig: string
}

export interface FollowGraph {
  edges: Map<string, string[]>
}

export interface StoredEvent {
  id: string
  pubkey: string
  created_at: number
  follows: string[]
}

// ── NIP-01 Event ID computation ─────────────────────────────────────

export function computeEventId(event: Omit<NostrEvent, 'id' | 'sig'>): string {
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

// ── Schnorr signature verification ──────────────────────────────────

export function verifyEventSignature(event: NostrEvent): boolean {
  try {
    const idBytes = utf8ToBytes(event.id)
    return schnorr.verify(event.sig, sha256(idBytes), event.pubkey)
  } catch {
    return false
  }
}

// ── Event ingestion ─────────────────────────────────────────────────

/**
 * Ingest a Nostr event into the follow graph.
 *
 * Rules (02-architecture.md):
 * 1. Only kind 3 events are ingested
 * 2. Events must have a valid Schnorr signature
 * 3. Invalid or malformed events are discarded silently
 */
export function ingestEvent(event: NostrEvent, graph: FollowGraph): boolean {
  if (event.kind !== 3) return false
  if (!verifyEventSignature(event)) return false

  const follows = event.tags
    .filter((t) => t[0] === 'p' && t[1])
    .map((t) => t[1])

  graph.edges.set(event.pubkey, follows)
  return true
}

// ── Replaceable event store ─────────────────────────────────────────

/**
 * EventStore applies replaceable event semantics per 02-architecture.md:
 * - For each author (pubkey), only one event is retained
 * - Highest created_at wins
 * - Tie-break: lowest event id (lexicographic) wins
 */
export class EventStore {
  private events: Map<string, StoredEvent> = new Map()

  ingest(event: StoredEvent): boolean {
    const existing = this.events.get(event.pubkey)
    if (!existing) {
      this.events.set(event.pubkey, event)
      return true
    }

    if (event.created_at > existing.created_at) {
      this.events.set(event.pubkey, event)
      return true
    }

    if (event.created_at === existing.created_at && event.id < existing.id) {
      this.events.set(event.pubkey, event)
      return true
    }

    return false
  }

  get(pubkey: string): StoredEvent | undefined {
    return this.events.get(pubkey)
  }

  all(): StoredEvent[] {
    return [...this.events.values()]
  }
}

// ── Signed event creation (utility) ─────────────────────────────────

export function createSignedEvent(
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
