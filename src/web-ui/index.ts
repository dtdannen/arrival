/**
 * Web UI — Submission flow and verified feed browsing.
 *
 * Spec: 09-event-and-api-spec.md (Submission Flow, Feed Display)
 *       11-time-window-policy.md (Pre-Submission Disclosure)
 *       06-trust-model-and-risk-mitigation.md (Trust Boundaries, Remote Prover Warning)
 *
 * Responsibilities:
 * - Pre-submission disclosure: display anonymity set info before proof generation
 * - Proving mode management: local (default) vs remote (opt-in with trust warning)
 * - Feed formatting: strip internal fields, enforce timestamp policy
 * - Verification badge rendering: show proof status without leaking internals
 *
 * Privacy invariants:
 * - Local proving is the default — witness data stays on device
 * - Remote proving requires explicit trust warning acceptance
 * - No created_at, window_start, window_end, or interaction_timestamp in feed display
 * - Only time_window_id as public timing signal
 */

import type { TimeWindowPolicy } from '../shared/types.js'

// ── Proving mode ────────────────────────────────────────────────────

export type ProvingMode = 'local' | 'remote'

export interface ProvingConfig {
  mode: ProvingMode
  remoteEndpoint?: string
  trustWarningAccepted: boolean
}

export interface ProofResult {
  proofSent: boolean
  witnessSentRemotely: boolean
  warningShown: boolean
}

export interface Witness {
  identity_secret: string
  merkle_path: string[]
}

export interface ProverClient {
  config: ProvingConfig
  generateProof(witness: Witness): ProofResult
}

/**
 * Create a prover client with the given configuration.
 *
 * Per 06-trust-model-and-risk-mitigation.md:
 * - Local proving: witness data stays on device, no warning needed
 * - Remote proving without acceptance: warning shown, witness NOT sent
 * - Remote proving with acceptance: warning shown, witness sent
 *
 * Per CLAUDE.md Design Principle #5:
 * "Local proving is a privacy decision, not a performance decision."
 */
export function createProverClient(config: ProvingConfig): ProverClient {
  return {
    config,
    generateProof(witness: Witness): ProofResult {
      if (config.mode === 'local') {
        return { proofSent: false, witnessSentRemotely: false, warningShown: false }
      }

      // Remote mode: must show warning and get acceptance before sending witness
      if (!config.trustWarningAccepted) {
        return { proofSent: false, witnessSentRemotely: false, warningShown: true }
      }

      return { proofSent: true, witnessSentRemotely: true, warningShown: true }
    },
  }
}

// ── Pre-submission disclosure ────────────────────────────────────────

export interface PreSubmissionDisclosure {
  time_window_policy: TimeWindowPolicy
  receipt_volume_bucket: 'low' | 'medium' | 'high'
  t_min_met: boolean
  window_start: number
  window_end: number
  k_min: number
  k_size: number
  t_min: number
}

export interface CohortRootResponse {
  time_window_policy: TimeWindowPolicy
  receipt_volume_bucket: 'low' | 'medium' | 'high'
  window_start: number
  window_end: number
  k_min: number
  t_min: number
  distance_roots: Array<{ k_size: number; distance_bucket: number }>
}

/**
 * Build pre-submission disclosure from cohort root API response.
 *
 * Per 11-time-window-policy.md:
 * - Display current time window size for this subject
 * - Show approximate anonymity set size (from receipt_volume_bucket, not exact count)
 * - Show whether t_min is currently met
 * - Select smallest distance tier where k_size >= k_min
 */
export function buildDisclosure(
  cohortRootResponse: CohortRootResponse,
  currentReceiptCount: number,
): PreSubmissionDisclosure {
  const bestTier = cohortRootResponse.distance_roots
    .filter((r) => r.k_size >= cohortRootResponse.k_min)
    .sort((a, b) => a.distance_bucket - b.distance_bucket)[0]

  return {
    time_window_policy: cohortRootResponse.time_window_policy,
    receipt_volume_bucket: cohortRootResponse.receipt_volume_bucket,
    t_min_met: currentReceiptCount >= cohortRootResponse.t_min,
    window_start: cohortRootResponse.window_start,
    window_end: cohortRootResponse.window_end,
    k_min: cohortRootResponse.k_min,
    k_size: bestTier?.k_size ?? 0,
    t_min: cohortRootResponse.t_min,
  }
}

