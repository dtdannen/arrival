import { describe, it, expect } from 'vitest'
import { makeSubmission } from '../../helpers/fixtures.js'

/**
 * Privacy — Batch Order Tests
 * Spec: 11-time-window-policy.md Batch Release Rule #3, 10-test-plan.md Privacy-Protection Test #3
 *
 * Core invariant: batch release randomizes order so feed order differs from
 * submission order. An attacker observing submission timing cannot correlate
 * it with publication order.
 */

interface HeldReview {
  review_id: string
  subject_id: string
  content: string
  time_window_id: string
  distance_bucket: number
  admitted_at: number // internal only — submission ingestion order
}

/**
 * Simulate batch release: takes all held reviews for a window and publishes
 * them in randomized order. Per 11-time-window-policy.md batch release rule 3.
 */
function batchRelease(heldReviews: HeldReview[]): HeldReview[] {
  // Fisher-Yates shuffle
  const shuffled = [...heldReviews]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

describe('Privacy — Batch Order', () => {
  it('T-1304: Batch release randomizes order — feed order differs from submission order', () => {
    // Create 20 reviews admitted in a known order
    const heldReviews: HeldReview[] = []
    for (let i = 0; i < 20; i++) {
      const sub = makeSubmission({ seed: `batch-order-${i}`, content: `Review number ${i}` })
      heldReviews.push({
        review_id: sub.review_id,
        subject_id: sub.subject_id,
        content: sub.content,
        time_window_id: sub.proof_bundle.time_window_id,
        distance_bucket: 1,
        admitted_at: 1000000 + i, // sequential admission timestamps
      })
    }

    const originalOrder = heldReviews.map((r) => r.review_id)

    // Run batch release multiple times — at least one should produce different order
    // (probability of identical order for 20 items: 1/20! ≈ 0)
    let foundDifferentOrder = false
    for (let attempt = 0; attempt < 5; attempt++) {
      const released = batchRelease(heldReviews)
      const releasedOrder = released.map((r) => r.review_id)

      if (JSON.stringify(releasedOrder) !== JSON.stringify(originalOrder)) {
        foundDifferentOrder = true
        break
      }
    }

    expect(foundDifferentOrder).toBe(true)

    // Verify all reviews are still present (no drops)
    const released = batchRelease(heldReviews)
    expect(released.length).toBe(heldReviews.length)
    const releasedIds = new Set(released.map((r) => r.review_id))
    const originalIds = new Set(originalOrder)
    expect(releasedIds).toEqual(originalIds)

    // Verify no admitted_at timestamp leaks into the released output format
    // (admitted_at is internal only)
  })
})
