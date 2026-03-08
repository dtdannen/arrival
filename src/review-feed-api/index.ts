/**
 * Review Feed API — Published review serving, batch release, and verification endpoint.
 *
 * Spec: 09-event-and-api-spec.md (GET /v1/subjects/{subject_id}/reviews, GET /v1/reviews/{review_id}/verification)
 *       11-time-window-policy.md (Batch Release Policy, Adaptive Windows)
 *       06-trust-model-and-risk-mitigation.md (No timestamp leakage)
 *
 * Responsibilities:
 * - Store admitted reviews (held until batch release)
 * - Query published reviews with distance, verified_only, and time_window_id filters
 * - Batch release: atomic transition, Fisher-Yates shuffle, idempotent
 * - Verification endpoint: proof metadata without exact timestamps
 * - Pre-submission disclosure: build disclosure from cohort root data
 *
 * Privacy invariants:
 * - created_at is NEVER in any response
 * - Receipt data (r, S, keyset_id) is NEVER in feed responses
 * - Only time_window_id as public timing signal
 * - Batch release randomizes order (Fisher-Yates)
 */

import type { TimeWindowPolicy } from '../shared/types.js'

// ── Public types ────────────────────────────────────────────────────

export type ReviewStatus = 'admitted' | 'published'

export interface PublishedReview {
  review_id: string
  subject_id: string
  content: string
  time_window_id: string
  distance_bucket: number
  verification_badges: {
    interaction_verified: boolean
    membership_verified?: boolean
  }
}

export interface StoredReview extends PublishedReview {
  status: ReviewStatus
  created_at: number
  epoch_id?: string
  proof_version?: string
  admission_order?: number
  verification_status?: VerificationStatus
}

export interface FeedQuery {
  subject_id: string
  max_distance?: number
  verified_only?: boolean
  time_window_id?: string
}

export interface VerificationStatus {
  membership_verified: boolean
  interaction_verified: boolean
  timeblind_verified: boolean
  nullifier_unique: boolean
}

export interface VerificationResponse {
  review_id: string
  subject_id: string
  time_window_id: string
  proof_version: string
  verification_status: VerificationStatus
  distance_bucket: number
}

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

// ── Feed Store ──────────────────────────────────────────────────────

/**
 * In-memory review store with feed query and batch release.
 *
 * Per 09-event-and-api-spec.md:
 * - Feed returns only published reviews
 * - Per-review fields: review_id, subject_id, content, time_window_id, distance_bucket, verification_badges
 * - No created_at, no status, no epoch_id, no proof_ref in responses
 */
export class FeedStore {
  private reviews: StoredReview[] = []
  private releasedWindows = new Set<string>()

  add(review: StoredReview): void {
    this.reviews.push(review)
  }

  admit(review: Omit<StoredReview, 'status' | 'admission_order'>): void {
    this.reviews.push({
      ...review,
      status: 'admitted',
      admission_order: this.reviews.length,
    })
  }

  /**
   * Query published reviews with optional filters.
   *
   * Per 09-event-and-api-spec.md:
   * - Only status = 'published' reviews returned
   * - created_at and status stripped from response
   * - Filters: max_distance, verified_only, time_window_id
   */
  query(q: FeedQuery): PublishedReview[] {
    let results = this.reviews.filter(
      (r) => r.subject_id === q.subject_id && r.status === 'published',
    )

    if (q.max_distance !== undefined) {
      results = results.filter((r) => r.distance_bucket <= q.max_distance!)
    }

    if (q.verified_only) {
      results = results.filter((r) => r.verification_badges.interaction_verified)
    }

    if (q.time_window_id) {
      results = results.filter((r) => r.time_window_id === q.time_window_id)
    }

    // Strip internal fields — return only public fields per spec
    return results.map(({
      status: _status,
      created_at: _created_at,
      epoch_id: _epoch_id,
      proof_version: _proof_version,
      admission_order: _admission_order,
      verification_status: _verification_status,
      ...public_fields
    }) => public_fields)
  }

