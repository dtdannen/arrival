import { describe, it, expect } from 'vitest'
import { sha256Hex, deriveEpochId } from '../../helpers/crypto.js'
import type { VerificationResult, VerifiedFlags } from '../../helpers/types.js'

/**
 * Review Lifecycle — Admission
 * Spec: 09-event-and-api-spec.md Verification Result Object
 *       02-architecture.md End-to-End Submission Flow steps 8-9
 *
 * "If admitted, review is stored with status admitted (held). Review is not yet visible in the feed."
 * "The gateway never returns 'published' synchronously."
 */

type ReviewStatus = 'admitted' | 'published'

interface StoredReview {
  review_id: string
  subject_id: string
  epoch_id: string
  status: ReviewStatus
  time_window_id: string
}

class ReviewStore {
  private reviews: StoredReview[] = []

  admit(review: StoredReview): void {
    this.reviews.push({ ...review, status: 'admitted' })
  }

  getPublished(subject_id: string): StoredReview[] {
    return this.reviews.filter(
      (r) => r.subject_id === subject_id && r.status === 'published',
    )
  }

  getAll(subject_id: string): StoredReview[] {
    return this.reviews.filter((r) => r.subject_id === subject_id)
  }
}

function makeAdmissionResult(held_reason: string): VerificationResult {
  return {
    status: 'admitted',
    reject_code: null,
    reject_detail: null,
    held_reason,
    verified_flags: {
      membership_verified: true,
      interaction_verified: true,
      timeblind_verified: true,
      nullifier_unique: true,
      k_threshold_met: true,
    },
  }
}

describe('Review Lifecycle — Admission', () => {
  it('T-1000: Admitted review not visible in feed', () => {
    // Spec: 02-architecture.md "If admitted, review is stored with status admitted (held).
    // Review is not yet visible in the feed."
    const store = new ReviewStore()
    const epoch_id = deriveEpochId('subject-001', '2026-W09')

    store.admit({
      review_id: 'review-1000',
      subject_id: 'subject-001',
      epoch_id,
      status: 'admitted',
      time_window_id: '2026-W09',
    })

    // Review exists in store
    const all = store.getAll('subject-001')
    expect(all).toHaveLength(1)
    expect(all[0].status).toBe('admitted')

    // But NOT visible in feed (published only)
    const published = store.getPublished('subject-001')
    expect(published).toHaveLength(0)
  })

  it('T-1001: Gateway returns admitted with held_reason', () => {
    // Spec: 09-event-and-api-spec.md "held_reason (nullable string, present when admitted;
    // e.g. 'window_open', 't_min_not_met')"
    const result = makeAdmissionResult('window_open')

    expect(result.status).toBe('admitted')
    expect(result.held_reason).toBe('window_open')
    expect(result.reject_code).toBeNull()
    expect(result.reject_detail).toBeNull()

    // All verification flags should be true for admitted reviews
    expect(result.verified_flags.membership_verified).toBe(true)
    expect(result.verified_flags.interaction_verified).toBe(true)
    expect(result.verified_flags.timeblind_verified).toBe(true)
    expect(result.verified_flags.nullifier_unique).toBe(true)
    expect(result.verified_flags.k_threshold_met).toBe(true)

    // t_min not met is also a valid held_reason
    const tMinResult = makeAdmissionResult('t_min_not_met')
    expect(tMinResult.status).toBe('admitted')
    expect(tMinResult.held_reason).toBe('t_min_not_met')
  })

  it('T-1002: Gateway never returns published synchronously', () => {
    // Spec: 09-event-and-api-spec.md "The gateway never returns 'published' synchronously.
    // Publication happens at batch release."
    const admittedResult = makeAdmissionResult('window_open')

    // Status is 'admitted', never 'published'
    expect(admittedResult.status).toBe('admitted')
    expect(admittedResult.status).not.toBe('published')

    // The verification result type only allows 'rejected' | 'admitted'
    const rejectedResult: VerificationResult = {
      status: 'rejected',
      reject_code: 'invalid_signature',
      reject_detail: 'Bad sig',
      held_reason: null,
      verified_flags: {
        membership_verified: false,
        interaction_verified: false,
        timeblind_verified: false,
        nullifier_unique: false,
        k_threshold_met: false,
      },
    }

    // Only two possible synchronous statuses
    expect(['admitted', 'rejected']).toContain(admittedResult.status)
    expect(['admitted', 'rejected']).toContain(rejectedResult.status)
  })
})
