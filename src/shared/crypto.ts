/**
 * Canonical crypto utilities for Arrival MVP.
 *
 * These are production operations used across services.
 * Test-specific deterministic key generators live in tests/helpers/crypto.ts.
 */

import { sha256 } from '@noble/hashes/sha256'
import { sha512 } from '@noble/hashes/sha512'
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils'
import * as ed25519 from '@noble/ed25519'
import { EPOCH_SEPARATOR } from './constants.js'

// @noble/ed25519 v2 requires explicit hash configuration
ed25519.etc.sha512Sync = (...m: Uint8Array[]): Uint8Array => {
  const h = sha512.create()
  for (const msg of m) h.update(msg)
  return h.digest()
}

// ── Ed25519 signature verification ──────────────────────────────────

/**
 * Verify an Ed25519 signature.
 * Used by review-gateway step 1 (signature verification).
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

// ── Canonical serialization ──────────────────────────────────────────

/**
 * Produce the canonical byte representation of a submission body for signing.
 * Per 09-event-and-api-spec.md: signature is over "canonical serialization of all other body fields".
 *
 * Strategy: JSON.stringify with recursively sorted keys, excluding `signature` field, UTF-8 encoded.
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
 *
 * The "||" is a literal two-character separator (see CLAUDE.md Protocol Decisions).
 */
export function deriveEpochId(subject_id: string, time_window_id: string): string {
  return sha256Hex(`${subject_id}${EPOCH_SEPARATOR}${time_window_id}`)
}

/**
 * Compute a deterministic graph_snapshot_hash from a sorted adjacency list.
 * Used by wot-indexer to fingerprint the follow graph state.
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

// Re-exports for convenience
export { bytesToHex, hexToBytes, utf8ToBytes }
