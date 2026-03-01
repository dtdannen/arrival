import { describe, it, expect } from 'vitest'
import { sha256Hex } from '../helpers/crypto.js'
import type { RootStore, RootRecord, StepResult } from '../helpers/types.js'

/**
 * Reliability — Root Expiry
 * Spec: 02-architecture.md Verification Pipeline step 5
 *       02-architecture.md "Root refresh: daily or on significant WoT graph changes"
 *
 * "Root refresh does not admit proofs against expired roots — rejected with inactive_root"
 */

class InMemoryRootStore implements RootStore {
  private roots: RootRecord[] = []

  addRoot(root: RootRecord): void {
    this.roots.push(root)
  }

  getActive(subject_id: string, root_hash: string, now?: number): RootRecord | null {
    const currentTime = now ?? Math.floor(Date.now() / 1000)
    return this.roots.find(
      (r) =>
        r.subject_id === subject_id &&
        r.root_hash === root_hash &&
        r.valid_from <= currentTime &&
        r.valid_to > currentTime,
    ) ?? null
  }
}

function checkRootActive(
  subject_id: string,
  root_hash: string,
  rootStore: RootStore,
  now: number,
): StepResult {
  const root = rootStore.getActive(subject_id, root_hash, now)
  if (!root) {
    return {
      ok: false,
      reject_code: 'inactive_root',
      reject_detail: `Root ${root_hash} is not active for subject ${subject_id}`,
    }
  }
  return { ok: true }
}

describe('Reliability — Root Expiry', () => {
  it('T-1901: Root refresh does not admit proofs against expired roots — rejected with inactive_root', () => {
    // Spec: 02-architecture.md "Verify subject root exists and is active → inactive_root"
    const store = new InMemoryRootStore()

    const oldRoot: RootRecord = {
      root_id: 'root-old',
      subject_id: 'subject-001',
      root_hash: sha256Hex('old-merkle-root'),
      k_size: 50,
      distance_bucket: 1,
      graph_snapshot_hash: sha256Hex('old-graph'),
      valid_from: 1000,
      valid_to: 2000,
    }

    const newRoot: RootRecord = {
      root_id: 'root-new',
      subject_id: 'subject-001',
      root_hash: sha256Hex('new-merkle-root'),
      k_size: 60,
      distance_bucket: 1,
      graph_snapshot_hash: sha256Hex('new-graph'),
      valid_from: 2000,
      valid_to: 3000,
    }

    store.addRoot(oldRoot)
    store.addRoot(newRoot)

    const now = 2500 // old root expired, new root active

    // Proof against expired root: rejected
    const expiredResult = checkRootActive('subject-001', oldRoot.root_hash, store, now)
    expect(expiredResult.ok).toBe(false)
    expect(expiredResult.reject_code).toBe('inactive_root')

    // Proof against active root: accepted
    const activeResult = checkRootActive('subject-001', newRoot.root_hash, store, now)
    expect(activeResult.ok).toBe(true)
  })
})
