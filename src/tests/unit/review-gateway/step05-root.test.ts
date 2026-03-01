import { describe, it, expect } from 'vitest'
import { sha256Hex } from '../../helpers/crypto.js'
import type { RootRecord, RootStore, StepResult } from '../../helpers/types.js'

/**
 * Step 5: Verify subject root exists and is active.
 * Spec: 02-architecture.md (roots table, valid_from/valid_to)
 * Reject code: inactive_root
 */

class InMemoryRootStore implements RootStore {
  private roots: RootRecord[] = []

  add(root: RootRecord) {
    this.roots.push(root)
  }

  getActive(subject_id: string, root_hash: string, now?: number): RootRecord | null {
    const timestamp = now ?? Math.floor(Date.now() / 1000)
    return this.roots.find(
      (r) =>
        r.subject_id === subject_id &&
        r.root_hash === root_hash &&
        r.valid_from <= timestamp &&
        r.valid_to >= timestamp,
    ) ?? null
  }
}

function validateRoot(
  cohort_root_hash: string,
  subject_id: string,
  rootStore: RootStore,
  now?: number,
): StepResult {
  const root = rootStore.getActive(subject_id, cohort_root_hash, now)
  if (!root) {
    return {
      ok: false,
      reject_code: 'inactive_root',
      reject_detail: `No active root found for subject ${subject_id} with hash ${cohort_root_hash}`,
    }
  }
  return { ok: true }
}

describe('Review Gateway — Step 5: Root Verification', () => {
  it('T-940: Active root passes', () => {
    const now = 1000000
    const store = new InMemoryRootStore()
    const rootHash = sha256Hex('active-root')
    store.add({
      root_id: 'root-1',
      subject_id: 'subject-001',
      root_hash: rootHash,
      k_size: 100,
      distance_bucket: 1,
      graph_snapshot_hash: sha256Hex('graph'),
      valid_from: now - 86400,
      valid_to: now + 86400,
    })

    const result = validateRoot(rootHash, 'subject-001', store, now)

    expect(result.ok).toBe(true)
  })

  it('T-941: Unknown root rejected — inactive_root', () => {
    const store = new InMemoryRootStore()
    // Store is empty — no roots at all

    const result = validateRoot('nonexistent-hash', 'subject-001', store)

    expect(result.ok).toBe(false)
    expect(result.reject_code).toBe('inactive_root')
  })

  it('T-942: Expired root rejected — inactive_root', () => {
    const now = 1000000
    const store = new InMemoryRootStore()
    const rootHash = sha256Hex('expired-root')
    store.add({
      root_id: 'root-expired',
      subject_id: 'subject-001',
      root_hash: rootHash,
      k_size: 100,
      distance_bucket: 1,
      graph_snapshot_hash: sha256Hex('graph'),
      valid_from: now - 172800,  // 2 days ago
      valid_to: now - 86400,     // expired 1 day ago
    })

    const result = validateRoot(rootHash, 'subject-001', store, now)

    expect(result.ok).toBe(false)
    expect(result.reject_code).toBe('inactive_root')
  })
})
