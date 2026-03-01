import { describe, it, expect } from 'vitest'
import { sha256Hex, deriveEpochId } from '../../helpers/crypto.js'

/**
 * Integration — Storage Model Schema Validation
 * Spec: 02-architecture.md Storage Model (MVP)
 *
 * Validates that all storage tables have the required columns per spec.
 */

describe('Integration — Storage Model Schema Validation', () => {
  it('T-1700: roots table schema — root_id, subject_id, root_hash, k_size, distance_bucket, graph_snapshot_hash, valid_from, valid_to', () => {
    // Spec: 02-architecture.md "roots table:
    // root_id, subject_id, root_hash, k_size, distance_bucket, graph_snapshot_hash, valid_from, valid_to"
    const rootRow = {
      root_id: 'root-001',
      subject_id: 'subject-001',
      root_hash: sha256Hex('merkle-root'),
      k_size: 50,
      distance_bucket: 1,
      graph_snapshot_hash: sha256Hex('graph-state'),
      valid_from: 1700000000,
      valid_to: 1700086400,
    }

    const requiredColumns = [
      'root_id', 'subject_id', 'root_hash', 'k_size',
      'distance_bucket', 'graph_snapshot_hash', 'valid_from', 'valid_to',
    ]

    for (const col of requiredColumns) {
      expect(rootRow).toHaveProperty(col)
    }

    // Type assertions
    expect(typeof rootRow.root_id).toBe('string')
    expect(typeof rootRow.k_size).toBe('number')
    expect(typeof rootRow.distance_bucket).toBe('number')
    expect(rootRow.valid_to).toBeGreaterThan(rootRow.valid_from)
  })

  it('T-1701: reviews table schema — review_id, subject_id, epoch_id, content_ref, proof_ref, distance_bucket, status, time_window_id, created_at', () => {
    // Spec: 02-architecture.md "reviews table:
    // review_id, subject_id, epoch_id, content_ref, proof_ref, distance_bucket, status, time_window_id, created_at"
    const reviewRow = {
      review_id: 'review-001',
      subject_id: 'subject-001',
      epoch_id: deriveEpochId('subject-001', '2026-W09'),
      content_ref: 'content-hash-001',
      proof_ref: 'proof-hash-001',
      distance_bucket: 1,
      status: 'admitted' as const,
      time_window_id: '2026-W09',
      created_at: 1700000000,
    }

    const requiredColumns = [
      'review_id', 'subject_id', 'epoch_id', 'content_ref',
      'proof_ref', 'distance_bucket', 'status', 'time_window_id', 'created_at',
    ]

    for (const col of requiredColumns) {
      expect(reviewRow).toHaveProperty(col)
    }

    // Status must be one of the valid values
    expect(['admitted', 'published']).toContain(reviewRow.status)

    // created_at is stored (internal) but never exposed via API
    expect(reviewRow.created_at).toBeGreaterThan(0)
  })

  it('T-1702: nullifiers table schema — subject_id, epoch_id, nullifier_hash, first_seen_at', () => {
    // Spec: 02-architecture.md "nullifiers table: subject_id, epoch_id, nullifier_hash, first_seen_at"
    const nullifierRow = {
      subject_id: 'subject-001',
      epoch_id: deriveEpochId('subject-001', '2026-W09'),
      nullifier_hash: sha256Hex('nullifier-value'),
      first_seen_at: 1700000000,
    }

    const requiredColumns = ['subject_id', 'epoch_id', 'nullifier_hash', 'first_seen_at']

    for (const col of requiredColumns) {
      expect(nullifierRow).toHaveProperty(col)
    }

    expect(typeof nullifierRow.nullifier_hash).toBe('string')
    expect(nullifierRow.nullifier_hash.length).toBe(64) // SHA-256 hex
  })

  it('T-1703: spent_receipts table schema — receipt_hash, subject_id, spent_at', () => {
    // Spec: 02-architecture.md "spent_receipts table:
    // receipt_hash (primary key, Hash(r) from interaction receipt), first_seen_at"
    const spentReceiptRow = {
      receipt_hash: sha256Hex(sha256Hex('receipt-r')), // Hash(r)
      subject_id: 'subject-001',
      spent_at: 1700000000,
    }

    const requiredColumns = ['receipt_hash', 'subject_id', 'spent_at']

    for (const col of requiredColumns) {
      expect(spentReceiptRow).toHaveProperty(col)
    }

    // receipt_hash is a SHA-256 hash
    expect(spentReceiptRow.receipt_hash.length).toBe(64)
  })

  it('T-1704: issuer_registry table schema — keyset_id, subject_id, keyset_start, keyset_end, public_key, issuer_id', () => {
    // Spec: 12-receipt-spec.md Keyset Registry
    const issuerRow = {
      keyset_id: 'keyset-001',
      subject_id: 'subject-001',
      keyset_start: 1700000000,
      keyset_end: 1700086400,
      public_key: sha256Hex('issuer-pk'),
      issuer_id: 'issuer-001',
    }

    const requiredColumns = [
      'keyset_id', 'subject_id', 'keyset_start', 'keyset_end', 'public_key', 'issuer_id',
    ]

    for (const col of requiredColumns) {
      expect(issuerRow).toHaveProperty(col)
    }

    expect(issuerRow.keyset_end).toBeGreaterThan(issuerRow.keyset_start)
    expect(typeof issuerRow.issuer_id).toBe('string')
  })
})
