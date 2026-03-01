/**
 * Deterministic crypto helpers for reproducible tests.
 *
 * Uses seeded randomness so tests produce the same keys/hashes every run.
 */

import { sha256 } from '@noble/hashes/sha256'
import { sha512 } from '@noble/hashes/sha512'
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils'
import * as ed25519 from '@noble/ed25519'
import { schnorr } from '@noble/curves/secp256k1'

// @noble/ed25519 v2 requires explicit hash configuration
ed25519.etc.sha512Sync = (...m: Uint8Array[]): Uint8Array => {
  const h = sha512.create()
  for (const msg of m) h.update(msg)
  return h.digest()
}

// ── Ed25519 keypairs (posting keys) ──────────────────────────────────

export interface Ed25519Keypair {
  publicKey: Uint8Array
  secretKey: Uint8Array
  publicKeyHex: string
  secretKeyHex: string
}

/**
 * Generate a deterministic Ed25519 keypair from a seed string.
 * Uses SHA-256 of the seed as the 32-byte private key.
 */
export function deterministicKeypair(seed: string): Ed25519Keypair {
  const secretKey = sha256(utf8ToBytes(seed))
  const publicKey = ed25519.getPublicKey(secretKey)
  return {
    publicKey,
    secretKey,
    publicKeyHex: bytesToHex(publicKey),
    secretKeyHex: bytesToHex(secretKey),
  }
}

/**
 * Sign a message with Ed25519.
 */
export function ed25519Sign(message: Uint8Array, secretKey: Uint8Array): Uint8Array {
  return ed25519.sign(message, secretKey)
}

/**
 * Verify an Ed25519 signature.
 */
export function ed25519Verify(
  signature: Uint8Array,
  message: Uint8Array,
  publicKey: Uint8Array,
): boolean {
  try {
    return ed25519.verify(signature, message, publicKey)
  } catch {
    return false
  }
}

// ── Schnorr / Nostr keypairs ─────────────────────────────────────────

export interface SchnorrKeypair {
  publicKey: Uint8Array
  secretKey: Uint8Array
  publicKeyHex: string
  secretKeyHex: string
}

/**
 * Generate a deterministic Schnorr (secp256k1) keypair for Nostr tests.
 */
export function deterministicSchnorrKeypair(seed: string): SchnorrKeypair {
  const secretKey = sha256(utf8ToBytes(seed))
  const publicKey = schnorr.getPublicKey(secretKey)
  return {
    publicKey,
    secretKey,
    publicKeyHex: bytesToHex(publicKey),
    secretKeyHex: bytesToHex(secretKey),
  }
}

// ── Canonical serialization ──────────────────────────────────────────

/**
 * Produce the canonical byte representation of a submission body for signing.
 * Per 09-event-and-api-spec.md: signature is over "canonical serialization of all other body fields".
 *
 * Strategy: JSON.stringify with recursively sorted keys, excluding `signature` field.
 */
export function canonicalSerialize(submission: Record<string, unknown>): Uint8Array {
  const { signature: _sig, ...rest } = submission
  const sorted = JSON.stringify(sortKeysDeep(rest))
  return utf8ToBytes(sorted)
}

function sortKeysDeep(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(sortKeysDeep)
  if (obj !== null && typeof obj === 'object') {
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
      sorted[key] = sortKeysDeep((obj as Record<string, unknown>)[key])
    }
    return sorted
  }
  return obj
}

// ── Hashing ──────────────────────────────────────────────────────────

/**
 * SHA-256 hash, returns hex string.
 */
export function sha256Hex(data: string | Uint8Array): string {
  const input = typeof data === 'string' ? utf8ToBytes(data) : data
  return bytesToHex(sha256(input))
}

/**
 * Derive epoch_id per 02-architecture.md:
 * epoch_id = hash(subject_id || time_window_id)
 */
export function deriveEpochId(subject_id: string, time_window_id: string): string {
  return sha256Hex(`${subject_id}||${time_window_id}`)
}

/**
 * Compute Poseidon hash (used for nullifier scope, epoch_id in ZK context).
 * Stub that falls back to SHA-256 for non-circuit tests.
 * Real Poseidon implementation will be added when circomlibjs is configured.
 */
export function poseidonHash(..._inputs: bigint[]): bigint {
  // TODO: replace with real circomlibjs poseidon when circuit tests need it
  const inputStr = _inputs.map((i) => i.toString()).join(',')
  const hash = sha256(utf8ToBytes(inputStr))
  // Take first 31 bytes to stay within BN254 scalar field
  const truncated = hash.slice(0, 31)
  let result = 0n
  for (const byte of truncated) {
    result = (result << 8n) | BigInt(byte)
  }
  return result
}

/**
 * Generate a deterministic Semaphore v4 identity from a seed.
 * Returns a mock identity object shaped like @semaphore-protocol/identity.
 */
export function deterministicIdentity(seed: string) {
  const secret = sha256(utf8ToBytes(`semaphore-identity:${seed}`))
  const commitment = sha256(secret)
  return {
    secret,
    secretHex: bytesToHex(secret),
    commitment: bytesToHex(commitment),
  }
}

/**
 * Compute a deterministic graph_snapshot_hash from a sorted adjacency list.
 */
export function graphSnapshotHash(adjacencyList: Map<string, string[]>): string {
  const sortedAuthors = [...adjacencyList.keys()].sort()
  const entries = sortedAuthors.map((author) => {
    const follows = [...(adjacencyList.get(author) || [])].sort()
    return `${author}:${follows.join(',')}`
  })
  return sha256Hex(entries.join('\n'))
}

/**
 * Generate a deterministic RSA keypair for receipt issuer tests.
 * Stub — will be replaced with real RSABSSA keys when blind-signature lib is configured.
 */
export function deterministicRSAKeypair(_seed: string) {
  // TODO: implement with actual RSA blind signature library
  throw new Error('Not implemented — requires blind-rsa-signatures dependency configuration')
}

// Re-exports for convenience
export { bytesToHex, hexToBytes, utf8ToBytes }
