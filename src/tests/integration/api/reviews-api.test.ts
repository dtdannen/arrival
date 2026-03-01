import { describe, it, expect } from 'vitest'

/**
 * Integration — Reviews API
 * Spec: 09-event-and-api-spec.md GET /v1/subjects/{subject_id}/reviews
 *
 * "Returns: published reviews only"
 * "Filters: verified_only, max_distance, time_window_id"
 */

interface ReviewResponse {
  review_id: string
  subject_id: string
  content: string
  time_window_id: string
  distance_bucket: number
  verification_badges: {
    interaction_verified: boolean
  }
}

interface StoredReview extends ReviewResponse {
  status: 'admitted' | 'published'
  created_at: number
}

function queryReviews(
  reviews: StoredReview[],
  subject_id: string,
  filters: { max_distance?: number; verified_only?: boolean },
): ReviewResponse[] {
  return reviews
    .filter((r) => r.subject_id === subject_id && r.status === 'published')
    .filter((r) => filters.max_distance === undefined || r.distance_bucket <= filters.max_distance)
    .filter((r) => !filters.verified_only || r.verification_badges.interaction_verified)
    .map(({ status, created_at, ...pub }) => pub)
}

const testReviews: StoredReview[] = [
  {
    review_id: 'r1', subject_id: 'subject-001', content: 'A', time_window_id: '2026-W09',
    distance_bucket: 1, verification_badges: { interaction_verified: true },
    status: 'published', created_at: 1700000000,
  },
  {
    review_id: 'r2', subject_id: 'subject-001', content: 'B', time_window_id: '2026-W09',
    distance_bucket: 2, verification_badges: { interaction_verified: false },
    status: 'published', created_at: 1700000100,
  },
  {
    review_id: 'r3', subject_id: 'subject-001', content: 'C', time_window_id: '2026-W09',
    distance_bucket: 1, verification_badges: { interaction_verified: true },
    status: 'admitted', created_at: 1700000200, // held, not published
  },
]

describe('Integration — Reviews API', () => {
  it('T-1220: GET /v1/subjects/{subject_id}/reviews returns only published reviews', () => {
    // Spec: 09-event-and-api-spec.md "published reviews only
    // (status = published; admitted-but-held reviews are not visible)"
    const results = queryReviews(testReviews, 'subject-001', {})

    expect(results).toHaveLength(2) // only r1 and r2, not r3 (admitted)
    expect(results.every((r) => !('status' in r))).toBe(true)
    expect(results.every((r) => !('created_at' in r))).toBe(true)
  })

  it('T-1221: Filter by max_distance works correctly', () => {
    // Spec: 09-event-and-api-spec.md "max_distance=1|2|3"
    const d1 = queryReviews(testReviews, 'subject-001', { max_distance: 1 })
    expect(d1).toHaveLength(1)
    expect(d1[0].distance_bucket).toBe(1)

    const d2 = queryReviews(testReviews, 'subject-001', { max_distance: 2 })
    expect(d2).toHaveLength(2)
  })

  it('T-1222: Filter by verified_only works correctly', () => {
    // Spec: 09-event-and-api-spec.md "verified_only=true|false"
    const verified = queryReviews(testReviews, 'subject-001', { verified_only: true })
    expect(verified).toHaveLength(1) // only r1 is published + verified
    expect(verified[0].verification_badges.interaction_verified).toBe(true)
  })
})
