import { describe, it } from 'vitest'

describe('Integration — Cohort Root API', () => {
  it.todo('T-1200: GET /v1/subjects/{subject_id}/cohort-root returns all required fields')

  it.todo('T-1201: distance_roots contains per-tier data — distance_bucket, root_hash, k_size')

  it.todo('T-1202: epoch_id is server-authoritative — matches hash(subject_id || time_window_id)')
})
