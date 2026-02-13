/**
 * Deterministic crypto helpers for reproducible tests.
 *
 * Uses seeded randomness so tests produce the same keys/hashes every run.
 *
 * Stub — fill in as you implement each cryptographic component.
 */

/**
 * Generate a deterministic Ed25519 keypair from a seed string.
 */
export function deterministicKeypair(_seed: string) {
  // TODO: derive keypair from seed using HKDF or similar
  throw new Error('Not implemented')
}

/**
 * Compute Poseidon hash (used for nullifier scope, epoch_id).
 */
export function poseidonHash(..._inputs: bigint[]): bigint {
  // TODO: use circomlibjs poseidon
  throw new Error('Not implemented')
}

/**
 * Generate a deterministic Semaphore v4 identity from a seed.
 */
export function deterministicIdentity(_seed: string) {
  // TODO: use @semaphore-protocol/identity with seeded randomness
  throw new Error('Not implemented')
}

/**
 * Compute a deterministic graph_snapshot_hash from a sorted adjacency list.
 */
export function graphSnapshotHash(_adjacencyList: Map<string, string[]>): string {
  // TODO: canonical serialization + SHA-256
  throw new Error('Not implemented')
}

/**
 * Generate a deterministic RSA keypair for receipt issuer tests.
 */
export function deterministicRSAKeypair(_seed: string) {
  // TODO: seeded RSA key generation for RSABSSA
  throw new Error('Not implemented')
}
