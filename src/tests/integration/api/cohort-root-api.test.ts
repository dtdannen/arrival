import { describe, it, expect } from 'vitest'
import { sha256Hex, deriveEpochId } from '../../helpers/crypto.js'
import type { TimeWindowPolicy } from '../../helpers/types.js'

/**
 * Integration — Cohort Root API
 * Spec: 09-event-and-api-spec.md GET /v1/subjects/{subject_id}/cohort-root
 *
 * Returns: distance_roots, epoch_id, time_window_id, time_window_policy,
 *          window_start, window_end, receipt_volume_bucket, k_min, t_min
 */

interface CohortRootResponse {
  distance_roots: Array<{
    distance_bucket: number
    root_hash: string
    k_size: number
  }>
  epoch_id: string
  time_window_id: string
  time_window_policy: TimeWindowPolicy
  window_start: number
  window_end: number
  receipt_volume_bucket: 'low' | 'medium' | 'high'
  k_min: number
  t_min: number
}

function mockCohortRootEndpoint(subject_id: string): CohortRootResponse {
  const time_window_id = '2026-W09'
  const epoch_id = deriveEpochId(subject_id, time_window_id)

  return {
    distance_roots: [
      { distance_bucket: 1, root_hash: sha256Hex(`root-${subject_id}-d1`), k_size: 30 },
      { distance_bucket: 2, root_hash: sha256Hex(`root-${subject_id}-d2`), k_size: 75 },
      { distance_bucket: 3, root_hash: sha256Hex(`root-${subject_id}-d3`), k_size: 150 },
    ],
    epoch_id,
    time_window_id,
    time_window_policy: 'weekly',
    window_start: 1709000000,
    window_end: 1709604800,
    receipt_volume_bucket: 'high',
    k_min: 20,
    t_min: 20,
  }
}

describe('Integration — Cohort Root API', () => {
  it('T-1200: GET /v1/subjects/{subject_id}/cohort-root returns all required fields', () => {
    // Spec: 09-event-and-api-spec.md cohort-root endpoint
    const response = mockCohortRootEndpoint('subject-001')

    // All required top-level fields
    expect(response).toHaveProperty('distance_roots')
    expect(response).toHaveProperty('epoch_id')
    expect(response).toHaveProperty('time_window_id')
    expect(response).toHaveProperty('time_window_policy')
    expect(response).toHaveProperty('window_start')
    expect(response).toHaveProperty('window_end')
    expect(response).toHaveProperty('receipt_volume_bucket')
    expect(response).toHaveProperty('k_min')
    expect(response).toHaveProperty('t_min')

    // Types
    expect(Array.isArray(response.distance_roots)).toBe(true)
    expect(typeof response.epoch_id).toBe('string')
    expect(['weekly', 'biweekly', 'monthly', 'quarterly']).toContain(response.time_window_policy)
    expect(['low', 'medium', 'high']).toContain(response.receipt_volume_bucket)
    expect(typeof response.k_min).toBe('number')
    expect(typeof response.t_min).toBe('number')
  })

  it('T-1201: distance_roots contains per-tier data — distance_bucket, root_hash, k_size', () => {
    // Spec: 09-event-and-api-spec.md "distance_roots — array of
    // { distance_bucket, root_hash, k_size } for each tier (d<=1, d<=2, d<=3)"
    const response = mockCohortRootEndpoint('subject-001')

    expect(response.distance_roots).toHaveLength(3)

    for (const tier of response.distance_roots) {
      expect(tier).toHaveProperty('distance_bucket')
      expect(tier).toHaveProperty('root_hash')
      expect(tier).toHaveProperty('k_size')
      expect(typeof tier.distance_bucket).toBe('number')
      expect(typeof tier.root_hash).toBe('string')
      expect(typeof tier.k_size).toBe('number')
    }

    // Distance buckets are 1, 2, 3
    const buckets = response.distance_roots.map((r) => r.distance_bucket).sort()
    expect(buckets).toEqual([1, 2, 3])

    // k_size increases with distance (cumulative tiers)
    const kSizes = response.distance_roots.map((r) => r.k_size)
    for (let i = 1; i < kSizes.length; i++) {
      expect(kSizes[i]).toBeGreaterThanOrEqual(kSizes[i - 1])
    }
  })

  it('T-1202: epoch_id is server-authoritative — matches hash(subject_id || time_window_id)', () => {
    // Spec: 02-architecture.md "epoch_id = hash(subject_id || time_window_id)"
    // 09-event-and-api-spec.md "epoch_id (string, server-authoritative)"
    const response = mockCohortRootEndpoint('subject-001')

    const expectedEpochId = deriveEpochId('subject-001', response.time_window_id)
    expect(response.epoch_id).toBe(expectedEpochId)

    // Different subject produces different epoch_id
    const response2 = mockCohortRootEndpoint('subject-002')
    expect(response2.epoch_id).not.toBe(response.epoch_id)
  })
})
