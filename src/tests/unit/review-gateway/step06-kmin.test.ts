import { describe, it, expect } from 'vitest'
import { sha256Hex } from '../../helpers/crypto.js'
import type { RootRecord, StepResult } from '../../helpers/types.js'

/**
 * Step 6: Enforce k_min threshold from server-side root metadata.
 * Spec: 03-proof-spec.md (k_min threshold, server-side k_size),
 *        02-architecture.md (Verification Pipeline step 6)
 * Reject code: insufficient_anonymity_set
 *
 * Key spec requirements:
 * - "k_size is always read from the server-side roots table, never from client input"
 * - "below-k_min submissions are hard-rejected and never deferred/held"
 */

interface KMinRootStore {
  getServerKSize(root_hash: string): number | null
}

class InMemoryKMinStore implements KMinRootStore {
  private roots = new Map<string, number>()

  add(root_hash: string, k_size: number) {
    this.roots.set(root_hash, k_size)
  }

  getServerKSize(root_hash: string): number | null {
    return this.roots.get(root_hash) ?? null
  }
}

function validateKMin(
  cohort_root_hash: string,
  rootStore: KMinRootStore,
  k_min: number,
): StepResult {
  const k_size = rootStore.getServerKSize(cohort_root_hash)
  if (k_size === null) {
    return {
      ok: false,
      reject_code: 'inactive_root',
      reject_detail: 'Root not found for k_size lookup',
    }
  }
  if (k_size < k_min) {
    return {
      ok: false,
      reject_code: 'insufficient_anonymity_set',
      reject_detail: `k_size ${k_size} < k_min ${k_min}`,
    }
  }
  return { ok: true }
}

describe('Review Gateway — Step 6: k_min Threshold', () => {
  it('T-950: Cohort above k_min passes', () => {
    const store = new InMemoryKMinStore()
    const rootHash = sha256Hex('large-cohort')
    store.add(rootHash, 100)

    const result = validateKMin(rootHash, store, 50)

    expect(result.ok).toBe(true)
  })

  it('T-951: Cohort below k_min hard-rejected — insufficient_anonymity_set', () => {
    const store = new InMemoryKMinStore()
    const rootHash = sha256Hex('small-cohort')
    store.add(rootHash, 30)

    const result = validateKMin(rootHash, store, 50)

    expect(result.ok).toBe(false)
    expect(result.reject_code).toBe('insufficient_anonymity_set')
  })

  it('T-952: k_size read from server, not client — server-side k_size used', () => {
    // Even if a hypothetical client claims k_size=100, the server uses its own value
    const store = new InMemoryKMinStore()
    const rootHash = sha256Hex('server-says-small')
    store.add(rootHash, 30) // Server says k_size=30

    // Validation uses server's k_size regardless of what client might claim
    const result = validateKMin(rootHash, store, 50)

    expect(result.ok).toBe(false)
    expect(result.reject_code).toBe('insufficient_anonymity_set')
    // The function never takes a client-provided k_size parameter —
    // it always reads from the server-side store
  })

  it('T-953: Below-k_min never admitted or held — reject, not deferred', () => {
    const store = new InMemoryKMinStore()
    const rootHash = sha256Hex('below-threshold')
    store.add(rootHash, 10)

    const result = validateKMin(rootHash, store, 50)

    // Must be a hard rejection, not a deferral
    expect(result.ok).toBe(false)
    expect(result.reject_code).toBe('insufficient_anonymity_set')
    // The result has no held_reason — it's a reject, not an admission with hold
    expect(result).not.toHaveProperty('held_reason')
  })
})
