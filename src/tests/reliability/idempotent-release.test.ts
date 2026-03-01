import { describe, it, expect } from 'vitest'

/**
 * Reliability — Idempotent Release
 * Spec: 11-time-window-policy.md Batch Release Policy
 *
 * "Batch release triggered twice — no duplicate publications"
 */

type ReviewStatus = 'admitted' | 'published'

interface StoredReview {
  review_id: string
  status: ReviewStatus
}

class IdempotentReleaseStore {
  private reviews: StoredReview[] = []
  private releasedWindows = new Set<string>()

  addHeld(review_id: string): void {
    this.reviews.push({ review_id, status: 'admitted' })
  }

  batchRelease(windowKey: string): { released: number; alreadyReleased: boolean } {
    if (this.releasedWindows.has(windowKey)) {
      return { released: 0, alreadyReleased: true }
    }

    let count = 0
    for (const review of this.reviews) {
      if (review.status === 'admitted') {
        review.status = 'published'
        count++
      }
    }

    this.releasedWindows.add(windowKey)
    return { released: count, alreadyReleased: false }
  }

  getPublished(): StoredReview[] {
    return this.reviews.filter((r) => r.status === 'published')
  }
}

describe('Reliability — Idempotent Release', () => {
  it('T-1903: Batch release triggered twice — no duplicate publications', () => {
    // Spec: Batch release must be idempotent
    const store = new IdempotentReleaseStore()
    const windowKey = 'subject-001:2026-W09'

    store.addHeld('review-1')
    store.addHeld('review-2')
    store.addHeld('review-3')

    // First release: publishes all 3
    const first = store.batchRelease(windowKey)
    expect(first.released).toBe(3)
    expect(first.alreadyReleased).toBe(false)
    expect(store.getPublished()).toHaveLength(3)

    // Second release: no-op, already released
    const second = store.batchRelease(windowKey)
    expect(second.released).toBe(0)
    expect(second.alreadyReleased).toBe(true)

    // Still exactly 3 published — no duplicates
    expect(store.getPublished()).toHaveLength(3)
  })
})
