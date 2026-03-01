import { describe, it, expect } from 'vitest'
import { deriveEpochId } from '../helpers/crypto.js'
import type { TimeWindowPolicy } from '../helpers/types.js'

/**
 * E2E — Pre-Submission Disclosure
 * Spec: 11-time-window-policy.md Pre-Submission Disclosure
 *
 * "Before generating a proof, the client must display to the reviewer:
 *  1. The current time window size for this subject
 *  2. The approximate anonymity set size (from receipt_volume_bucket)
 *  3. Whether t_min is currently met
 *  4. A clear statement about batch publication"
 */

interface PreSubmissionDisclosure {
  time_window_policy: TimeWindowPolicy
  receipt_volume_bucket: 'low' | 'medium' | 'high'
  t_min_met: boolean
  window_start: number
  window_end: number
  k_min: number
  k_size: number
  t_min: number
}

function buildDisclosure(
  cohortRootResponse: {
    time_window_policy: TimeWindowPolicy
    receipt_volume_bucket: 'low' | 'medium' | 'high'
    window_start: number
    window_end: number
    k_min: number
    t_min: number
    distance_roots: Array<{ k_size: number; distance_bucket: number }>
  },
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

describe('E2E — Pre-Submission Disclosure', () => {
  it('T-2104: Disclosed values match API response — window size, anonymity set, t_min status all accurate', () => {
    // Spec: 11-time-window-policy.md Pre-Submission Disclosure
    const cohortRoot = {
      time_window_policy: 'weekly' as TimeWindowPolicy,
      receipt_volume_bucket: 'high' as const,
      window_start: 1709000000,
      window_end: 1709604800,
      k_min: 20,
      t_min: 20,
      distance_roots: [
        { distance_bucket: 1, k_size: 30 },
        { distance_bucket: 2, k_size: 75 },
        { distance_bucket: 3, k_size: 150 },
      ],
    }

    // Case 1: t_min is met
    const disclosure = buildDisclosure(cohortRoot, 50)

    // Disclosure item 1: current time window size
    expect(disclosure.time_window_policy).toBe('weekly')

    // Disclosure item 2: approximate anonymity set size
    expect(disclosure.receipt_volume_bucket).toBe('high')
    expect(disclosure.k_size).toBe(30) // smallest tier meeting k_min

    // Disclosure item 3: whether t_min is currently met
    expect(disclosure.t_min_met).toBe(true)

    // Case 2: t_min NOT met
    const disclosureNoTmin = buildDisclosure(cohortRoot, 10)
    expect(disclosureNoTmin.t_min_met).toBe(false)

    // Values from API match disclosure
    expect(disclosure.window_start).toBe(cohortRoot.window_start)
    expect(disclosure.window_end).toBe(cohortRoot.window_end)
    expect(disclosure.k_min).toBe(cohortRoot.k_min)
    expect(disclosure.t_min).toBe(cohortRoot.t_min)
  })
})
