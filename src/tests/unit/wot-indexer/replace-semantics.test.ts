import { describe, it, expect } from 'vitest'
import { deterministicSchnorrKeypair, sha256Hex } from '../../helpers/crypto.js'

/**
 * WoT Indexer — Replaceable Event Semantics
 * Spec: 02-architecture.md Conflict Resolution
 *
 * "Kind 3 is a replaceable event kind: for each author (pubkey),
 *  only the single latest event is retained"
 *
 * Conflict resolution:
 * 1. Highest created_at wins
 * 2. Tie-break: lowest event id (lexicographic) wins
 */

interface StoredEvent {
  id: string
  pubkey: string
  created_at: number
  follows: string[]
}

class EventStore {
  private events: Map<string, StoredEvent> = new Map()

  ingest(event: StoredEvent): boolean {
    const existing = this.events.get(event.pubkey)
    if (!existing) {
      this.events.set(event.pubkey, event)
      return true
    }

    // Rule 1: Higher created_at wins
    if (event.created_at > existing.created_at) {
      this.events.set(event.pubkey, event)
      return true
    }

    // Rule 2: Same created_at — lowest event id wins
    if (event.created_at === existing.created_at && event.id < existing.id) {
      this.events.set(event.pubkey, event)
      return true
    }

    return false // existing event retained
  }

  get(pubkey: string): StoredEvent | undefined {
    return this.events.get(pubkey)
  }

  all(): StoredEvent[] {
    return [...this.events.values()]
  }
}

function makeEvent(pubkey: string, created_at: number, follows: string[], idSuffix = ''): StoredEvent {
  const id = sha256Hex(`event:${pubkey}:${created_at}:${idSuffix}`)
  return { id, pubkey, created_at, follows }
}

describe('WoT Indexer — Replaceable Event Semantics', () => {
  it('T-203: Newer replaces older — only later created_at contact list retained', () => {
    // Spec: 02-architecture.md "the event with the highest created_at wins"
    const alice = deterministicSchnorrKeypair('alice-nostr').publicKeyHex
    const bob = deterministicSchnorrKeypair('bob-nostr').publicKeyHex
    const carol = deterministicSchnorrKeypair('carol-nostr').publicKeyHex

    const store = new EventStore()

    const older = makeEvent(alice, 1000, [bob])
    const newer = makeEvent(alice, 2000, [bob, carol])

    store.ingest(older)
    store.ingest(newer)

    const retained = store.get(alice)
    expect(retained).toBeDefined()
    expect(retained!.created_at).toBe(2000)
    expect(retained!.follows).toEqual([bob, carol])
  })

  it('T-204: Older does not replace newer — earlier created_at event ignored', () => {
    // Spec: 02-architecture.md "An event that arrives later replaces the current
    // retained event only if it wins the comparison"
    const alice = deterministicSchnorrKeypair('alice-nostr').publicKeyHex
    const bob = deterministicSchnorrKeypair('bob-nostr').publicKeyHex

    const store = new EventStore()

    const newer = makeEvent(alice, 2000, [bob])
    const older = makeEvent(alice, 1000, [])

    store.ingest(newer)
    const replaced = store.ingest(older)

    expect(replaced).toBe(false)
    expect(store.get(alice)!.created_at).toBe(2000)
    expect(store.get(alice)!.follows).toEqual([bob])
  })

  it('T-205: Tie-break on same created_at — lowest event id wins (lexicographic)', () => {
    // Spec: 02-architecture.md "the event with the lexicographically lowest event id wins"
    const alice = deterministicSchnorrKeypair('alice-nostr').publicKeyHex
    const bob = deterministicSchnorrKeypair('bob-nostr').publicKeyHex

    const store = new EventStore()

    const eventA = makeEvent(alice, 1000, [bob], 'suffix-a')
    const eventB = makeEvent(alice, 1000, [], 'suffix-b')

    // Determine which has the lower id
    const [first, second] = eventA.id < eventB.id ? [eventA, eventB] : [eventB, eventA]

    // Ingest in reverse order: higher id first, then lower id
    store.ingest(second)
    store.ingest(first)

    // The one with the lower id should win
    expect(store.get(alice)!.id).toBe(first.id)
  })

  it('T-206: Union-then-replace across relays — higher created_at retained after relay union', () => {
    // Spec: 02-architecture.md "Responses from all relays are unioned: all candidate
    // events are collected, then replace semantics are applied"
    const alice = deterministicSchnorrKeypair('alice-nostr').publicKeyHex
    const bob = deterministicSchnorrKeypair('bob-nostr').publicKeyHex
    const carol = deterministicSchnorrKeypair('carol-nostr').publicKeyHex

    // Relay 1 has an older event
    const fromRelay1 = makeEvent(alice, 1000, [bob], 'relay1')
    // Relay 2 has a newer event
    const fromRelay2 = makeEvent(alice, 2000, [bob, carol], 'relay2')

    const store = new EventStore()

    // Union: ingest all events from all relays
    store.ingest(fromRelay1)
    store.ingest(fromRelay2)

    // Replace semantics: the newer event wins
    const retained = store.get(alice)
    expect(retained!.created_at).toBe(2000)
    expect(retained!.follows).toEqual([bob, carol])

    // Reverse order should yield same result
    const store2 = new EventStore()
    store2.ingest(fromRelay2)
    store2.ingest(fromRelay1)
    expect(store2.get(alice)!.created_at).toBe(2000)
  })
})
