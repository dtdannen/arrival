import { describe, it, expect } from 'vitest'
import { sha256Hex } from '../../helpers/crypto.js'
import type { NullifierStore, StepResult } from '../../helpers/types.js'

/**
 * Step 10: Check nullifier uniqueness scoped to (subject_id, epoch_id).
 * Spec: 03-proof-spec.md admission step 10
 * Reject code: duplicate_nullifier
 *
 * Key spec requirements:
 * - Nullifier is scoped to (subject_id, epoch_id)
 * - Same nullifier in a different epoch is treated as unique
 * - On admission, nullifier is stored
 * - On rejection (earlier pipeline step), nullifier is NOT stored
 */

class InMemoryNullifierStore implements NullifierStore {
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

function checkNullifier(
  subject_id: string,
  epoch_id: string,
  nullifier_hash: string,
  nullifierStore: NullifierStore,
): StepResult {
  if (nullifierStore.exists(subject_id, epoch_id, nullifier_hash)) {
    return {
      ok: false,
      reject_code: 'duplicate_nullifier',
      reject_detail: `Nullifier ${nullifier_hash} already exists for (${subject_id}, ${epoch_id})`,
    }
  }
  // Store the nullifier on successful check (admission path)
  nullifierStore.store(subject_id, epoch_id, nullifier_hash)
  return { ok: true }
}

describe('Review Gateway — Step 10: Nullifier Uniqueness', () => {
  it('T-990: Unique nullifier passes — nullifier stored', () => {
    const store = new InMemoryNullifierStore()
    const nullifierHash = sha256Hex('unique-nullifier')

    const result = checkNullifier('subject-001', 'epoch-001', nullifierHash, store)

    expect(result.ok).toBe(true)
    // Verify it was stored
    expect(store.exists('subject-001', 'epoch-001', nullifierHash)).toBe(true)
  })

  it('T-991: Duplicate nullifier rejected — duplicate_nullifier', () => {
    const store = new InMemoryNullifierStore()
    const nullifierHash = sha256Hex('duplicate-nullifier')

    // First submission succeeds
    const first = checkNullifier('subject-001', 'epoch-001', nullifierHash, store)
    expect(first.ok).toBe(true)

    // Second submission with same nullifier in same scope is rejected
    const second = checkNullifier('subject-001', 'epoch-001', nullifierHash, store)

    expect(second.ok).toBe(false)
    expect(second.reject_code).toBe('duplicate_nullifier')
  })

  it('T-992: Same nullifier in different epoch passes — scoped to (subject_id, epoch_id)', () => {
    const store = new InMemoryNullifierStore()
    const nullifierHash = sha256Hex('cross-epoch-nullifier')

    // First submission in epoch-001
    const first = checkNullifier('subject-001', 'epoch-001', nullifierHash, store)
    expect(first.ok).toBe(true)

    // Same nullifier hash in epoch-002 should pass — different scope
    const second = checkNullifier('subject-001', 'epoch-002', nullifierHash, store)

    expect(second.ok).toBe(true)
  })
})
