/**
 * Nullifier Store — In-memory nullifier dedup for one-review-per-epoch enforcement.
 *
 * Spec: 03-proof-spec.md (Nullifier Uniqueness)
 *       02-architecture.md (Storage Model)
 *
 * Scoped to (subject_id, epoch_id, nullifier_hash) — same nullifier hash
 * in a different epoch is treated as a distinct entry.
 *
 * Production will use PostgreSQL nullifiers table.
 */

import type { NullifierStore } from '../shared/types.js'

export class InMemoryNullifierStore implements NullifierStore {
  private entries = new Set<string>()

  private key(subject_id: string, epoch_id: string, nullifier_hash: string): string {
    return `${subject_id}:${epoch_id}:${nullifier_hash}`
  }

  exists(subject_id: string, epoch_id: string, nullifier_hash: string): boolean {
    return this.entries.has(this.key(subject_id, epoch_id, nullifier_hash))
  }

  store(subject_id: string, epoch_id: string, nullifier_hash: string): void {
    this.entries.add(this.key(subject_id, epoch_id, nullifier_hash))
  }
}
