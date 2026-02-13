/**
 * Test data factories for Arrival MVP tests.
 *
 * Each factory returns a minimal valid object. Override specific fields
 * by spreading your overrides: `makeReceipt({ subject_id: 'custom' })`.
 *
 * Stubs — fill in real implementations as you build each component.
 */

// ── Identity ──────────────────────────────────────────────

export function makeKeypair(_overrides?: Record<string, unknown>) {
  // TODO: return { publicKey, secretKey } via Ed25519
  throw new Error('Not implemented')
}

export function makePostingKey(_persistentKeypair?: unknown) {
  // TODO: derive one-time posting key from persistent identity
  throw new Error('Not implemented')
}

// ── Nostr Events ──────────────────────────────────────────

export function makeKind3Event(_overrides?: Record<string, unknown>) {
  // TODO: return a valid kind 3 (contact list) Nostr event with Schnorr sig
  throw new Error('Not implemented')
}

// ── Cohort Roots ──────────────────────────────────────────

export function makeCohortRoot(_overrides?: Record<string, unknown>) {
  // TODO: return { root_hash, k_size, distance_bucket, graph_snapshot_hash, valid_from, valid_to }
  throw new Error('Not implemented')
}

// ── Receipts ──────────────────────────────────────────────

export function makeReceipt(_overrides?: Record<string, unknown>) {
  // TODO: return { r, S, keyset_id, subject_id }
  throw new Error('Not implemented')
}

export function makeBlindedValue(_secret?: unknown) {
  // TODO: return blinded value B for RSABSSA
  throw new Error('Not implemented')
}

// ── Proofs ────────────────────────────────────────────────

export function makeProofBundle(_overrides?: Record<string, unknown>) {
  // TODO: return full proof_bundle with membership, interaction, timeblind, nullifier
  throw new Error('Not implemented')
}

export function makeMembershipProof(_overrides?: Record<string, unknown>) {
  // TODO: return Semaphore v4 membership proof
  throw new Error('Not implemented')
}

export function makeTimeblindProof(_overrides?: Record<string, unknown>) {
  // TODO: return time-window ZK proof
  throw new Error('Not implemented')
}

// ── Submissions ───────────────────────────────────────────

export function makeSubmission(_overrides?: Record<string, unknown>) {
  // TODO: return full review_submission_v1 object
  throw new Error('Not implemented')
}

// ── Time Windows ──────────────────────────────────────────

export function makeTimeWindow(_overrides?: Record<string, unknown>) {
  // TODO: return { time_window_id, window_start, window_end, time_window_policy }
  throw new Error('Not implemented')
}

// ── Keysets ───────────────────────────────────────────────

export function makeKeyset(_overrides?: Record<string, unknown>) {
  // TODO: return { keyset_id, subject_id, keyset_start, keyset_end, public_key, issuer_id }
  throw new Error('Not implemented')
}
