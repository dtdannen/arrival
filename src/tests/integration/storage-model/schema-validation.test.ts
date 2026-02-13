import { describe, it } from 'vitest'

describe('Integration — Storage Model Schema Validation', () => {
  it.todo('T-1700: roots table schema — root_id, subject_id, root_hash, k_size, distance_bucket, graph_snapshot_hash, valid_from, valid_to')

  it.todo('T-1701: reviews table schema — review_id, subject_id, epoch_id, content_ref, proof_ref, distance_bucket, status, time_window_id, created_at')

  it.todo('T-1702: nullifiers table schema — subject_id, epoch_id, nullifier_hash, first_seen_at')

  it.todo('T-1703: spent_receipts table schema — receipt_hash, subject_id, spent_at')

  it.todo('T-1704: issuer_registry table schema — keyset_id, subject_id, keyset_start, keyset_end, public_key, issuer_id')
})
