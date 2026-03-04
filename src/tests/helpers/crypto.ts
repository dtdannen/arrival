/**
 * Deterministic crypto helpers for reproducible tests.
 *
 * Canonical crypto operations live in src/shared/crypto.ts (production owns these).
 * This file adds test-specific deterministic key generators and re-exports
 * canonical functions so test imports remain unchanged.
 */

import { sha256 } from '@noble/hashes/sha256'
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils'
import * as ed25519 from '@noble/ed25519'
import { schnorr } from '@noble/curves/secp256k1'

// Re-export all canonical crypto so tests keep importing from here
export {
  canonicalSerialize,
  sha256Hex,
  deriveEpochId,
  ed25519Verify,
  graphSnapshotHash,
  poseidonHash,
  bytesToHex,
  hexToBytes,
  utf8ToBytes,
} from '../../shared/crypto.js'

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
 * Generate a deterministic RSA keypair for receipt issuer tests.
 * Stub — will be replaced with real RSABSSA keys when blind-signature lib is configured.
 */
export function deterministicRSAKeypair(_seed: string) {
  // TODO: implement with actual RSA blind signature library
  throw new Error('Not implemented — requires blind-rsa-signatures dependency configuration')
}
