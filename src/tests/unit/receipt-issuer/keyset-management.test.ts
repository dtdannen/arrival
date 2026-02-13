import { describe, it } from 'vitest'

describe('Receipt Issuer — Keyset Management', () => {
  it.todo('T-402: Keyset scoped to subject — verification against wrong subject keyset fails')

  it.todo('T-403: Keyset rotation produces new keys — different keyset_id and public key, old keyset in registry')

  it.todo('T-404: Keyset validity periods do not overlap — no overlapping [keyset_start, keyset_end] intervals')

  it.todo('T-405: Expired keyset still valid for verification — receipt signed with expired keyset still verifies')
})
