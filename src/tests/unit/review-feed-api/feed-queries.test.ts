import { describe, it, expect } from 'vitest'
import { sha256Hex } from '../../helpers/crypto.js'

/**
 * Review Feed API — Feed Queries
 * Spec: 09-event-and-api-spec.md GET /v1/subjects/{subject_id}/reviews
 *
 * "Returns: published reviews only (status = published; admitted-but-held reviews are not visible)"
 * "Per-review fields: review_id, subject_id, content, time_window_id, distance_bucket, verification_badges"
 * "No exact timestamps. created_at is never included."
 */

interface PublishedReview {
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

interface StoredReview extends PublishedReview {
  status: 'admitted' | 'published'
  created_at: number // internal only
}

interface FeedQuery {
  subject_id: string
  max_distance?: number
  verified_only?: boolean
  time_window_id?: string
}

class FeedStore {
  private reviews: StoredReview[] = []

  add(review: StoredReview): void {
    this.reviews.push(review)
  }

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
    return results.map(({ status, created_at, ...public_fields }) => public_fields)
  }
}

function makeFeedStore(): FeedStore {
  const store = new FeedStore()

  // Published reviews
  store.add({
    review_id: 'r1', subject_id: 'subject-001', content: 'Great', time_window_id: '2026-W09',
    distance_bucket: 1, verification_badges: { interaction_verified: true },
    status: 'published', created_at: 1700000000,
  })
  store.add({
    review_id: 'r2', subject_id: 'subject-001', content: 'Good', time_window_id: '2026-W09',
    distance_bucket: 2, verification_badges: { interaction_verified: true },
    status: 'published', created_at: 1700000100,
  })
  store.add({
    review_id: 'r3', subject_id: 'subject-001', content: 'OK', time_window_id: '2026-W10',
    distance_bucket: 3, verification_badges: { interaction_verified: false },
    status: 'published', created_at: 1700000200,
  })

  // Admitted but NOT published
  store.add({
    review_id: 'r4', subject_id: 'subject-001', content: 'Held', time_window_id: '2026-W11',
    distance_bucket: 1, verification_badges: { interaction_verified: true },
    status: 'admitted', created_at: 1700000300,
  })

  return store
}

describe('Review Feed API — Feed Queries', () => {
  it('T-1220: Returns only published reviews', () => {
    // Spec: 09-event-and-api-spec.md "published reviews only
    // (status = published; admitted-but-held reviews are not visible)"
    const store = makeFeedStore()
    const results = store.query({ subject_id: 'subject-001' })

    expect(results).toHaveLength(3) // only the 3 published, not the 1 admitted
    expect(results.every((r) => !('status' in r))).toBe(true)
  })

  it('T-1221: Filter by max_distance — only matching distance reviews returned', () => {
    // Spec: 09-event-and-api-spec.md "max_distance=1|2|3 — filters on the
    // distance_bucket stored at admission time"
    const store = makeFeedStore()

    const d1 = store.query({ subject_id: 'subject-001', max_distance: 1 })
    expect(d1).toHaveLength(1)
    expect(d1[0].distance_bucket).toBe(1)

    const d2 = store.query({ subject_id: 'subject-001', max_distance: 2 })
    expect(d2).toHaveLength(2)
    expect(d2.every((r) => r.distance_bucket <= 2)).toBe(true)

    const d3 = store.query({ subject_id: 'subject-001', max_distance: 3 })
    expect(d3).toHaveLength(3)
  })

  it('T-1222: Filter by verified_only — only fully verified reviews returned', () => {
    // Spec: 09-event-and-api-spec.md "verified_only=true|false"
    const store = makeFeedStore()

    const verified = store.query({ subject_id: 'subject-001', verified_only: true })
    expect(verified).toHaveLength(2) // r1 and r2 are interaction_verified
    expect(verified.every((r) => r.verification_badges.interaction_verified)).toBe(true)

    const all = store.query({ subject_id: 'subject-001', verified_only: false })
    expect(all).toHaveLength(3) // includes r3 which is not verified
  })

  it('T-1223: No created_at in response — only time_window_id as timing signal', () => {
    // Spec: 09-event-and-api-spec.md "No exact timestamps. created_at is never included.
    // The only timing signal is time_window_id"
    const store = makeFeedStore()
    const results = store.query({ subject_id: 'subject-001' })

    for (const review of results) {
      // created_at must NOT be in the response
      expect(review).not.toHaveProperty('created_at')
      expect(review).not.toHaveProperty('status')

      // time_window_id IS present as the only timing signal
      expect(review).toHaveProperty('time_window_id')
      expect(review.time_window_id).toBeTruthy()
    }
  })

  it('T-1224: Per-review fields match spec — review_id, subject_id, content, time_window_id, distance_bucket, verification_badges', () => {
    // Spec: 09-event-and-api-spec.md "Per-review fields: review_id, subject_id,
    // content, time_window_id, distance_bucket, verification_badges"
    const store = makeFeedStore()
    const results = store.query({ subject_id: 'subject-001' })
    const review = results[0]

    // All required fields present
    expect(review).toHaveProperty('review_id')
    expect(review).toHaveProperty('subject_id')
    expect(review).toHaveProperty('content')
    expect(review).toHaveProperty('time_window_id')
    expect(review).toHaveProperty('distance_bucket')
    expect(review).toHaveProperty('verification_badges')

    // No internal-only fields
    expect(review).not.toHaveProperty('created_at')
    expect(review).not.toHaveProperty('status')
    expect(review).not.toHaveProperty('epoch_id')
    expect(review).not.toHaveProperty('proof_ref')
  })

  it('T-1225: Filter by time_window_id — only matching window reviews returned', () => {
    // Spec: 09-event-and-api-spec.md Filter: time_window_id
    const store = makeFeedStore()

    const w09 = store.query({ subject_id: 'subject-001', time_window_id: '2026-W09' })
    expect(w09).toHaveLength(2)
    expect(w09.every((r) => r.time_window_id === '2026-W09')).toBe(true)

    const w10 = store.query({ subject_id: 'subject-001', time_window_id: '2026-W10' })
    expect(w10).toHaveLength(1)
    expect(w10[0].time_window_id).toBe('2026-W10')

    // Non-existent window
    const w99 = store.query({ subject_id: 'subject-001', time_window_id: '2026-W99' })
    expect(w99).toHaveLength(0)
  })
})
