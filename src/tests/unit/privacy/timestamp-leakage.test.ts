import { describe, it } from 'vitest'

describe('Privacy — Timestamp Leakage', () => {
  it.todo('T-1300: created_at never in any API response — absent from cohort-root, submit, reviews, verification')

  it.todo('T-1301: Published reviews contain no receipt data — no r, S, Hash(r), or keyset_id')

  it.todo('T-1305: UI never shows exact interaction timestamp — only time_window_id displayed')
})
