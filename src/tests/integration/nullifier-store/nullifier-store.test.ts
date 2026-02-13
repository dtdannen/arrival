import { describe, it } from 'vitest'

describe('Integration — Nullifier Store', () => {
  it.todo('T-1500: Store nullifier on admission — row with subject_id, epoch_id, nullifier_hash, first_seen_at')

  it.todo('T-1501: No nullifier stored on rejection')

  it.todo('T-1502: Nullifier scoped to (subject_id, epoch_id) — same hash in different scope treated independently')

  it.todo('T-1503: Nullifier integrity survives gateway restart — duplicate_nullifier after restart')
})
