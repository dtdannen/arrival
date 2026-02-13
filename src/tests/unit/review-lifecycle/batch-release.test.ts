import { describe, it } from 'vitest'

describe('Review Lifecycle — Batch Release', () => {
  it.todo('T-1003: Batch release transitions all held reviews to published simultaneously')

  it.todo('T-1004: Batch release does not occur while window is open')

  it.todo('T-1005: Batch release blocked when t_min not met')

  it.todo('T-1006: Published reviews in randomized order — not submission order')

  it.todo('T-1007: Window merge for undersized windows — reviews published when merged window meets t_min')

  it.todo('T-1008: Rejected submission does not consume nullifier — reviewer can resubmit')
})
