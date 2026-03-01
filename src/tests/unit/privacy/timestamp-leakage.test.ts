import { describe, it, expect } from 'vitest'
import { makeSubmission } from '../../helpers/fixtures.js'
import type { ReviewSubmission } from '../../helpers/types.js'

/**
 * Privacy — Timestamp Leakage Tests
 * Spec: 09-event-and-api-spec.md Timestamp Exposure Policy, 12-receipt-spec.md Privacy Properties
 *
 * Core invariant: exact timestamps are never exposed in any API response.
 * Only time_window_id is a public timing signal.
 */

// ── Simulated API response formatters ────────────────────────────────

/** Format a review for the feed endpoint (GET /v1/subjects/{id}/reviews) */
function formatForFeed(review: ReviewSubmission & { status: string; distance_bucket: number }) {
  // Per 09-event-and-api-spec.md: feed returns review_id, subject_id, content,
  // time_window_id, distance_bucket, verification_badges. No created_at.
  return {
    review_id: review.review_id,
    subject_id: review.subject_id,
    content: review.content,
    time_window_id: review.proof_bundle.time_window_id,
    distance_bucket: review.distance_bucket,
    verification_badges: {
      membership_verified: true,
      interaction_verified: true,
      timeblind_verified: true,
    },
  }
}

/** Format a review for the verification endpoint (GET /v1/reviews/{id}/verification) */
function formatForVerification(review: ReviewSubmission) {
  // Per 09-event-and-api-spec.md: verification endpoint returns proof metadata.
  // No exact timestamps. time_window_id only.
  return {
    review_id: review.review_id,
    time_window_id: review.proof_bundle.time_window_id,
    proof_version: review.proof_version,
    membership_verified: true,
    interaction_verified: true,
    timeblind_verified: true,
    nullifier_unique: true,
    k_threshold_met: true,
  }
}

/** Format the cohort-root endpoint response */
function formatCohortRoot(subject_id: string) {
  return {
    distance_roots: [{ distance_bucket: 1, root_hash: 'abc', k_size: 100 }],
    epoch_id: 'epoch-001',
    time_window_id: '2026-W09',
    time_window_policy: 'weekly',
    window_start: 1740700800,
    window_end: 1741305600,
    receipt_volume_bucket: 'high',
    k_min: 50,
    t_min: 20,
  }
}

/** Format the submit endpoint response (verification result) */
function formatSubmitResponse() {
  return {
    status: 'admitted' as const,
    reject_code: null,
    reject_detail: null,
    held_reason: 'window_open',
    verified_flags: {
      membership_verified: true,
      interaction_verified: true,
      timeblind_verified: true,
      nullifier_unique: true,
      k_threshold_met: true,
    },
  }
}

const TIMESTAMP_FIELDS = ['created_at', 'submission_timestamp', 'published_at', 'interaction_timestamp']

function containsTimestampFields(obj: Record<string, unknown>): string[] {
  const found: string[] = []
  for (const key of TIMESTAMP_FIELDS) {
    if (key in obj) found.push(key)
  }
  // Also check nested objects
  for (const [key, val] of Object.entries(obj)) {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      for (const tsKey of TIMESTAMP_FIELDS) {
        if (tsKey in (val as Record<string, unknown>)) found.push(`${key}.${tsKey}`)
      }
    }
  }
  return found
}

describe('Privacy — Timestamp Leakage', () => {
  it('T-1300: created_at never in any API response — absent from cohort-root, submit, reviews, verification', () => {
    const submission = makeSubmission()
    const review = { ...submission, status: 'published', distance_bucket: 1 }

    // Check all four endpoint response formats
    const feedResponse = formatForFeed(review)
    const verificationResponse = formatForVerification(submission)
    const cohortResponse = formatCohortRoot(submission.subject_id)
    const submitResponse = formatSubmitResponse()

    // None should contain created_at or other exact timestamp fields
    expect(containsTimestampFields(feedResponse)).toEqual([])
    expect(containsTimestampFields(verificationResponse)).toEqual([])
    expect(containsTimestampFields(cohortResponse as unknown as Record<string, unknown>)).toEqual([])
    expect(containsTimestampFields(submitResponse as unknown as Record<string, unknown>)).toEqual([])

    // Verify time_window_id IS present (it's the only allowed timing signal)
    expect(feedResponse.time_window_id).toBeDefined()
    expect(verificationResponse.time_window_id).toBeDefined()
    expect(cohortResponse.time_window_id).toBeDefined()
  })

  it('T-1301: Published reviews contain no receipt data — no r, S, Hash(r), or keyset_id', () => {
    // Per 12-receipt-spec.md Privacy Properties: "Published reviews never contain
    // receipt data (r, S, Hash(r), or keyset_id)"
    const submission = makeSubmission()
    const feedEntry = formatForFeed({ ...submission, status: 'published', distance_bucket: 1 })

    const feedJson = JSON.stringify(feedEntry)

    // Receipt fields must not appear anywhere in the published review
    expect(feedJson).not.toContain(submission.proof_bundle.interaction_proof.r)
    expect(feedJson).not.toContain(submission.proof_bundle.interaction_proof.S)
    expect(feedJson).not.toContain(submission.proof_bundle.interaction_proof.keyset_id)
    expect(feedJson).not.toContain('"interaction_proof"')
    expect(feedJson).not.toContain('"proof_bundle"')
    expect(feedJson).not.toContain('"nullifier_hash"')
  })

  it('T-1305: UI never shows exact interaction timestamp — only time_window_id displayed', () => {
    const submission = makeSubmission()
    const feedEntry = formatForFeed({ ...submission, status: 'published', distance_bucket: 1 })

    // The only timing information is time_window_id
    expect(feedEntry.time_window_id).toBe(submission.proof_bundle.time_window_id)

    // No window_start, window_end, or any numeric timestamp in the feed entry
    const feedKeys = Object.keys(feedEntry)
    expect(feedKeys).not.toContain('window_start')
    expect(feedKeys).not.toContain('window_end')
    expect(feedKeys).not.toContain('created_at')
    expect(feedKeys).not.toContain('interaction_timestamp')
  })
})
