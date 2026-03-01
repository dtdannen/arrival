/**
 * Shared types for Arrival MVP tests.
 *
 * These types define the interfaces that production code must implement.
 * Derived from 09-event-and-api-spec.md, 03-proof-spec.md, and 02-architecture.md.
 */

// ── Reject Codes (09-event-and-api-spec.md Reject Code Canon) ────────

export const REJECT_CODES = [
  'invalid_signature',
  'invalid_schema',
  'unsupported_proof_version',
  'invalid_epoch_context',
  'inactive_root',
  'insufficient_anonymity_set',
  'invalid_membership_proof',
  'invalid_interaction_proof',
  'invalid_timeblind_proof',
  'duplicate_nullifier',
] as const

export type RejectCode = (typeof REJECT_CODES)[number]

// ── Verification Result (09-event-and-api-spec.md) ───────────────────

export interface VerifiedFlags {
  membership_verified: boolean
  interaction_verified: boolean
  timeblind_verified: boolean
  nullifier_unique: boolean
  k_threshold_met: boolean
}

export interface VerificationResult {
  status: 'rejected' | 'admitted'
  reject_code: RejectCode | null
  reject_detail: string | null
  held_reason: string | null
  verified_flags: VerifiedFlags
}

// ── Proof Bundle (09-event-and-api-spec.md proof_bundle fields) ──────

export interface InteractionProof {
  r: string
  S: string
  keyset_id: string
}

export interface ProofBundle {
  cohort_root_hash: string
  membership_proof: unknown
  interaction_proof: InteractionProof
  timeblind_proof: unknown
  time_window_id: string
  window_start: number
  window_end: number
  nullifier_hash: string
}

// ── Review Submission (09-event-and-api-spec.md Body) ────────────────

export interface ReviewSubmission {
  review_id: string
  subject_id: string
  content: string
  posting_pubkey: string
  signature: string
  proof_bundle: ProofBundle
  created_at?: number  // server-set, not client-submitted (DP #2: never trust client)
  proof_version: string
}

// ── Supported proof versions ─────────────────────────────────────────

export const SUPPORTED_PROOF_VERSIONS = ['v1'] as const

// ── Root metadata (02-architecture.md Storage Model) ─────────────────

export interface RootRecord {
  root_id: string
  subject_id: string
  root_hash: string
  k_size: number
  distance_bucket: number
  graph_snapshot_hash: string
  valid_from: number
  valid_to: number
}

// ── Time window (11-time-window-policy.md) ───────────────────────────

export type TimeWindowPolicy = 'weekly' | 'biweekly' | 'monthly' | 'quarterly'

export interface TimeWindow {
  time_window_id: string
  window_start: number
  window_end: number
  time_window_policy: TimeWindowPolicy
}

// ── Keyset (12-receipt-spec.md) ──────────────────────────────────────

export interface KeysetRecord {
  keyset_id: string
  subject_id: string
  keyset_start: number
  keyset_end: number
  public_key: string
  issuer_id: string
}

// ── Step result for individual pipeline steps ────────────────────────

export interface StepResult {
  ok: boolean
  reject_code?: RejectCode
  reject_detail?: string
}

// ── Nullifier store interface ────────────────────────────────────────

export interface NullifierStore {
  exists(subject_id: string, epoch_id: string, nullifier_hash: string): boolean
  store(subject_id: string, epoch_id: string, nullifier_hash: string): void
}

// ── Root store interface ─────────────────────────────────────────────

export interface RootStore {
  getActive(subject_id: string, root_hash: string, now?: number): RootRecord | null
}

// ── Window registry interface ────────────────────────────────────────

export interface WindowRegistry {
  getBounds(time_window_id: string): { window_start: number; window_end: number } | null
}