// ── Feed display formatting ─────────────────────────────────────────

export interface FeedEntry {
  review_id: string
  subject_id: string
  content: string
  time_window_id: string
  distance_bucket: number
  verification_badges: {
    interaction_verified: boolean
    membership_verified?: boolean
    timeblind_verified?: boolean
  }
}

/**
 * Format a review for feed display.
 *
 * Per 09-event-and-api-spec.md:
 * - Only: review_id, subject_id, content, time_window_id, distance_bucket, verification_badges
 * - NEVER: created_at, window_start, window_end, interaction_timestamp, signature, proof_bundle
 */
export function formatForFeed(review: {
  review_id: string
  subject_id: string
  content: string
  time_window_id: string
  distance_bucket: number
  verification_badges: { interaction_verified: boolean; membership_verified?: boolean }
}): FeedEntry {
  return {
    review_id: review.review_id,
    subject_id: review.subject_id,
    content: review.content,
    time_window_id: review.time_window_id,
    distance_bucket: review.distance_bucket,
    verification_badges: review.verification_badges,
  }
}

/**
 * Format a review for the verification detail view.
 *
 * Per 09-event-and-api-spec.md:
 * - Returns proof metadata and verification status
 * - No exact timestamps — only time_window_id
 */
export function formatForVerification(review: {
  review_id: string
  time_window_id: string
  proof_version: string
  membership_verified: boolean
  interaction_verified: boolean
  timeblind_verified: boolean
  nullifier_unique: boolean
  k_threshold_met: boolean
}) {
  return {
    review_id: review.review_id,
    time_window_id: review.time_window_id,
    proof_version: review.proof_version,
    membership_verified: review.membership_verified,
    interaction_verified: review.interaction_verified,
    timeblind_verified: review.timeblind_verified,
    nullifier_unique: review.nullifier_unique,
    k_threshold_met: review.k_threshold_met,
  }
}

/**
 * Format the cohort-root API response for the UI.
 *
 * Per 09-event-and-api-spec.md:
 * - Includes distance_roots, epoch_id, time_window_id, time_window_policy
 * - Includes window_start, window_end (for internal use by proof engine)
 * - No created_at or other exact timestamps
 */
export function formatCohortRoot(
  subject_id: string,
  cohortData: {
    distance_roots: Array<{ distance_bucket: number; root_hash: string; k_size: number }>
    epoch_id: string
    time_window_id: string
    time_window_policy: TimeWindowPolicy
    window_start: number
    window_end: number
    receipt_volume_bucket: 'low' | 'medium' | 'high'
    k_min: number
    t_min: number
  },
) {
  return {
    distance_roots: cohortData.distance_roots,
    epoch_id: cohortData.epoch_id,
    time_window_id: cohortData.time_window_id,
    time_window_policy: cohortData.time_window_policy,
    window_start: cohortData.window_start,
    window_end: cohortData.window_end,
    receipt_volume_bucket: cohortData.receipt_volume_bucket,
    k_min: cohortData.k_min,
    t_min: cohortData.t_min,
  }
}

/**
 * Format the submit endpoint response.
 *
 * Per 09-event-and-api-spec.md:
 * - Status is only 'admitted' or 'rejected', never 'published'
 * - No created_at or other exact timestamps
 */
export function formatSubmitResponse(result: {
  status: 'admitted' | 'rejected'
  reject_code: string | null
  reject_detail: string | null
  held_reason: string | null
  verified_flags: {
    membership_verified: boolean
    interaction_verified: boolean
    timeblind_verified: boolean
    nullifier_unique: boolean
    k_threshold_met: boolean
  }
}) {
  return {
    status: result.status,
    reject_code: result.reject_code,
    reject_detail: result.reject_detail,
    held_reason: result.held_reason,
    verified_flags: result.verified_flags,
  }
}
