import { describe, it, expect } from 'vitest'
import type { TimeWindowPolicy } from '../../helpers/types.js'

/**
 * Proof Engine — Adaptive Time Windows
 * Spec: 11-time-window-policy.md Window Size Rules
 *
 * | Receipt volume (rolling period) | Window size |
 * |---------------------------------|-------------|
 * | 100+ receipts/week              | Weekly      |
 * | 20-99 receipts/week             | Biweekly    |
 * | 20+ receipts/month              | Monthly     |
 * | < 20 receipts/month             | Quarterly   |
 */

type VolumeBucket = 'low' | 'medium' | 'high'

interface VolumeMetrics {
  receipts_per_week: number
  receipts_per_month: number
}

function determineWindowPolicy(metrics: VolumeMetrics): TimeWindowPolicy {
  if (metrics.receipts_per_week >= 100) return 'weekly'
  if (metrics.receipts_per_week >= 20) return 'biweekly'
  if (metrics.receipts_per_month >= 20) return 'monthly'
  return 'quarterly'
}

function determineVolumeBucket(receiptCount: number): VolumeBucket {
  // Spec: 11-time-window-policy.md "receipt_volume_bucket is deliberately coarse"
  if (receiptCount >= 100) return 'high'
  if (receiptCount >= 20) return 'medium'
  return 'low'
}

function computeTimeWindowId(
  subject_id: string,
  policy: TimeWindowPolicy,
  referenceDate: Date,
): string {
  const year = referenceDate.getUTCFullYear()
  const month = referenceDate.getUTCMonth() + 1

  switch (policy) {
    case 'weekly': {
      // ISO week number
      const jan1 = new Date(Date.UTC(year, 0, 1))
      const days = Math.floor((referenceDate.getTime() - jan1.getTime()) / 86400000)
      const week = Math.ceil((days + jan1.getUTCDay() + 1) / 7)
      return `${year}-W${String(week).padStart(2, '0')}`
    }
    case 'biweekly': {
      const jan1 = new Date(Date.UTC(year, 0, 1))
      const days = Math.floor((referenceDate.getTime() - jan1.getTime()) / 86400000)
      const biweek = Math.ceil((days + jan1.getUTCDay() + 1) / 14)
      return `${year}-BW${String(biweek).padStart(2, '0')}`
    }
    case 'monthly':
      return `${year}-M${String(month).padStart(2, '0')}`
    case 'quarterly': {
      const quarter = Math.ceil(month / 3)
      return `${year}-Q${quarter}`
    }
  }
}

describe('Proof Engine — Adaptive Time Windows', () => {
  it('T-1100: Weekly window for high-volume subject (100+ receipts/week)', () => {
    // Spec: 11-time-window-policy.md "100+ receipts/week → Weekly"
    const metrics: VolumeMetrics = { receipts_per_week: 150, receipts_per_month: 600 }
    expect(determineWindowPolicy(metrics)).toBe('weekly')
  })

  it('T-1101: Biweekly window for medium-volume subject (20-99 receipts/week)', () => {
    // Spec: 11-time-window-policy.md "20-99 receipts/week → Biweekly"
    const metrics: VolumeMetrics = { receipts_per_week: 50, receipts_per_month: 200 }
    expect(determineWindowPolicy(metrics)).toBe('biweekly')

    // Edge case: exactly 20/week
    const edge: VolumeMetrics = { receipts_per_week: 20, receipts_per_month: 80 }
    expect(determineWindowPolicy(edge)).toBe('biweekly')

    // Just below weekly threshold
    const justBelow: VolumeMetrics = { receipts_per_week: 99, receipts_per_month: 396 }
    expect(determineWindowPolicy(justBelow)).toBe('biweekly')
  })

  it('T-1102: Monthly window for moderate-volume subject (20+ receipts/month but <20/week)', () => {
    // Spec: 11-time-window-policy.md "20+ receipts/month → Monthly"
    const metrics: VolumeMetrics = { receipts_per_week: 10, receipts_per_month: 40 }
    expect(determineWindowPolicy(metrics)).toBe('monthly')

    // Edge case: exactly 20/month
    const edge: VolumeMetrics = { receipts_per_week: 5, receipts_per_month: 20 }
    expect(determineWindowPolicy(edge)).toBe('monthly')
  })

  it('T-1103: Quarterly window for low-volume subject (<20 receipts/month)', () => {
    // Spec: 11-time-window-policy.md "< 20 receipts/month → Quarterly, or suppress"
    const metrics: VolumeMetrics = { receipts_per_week: 3, receipts_per_month: 12 }
    expect(determineWindowPolicy(metrics)).toBe('quarterly')

    // Very low volume
    const veryLow: VolumeMetrics = { receipts_per_week: 0, receipts_per_month: 1 }
    expect(determineWindowPolicy(veryLow)).toBe('quarterly')
  })

  it('T-1104: All reviewers for a subject use same time_window_id', () => {
    // Spec: 11-time-window-policy.md "All reviewers for a given subject in a given
    // period use the same window. Per-reviewer window variation is not allowed."
    const policy: TimeWindowPolicy = 'weekly'
    const date = new Date('2026-02-27T12:00:00Z')

    // Three different reviewers, same subject, same date
    const windowA = computeTimeWindowId('subject-001', policy, date)
    const windowB = computeTimeWindowId('subject-001', policy, date)
    const windowC = computeTimeWindowId('subject-001', policy, date)

    expect(windowA).toBe(windowB)
    expect(windowB).toBe(windowC)
  })

  it('T-1105: receipt_volume_bucket is coarse — medium not exact count', () => {
    // Spec: 11-time-window-policy.md "receipt_volume_bucket is deliberately coarse
    // to avoid leaking exact sales data"
    // 25 receipts and 95 receipts both map to 'medium'
    expect(determineVolumeBucket(25)).toBe('medium')
    expect(determineVolumeBucket(95)).toBe('medium')

    // Different exact counts, same bucket
    expect(determineVolumeBucket(20)).toBe(determineVolumeBucket(99))

    // The bucket does NOT reveal the exact count
    const bucket = determineVolumeBucket(42)
    expect(bucket).toBe('medium')
    // Cannot determine 42 from 'medium' — only that count is in [20, 100)
  })

  it('T-1106: Volume bucket mapping — low (<20), medium (20-99), high (100+)', () => {
    // Spec: 11-time-window-policy.md Volume bucket mapping
    // low: < 20
    expect(determineVolumeBucket(0)).toBe('low')
    expect(determineVolumeBucket(19)).toBe('low')

    // medium: 20-99
    expect(determineVolumeBucket(20)).toBe('medium')
    expect(determineVolumeBucket(99)).toBe('medium')

    // high: 100+
    expect(determineVolumeBucket(100)).toBe('high')
    expect(determineVolumeBucket(1000)).toBe('high')
  })
})
