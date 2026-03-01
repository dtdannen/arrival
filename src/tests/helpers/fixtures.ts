/**
 * Test data factories for Arrival MVP tests.
 *
 * Each factory returns a minimal valid object. Override specific fields
 * by spreading your overrides: `makeReceipt({ subject_id: 'custom' })`.
 */

import {
  deterministicKeypair,
  ed25519Sign,
  canonicalSerialize,
  sha256Hex,
  deriveEpochId,
  bytesToHex,
} from './crypto.js'
import type {
  ReviewSubmission,
  ProofBundle,
  InteractionProof,
  RootRecord,
  TimeWindow,
  KeysetRecord,
} from './types.js'

// ── Defaults ─────────────────────────────────────────────────────────

const DEFAULT_SUBJECT_ID = 'subject-001'
const DEFAULT_TIME_WINDOW_ID = '2026-W09'
const DEFAULT_PROOF_VERSION = 'v1'

let _counter = 0
function nextId(prefix: string): string {
  return `${prefix}-${++_counter}`
}

// ── Identity ─────────────────────────────────────────────────────────

export function makeKeypair(seed = 'test-posting-key') {
  return deterministicKeypair(seed)
}

export function makePostingKey(seed = 'posting-key-derived') {
  return deterministicKeypair(`one-time:${seed}`)
}

// ── Nostr Events ─────────────────────────────────────────────────────

export function makeKind3Event(_overrides?: Record<string, unknown>) {
  // TODO: return a valid kind 3 (contact list) Nostr event with Schnorr sig
  // Requires Nostr event serialization — will implement in WoT indexer test phase
  throw new Error('Not implemented — will be completed for WoT indexer tests')
}

// ── Cohort Roots ─────────────────────────────────────────────────────

export function makeCohortRoot(overrides?: Partial<RootRecord>): RootRecord {
  const now = Math.floor(Date.now() / 1000)
  return {
    root_id: nextId('root'),
    subject_id: DEFAULT_SUBJECT_ID,
    root_hash: sha256Hex(`root-${Date.now()}-${_counter}`),
    k_size: 100,
    distance_bucket: 1,
    graph_snapshot_hash: sha256Hex('graph-snapshot-default'),
    valid_from: now - 86400,
    valid_to: now + 86400,
    ...overrides,
  }
}

// ── Receipts ─────────────────────────────────────────────────────────

export function makeReceipt(
  overrides?: Partial<InteractionProof & { subject_id: string }>,
): InteractionProof & { subject_id: string } {
  return {
    r: sha256Hex(`receipt-secret-${_counter++}`),
    S: sha256Hex(`receipt-sig-${_counter}`),
    keyset_id: 'keyset-001',
    subject_id: DEFAULT_SUBJECT_ID,
    ...overrides,
  }
}

export function makeBlindedValue(_secret?: unknown) {
  // TODO: return blinded value B for RSABSSA — requires blind-sig lib
  throw new Error('Not implemented — requires blind-rsa-signatures dependency')
}

// ── Proofs ────────────────────────────────────────────────────────────

export function makeProofBundle(overrides?: Partial<ProofBundle>): ProofBundle {
  const root = makeCohortRoot()
  return {
    cohort_root_hash: root.root_hash,
    membership_proof: { proof: 'mock-membership-proof', protocol: 'semaphore-v4' },
    interaction_proof: {
      r: sha256Hex(`receipt-r-${_counter++}`),
      S: sha256Hex(`receipt-S-${_counter}`),
      keyset_id: 'keyset-001',
    },
    timeblind_proof: { proof: 'mock-timeblind-proof', protocol: 'groth16' },
    time_window_id: DEFAULT_TIME_WINDOW_ID,
    window_start: Math.floor(Date.now() / 1000) - 604800,
    window_end: Math.floor(Date.now() / 1000),
    nullifier_hash: sha256Hex(`nullifier-${_counter++}`),
    ...overrides,
  }
}

export function makeMembershipProof(_overrides?: Record<string, unknown>) {
  return { proof: 'mock-membership-proof', protocol: 'semaphore-v4', ..._overrides }
}

export function makeTimeblindProof(_overrides?: Record<string, unknown>) {
  return { proof: 'mock-timeblind-proof', protocol: 'groth16', ..._overrides }
}

// ── Submissions ──────────────────────────────────────────────────────

export interface MakeSubmissionOptions {
  seed?: string
  subject_id?: string
  proof_version?: string
  proof_bundle?: Partial<ProofBundle>
  content?: string
  skipSign?: boolean
}

/**
 * Create a fully valid review submission with real Ed25519 signature.
 * The signature is computed over the canonical serialization of all body fields.
 */
export function makeSubmission(options: MakeSubmissionOptions = {}): ReviewSubmission {
  const {
    seed = 'submission-signer',
    subject_id = DEFAULT_SUBJECT_ID,
    proof_version = DEFAULT_PROOF_VERSION,
    content = 'Great product, would recommend.',
    skipSign = false,
  } = options

  const keypair = deterministicKeypair(seed)
  const time_window_id = DEFAULT_TIME_WINDOW_ID
  const epoch_id = deriveEpochId(subject_id, time_window_id)

  const proofBundle = makeProofBundle({
    time_window_id,
    nullifier_hash: sha256Hex(`nullifier:${keypair.publicKeyHex}:${epoch_id}`),
    ...options.proof_bundle,
  })

  const submission: ReviewSubmission = {
    review_id: nextId('review'),
    subject_id,
    content,
    posting_pubkey: keypair.publicKeyHex,
    signature: '', // placeholder, computed below
    proof_bundle: proofBundle,
    created_at: Math.floor(Date.now() / 1000),
    proof_version,
  }

  if (!skipSign) {
    const canonical = canonicalSerialize(submission as unknown as Record<string, unknown>)
    const sig = ed25519Sign(canonical, keypair.secretKey)
    submission.signature = bytesToHex(sig)
  }

  return submission
}

/**
 * Create a submission and return both the submission and the keypair used to sign it.
 * Useful for tests that need to verify/re-sign.
 */
export function makeSignedSubmission(options: MakeSubmissionOptions = {}) {
  const seed = options.seed || 'submission-signer'
  const keypair = deterministicKeypair(seed)
  const submission = makeSubmission({ ...options, seed })
  return { submission, keypair }
}

// ── Time Windows ─────────────────────────────────────────────────────

export function makeTimeWindow(overrides?: Partial<TimeWindow>): TimeWindow {
  const now = Math.floor(Date.now() / 1000)
  return {
    time_window_id: DEFAULT_TIME_WINDOW_ID,
    window_start: now - 604800,
    window_end: now,
    time_window_policy: 'weekly',
    ...overrides,
  }
}

// ── Keysets ───────────────────────────────────────────────────────────

export function makeKeyset(overrides?: Partial<KeysetRecord>): KeysetRecord {
  const now = Math.floor(Date.now() / 1000)
  return {
    keyset_id: nextId('keyset'),
    subject_id: DEFAULT_SUBJECT_ID,
    keyset_start: now - 86400,
    keyset_end: now,
    public_key: sha256Hex(`issuer-pubkey-${_counter}`),
    issuer_id: 'issuer-001',
    ...overrides,
  }
}
