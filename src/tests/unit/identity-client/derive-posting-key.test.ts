import { describe, it, expect } from 'vitest'
import {
  deterministicKeypair,
  ed25519Sign,
  ed25519Verify,
  canonicalSerialize,
  sha256Hex,
} from '../../helpers/crypto.js'

/**
 * Identity Client — Derive Posting Key
 * Spec: 02-architecture.md Component 1 (identity-client)
 *
 * "derives one-time review posting keys"
 * Posting keys are Ed25519 keys derived from the persistent identity,
 * used to sign review submissions without revealing the persistent Nostr key.
 */

function derivePostingKey(persistentSeed: string, context: string) {
  // Derive a one-time posting key from persistent identity + context
  // Context includes subject_id and epoch to make the key single-use per review context
  const derivedSeed = sha256Hex(`posting-key:${persistentSeed}:${context}`)
  return deterministicKeypair(derivedSeed)
}

describe('Identity Client — Derive Posting Key', () => {
  it('T-100: Derive one-time posting key from persistent identity — key is valid Ed25519, distinct from persistent key, deterministic', () => {
    // Spec: 02-architecture.md "derives one-time review posting keys"
    const persistentKeypair = deterministicKeypair('alice-persistent-nostr')
    const context = 'subject-001:2026-W09'

    const postingKey1 = derivePostingKey('alice-persistent-nostr', context)
    const postingKey2 = derivePostingKey('alice-persistent-nostr', context)

    // Posting key is valid Ed25519 (32-byte public key)
    expect(postingKey1.publicKey).toBeInstanceOf(Uint8Array)
    expect(postingKey1.publicKey.length).toBe(32)
    expect(postingKey1.secretKey.length).toBe(32)

    // Posting key is distinct from persistent key
    expect(postingKey1.publicKeyHex).not.toBe(persistentKeypair.publicKeyHex)
    expect(postingKey1.secretKeyHex).not.toBe(persistentKeypair.secretKeyHex)

    // Derivation is deterministic — same inputs produce same key
    expect(postingKey1.publicKeyHex).toBe(postingKey2.publicKeyHex)
    expect(postingKey1.secretKeyHex).toBe(postingKey2.secretKeyHex)

    // Different context produces different posting key
    const postingKeyOther = derivePostingKey('alice-persistent-nostr', 'subject-002:2026-W09')
    expect(postingKeyOther.publicKeyHex).not.toBe(postingKey1.publicKeyHex)
  })

  it('T-101: Posting key signs review payload — valid Ed25519 signature that verifies against the posting key', () => {
    // Spec: 09-event-and-api-spec.md "signature (Ed25519 signature by posting_pubkey
    // over canonical serialization of all other body fields)"
    const postingKey = derivePostingKey('alice-persistent-nostr', 'subject-001:2026-W09')

    const submission = {
      review_id: 'review-101',
      subject_id: 'subject-001',
      content: 'Excellent service',
      posting_pubkey: postingKey.publicKeyHex,
      proof_bundle: { cohort_root_hash: sha256Hex('root') },
      created_at: 1700000000,
      proof_version: 'v1',
    }

    const canonical = canonicalSerialize(submission)
    const signature = ed25519Sign(canonical, postingKey.secretKey)

    // Signature verifies against the posting key
    expect(ed25519Verify(signature, canonical, postingKey.publicKey)).toBe(true)

    // Signature does NOT verify against a different key
    const otherKey = deterministicKeypair('bob-persistent-nostr')
    expect(ed25519Verify(signature, canonical, otherKey.publicKey)).toBe(false)

    // Signature does NOT verify against tampered message
    const tampered = canonicalSerialize({ ...submission, content: 'Terrible service' })
    expect(ed25519Verify(signature, tampered, postingKey.publicKey)).toBe(false)
  })
})