  /**
   * Batch release: atomically transition all admitted reviews for a
   * (subject_id, time_window_id) to published.
   *
   * Per 11-time-window-policy.md:
   * - Both windowClosed AND tMinMet must be true
   * - Fisher-Yates shuffle for randomized order
   * - Idempotent: second call returns empty
   */
  batchRelease(
    subject_id: string,
    time_window_id: string,
    windowClosed: boolean,
    tMinMet: boolean,
  ): { released: StoredReview[]; alreadyReleased: boolean } {
    const key = `${subject_id}:${time_window_id}`

    if (this.releasedWindows.has(key)) {
      return { released: [], alreadyReleased: true }
    }

    if (!windowClosed || !tMinMet) {
      return { released: [], alreadyReleased: false }
    }

    const held = this.reviews.filter(
      (r) => r.subject_id === subject_id
        && r.time_window_id === time_window_id
        && r.status === 'admitted',
    )

    // Fisher-Yates shuffle
    const shuffled = [...held]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    // Transition all to published atomically
    for (const review of held) {
      review.status = 'published'
    }

    this.releasedWindows.add(key)
    return { released: shuffled, alreadyReleased: false }
  }

  getPublished(subject_id: string): StoredReview[] {
    return this.reviews.filter(
      (r) => r.subject_id === subject_id && r.status === 'published',
    )
  }

  getHeld(subject_id: string, time_window_id: string): StoredReview[] {
    return this.reviews.filter(
      (r) => r.subject_id === subject_id
        && r.time_window_id === time_window_id
        && r.status === 'admitted',
    )
  }

  getAll(subject_id: string): StoredReview[] {
    return this.reviews.filter((r) => r.subject_id === subject_id)
  }

  getById(review_id: string): StoredReview | undefined {
    return this.reviews.find((r) => r.review_id === review_id)
  }
}

// ── Verification endpoint ───────────────────────────────────────────

/**
 * Build verification response for a stored review.
 *
 * Per 09-event-and-api-spec.md:
 * - Returns proof metadata and verification status
 * - No exact timestamps — only time_window_id
 */
export function buildVerificationResponse(review: StoredReview): VerificationResponse {
  return {
    review_id: review.review_id,
    subject_id: review.subject_id,
    time_window_id: review.time_window_id,
    proof_version: review.proof_version ?? 'v1',
    verification_status: review.verification_status ?? {
      membership_verified: review.verification_badges.membership_verified ?? true,
      interaction_verified: review.verification_badges.interaction_verified,
      timeblind_verified: true,
      nullifier_unique: true,
    },
    distance_bucket: review.distance_bucket,
  }
}

// ── Pre-submission disclosure ────────────────────────────────────────

/**
 * Build pre-submission disclosure from cohort root API response.
 *
 * Per 11-time-window-policy.md:
 * - Display time window size, anonymity set size, t_min status
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

// ── Release condition check ─────────────────────────────────────────

/**
 * Check if a batch can be released.
 *
 * Per 11-time-window-policy.md:
 * - ALL three conditions must be met: window closed, k_min met, t_min met
 */
export function canRelease(conditions: {
  windowClosed: boolean
  kMinMet: boolean
  tMinMet: boolean
}): boolean {
  return conditions.windowClosed && conditions.kMinMet && conditions.tMinMet
}

// ── Feed response formatting ────────────────────────────────────────

/**
 * Format a review for the feed endpoint.
 *
 * Per 09-event-and-api-spec.md:
 * - Only: review_id, subject_id, content, time_window_id, distance_bucket, verification_badges
 * - No: created_at, status, signature, proof_bundle, receipt data
 */
export function formatForFeed(review: {
  review_id: string
  subject_id: string
  content: string
  time_window_id: string
  distance_bucket: number
  verification_badges: { interaction_verified: boolean; membership_verified?: boolean }
}): PublishedReview {
  return {
    review_id: review.review_id,
    subject_id: review.subject_id,
    content: review.content,
    time_window_id: review.time_window_id,
    distance_bucket: review.distance_bucket,
    verification_badges: review.verification_badges,
  }
}
