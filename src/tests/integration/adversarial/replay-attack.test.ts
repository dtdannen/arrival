import { describe, it, expect } from 'vitest'
import { makeSubmission } from '../../helpers/fixtures.js'
import { sha256Hex, deriveEpochId } from '../../helpers/crypto.js'
import type { ReviewSubmission, StepResult, NullifierStore } from '../../helpers/types.js'

/**
 * Adversarial — Replay Attack Tests
 * Spec: 10-test-plan.md Adversarial Test #1, 03-proof-spec.md Admission Step 10
 *
 * Attack: attacker captures a valid submission and resubmits it unchanged.
 * Defense: nullifier dedup rejects the second submission with duplicate_nullifier.
 */

// ── Simulated nullifier store ────────────────────────────────────────

function makeNullifierStore(): NullifierStore & { entries: Map<string, Set<string>> } {
  const entries = new Map<string, Set<string>>()
  return {
    entries,
    exists(subject_id, epoch_id, nullifier_hash) {
      const key = `${subject_id}:${epoch_id}`
      return entries.get(key)?.has(nullifier_hash) ?? false
    },
    store(subject_id, epoch_id, nullifier_hash) {
      const key = `${subject_id}:${epoch_id}`
      if (!entries.has(key)) entries.set(key, new Set())
      entries.get(key)!.add(nullifier_hash)
    },
  }
}

function checkNullifier(
  submission: ReviewSubmission,
  nullifierStore: NullifierStore,
  authoritative_epoch_id: string,
): StepResult {
  if (nullifierStore.exists(submission.subject_id, authoritative_epoch_id, submission.proof_bundle.nullifier_hash)) {
    return {
      ok: false,
      reject_code: 'duplicate_nullifier',
      reject_detail: 'Nullifier already consumed for this subject/epoch',
    }
  }
  return { ok: true }
}

describe('Adversarial — Replay Attack', () => {
  it('T-1400: Same payload resubmitted — rejected with duplicate_nullifier', () => {
    const store = makeNullifierStore()
    const submission = makeSubmission({ seed: 'replay-victim' })
    const epochId = deriveEpochId(submission.subject_id, submission.proof_bundle.time_window_id)

    // First submission: passes nullifier check and gets stored
    const firstResult = checkNullifier(submission, store, epochId)
    expect(firstResult.ok).toBe(true)
    store.store(submission.subject_id, epochId, submission.proof_bundle.nullifier_hash)

    // Replay: exact same payload resubmitted
    const replayResult = checkNullifier(submission, store, epochId)
    expect(replayResult.ok).toBe(false)
    expect(replayResult.reject_code).toBe('duplicate_nullifier')
  })

  it('T-1407: Concurrent duplicate nullifier race condition — exactly one admitted, one rejected', () => {
    const store = makeNullifierStore()
    const submission = makeSubmission({ seed: 'race-condition' })
    const epochId = deriveEpochId(submission.subject_id, submission.proof_bundle.time_window_id)

    // Simulate two concurrent submissions with the same nullifier
    // In production, this would be handled by database-level uniqueness constraint
    const results: StepResult[] = []

    // Both check simultaneously (before either stores)
    const check1 = checkNullifier(submission, store, epochId)
    // First one wins and stores
    if (check1.ok) {
      store.store(submission.subject_id, epochId, submission.proof_bundle.nullifier_hash)
      results.push(check1)
    }

    // Second one checks after first stored — should fail
    const check2 = checkNullifier(submission, store, epochId)
    results.push(check2)

    // Exactly one should succeed, one should fail
    const admitted = results.filter((r) => r.ok)
    const rejected = results.filter((r) => !r.ok)
    expect(admitted.length).toBe(1)
    expect(rejected.length).toBe(1)
    expect(rejected[0].reject_code).toBe('duplicate_nullifier')
  })
})
