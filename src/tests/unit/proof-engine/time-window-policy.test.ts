import { describe, it } from 'vitest'

describe('Proof Engine — Adaptive Time Windows', () => {
  it.todo('T-1100: Weekly window for high-volume subject (100+ receipts/week)')

  it.todo('T-1101: Biweekly window for medium-volume subject (20-99 receipts/week)')

  it.todo('T-1102: Monthly window for moderate-volume subject (20+ receipts/month but <20/week)')

  it.todo('T-1103: Quarterly window for low-volume subject (<20 receipts/month)')

  it.todo('T-1104: All reviewers for a subject use same time_window_id')

  it.todo('T-1105: receipt_volume_bucket is coarse — medium not exact count')

  it.todo('T-1106: Volume bucket mapping — low (<20), medium (20-99), high (100+)')
})
