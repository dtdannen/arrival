import { describe, it, expect } from 'vitest'
import { sha256Hex } from '../../helpers/crypto.js'
import { makeCohortRoot, makeSubmission } from '../../helpers/fixtures.js'
import type { ReviewSubmission, RootRecord, RootStore, StepResult } from '../../helpers/types.js'

/**
 * Adversarial — Stale Root Tests
 * Spec: 10-test-plan.md Adversarial Test #4, 02-architecture.md Verification Pipeline Step 5
 *
 * Attack: attacker builds a proof against an expired or revoked cohort root,
 * perhaps one where they were a member but have since been removed.
 * Defense: the gateway checks root validity before accepting the membership proof.
 */

function makeRootStore(roots: RootRecord[]): RootStore {
  return {
    getActive(subject_id, root_hash, now = Math.floor(Date.now() / 1000)) {
      return (
        roots.find(
          (r) =>
            r.subject_id === subject_id &&
            r.root_hash === root_hash &&
            r.valid_from <= now &&
            r.valid_to >= now,
        ) || null
      )
    },
  }
}

function checkRootActive(submission: ReviewSubmission, rootStore: RootStore): StepResult {
  const root = rootStore.getActive(submission.subject_id, submission.proof_bundle.cohort_root_hash)
  if (!root) {
    return {
      ok: false,
      reject_code: 'inactive_root',
      reject_detail: 'Cohort root not found, expired, or not yet valid',
    }
  }
  return { ok: true }
}

describe('Adversarial — Stale Root', () => {
  it('T-1403: Proof built for expired root — rejected with inactive_root', () => {
    const now = Math.floor(Date.now() / 1000)

    // Create an expired root (valid_to is in the past)
    const expiredRoot = makeCohortRoot({
      root_hash: sha256Hex('expired-root'),
      valid_from: now - 172800, // 2 days ago
      valid_to: now - 86400,   // expired 1 day ago
    })

    // Create a current valid root
    const activeRoot = makeCohortRoot({
      root_hash: sha256Hex('active-root'),
      valid_from: now - 86400,
      valid_to: now + 86400,
    })

    const rootStore = makeRootStore([expiredRoot, activeRoot])

    // Attacker builds proof against the expired root
    const attackerSubmission = makeSubmission({
      seed: 'stale-root-attacker',
      proof_bundle: { cohort_root_hash: expiredRoot.root_hash },
    })

    const result = checkRootActive(attackerSubmission, rootStore)
    expect(result.ok).toBe(false)
    expect(result.reject_code).toBe('inactive_root')

    // Legitimate submission with active root should pass
    const legitimateSubmission = makeSubmission({
      seed: 'legitimate-user',
      proof_bundle: { cohort_root_hash: activeRoot.root_hash },
    })

    const legitimateResult = checkRootActive(legitimateSubmission, rootStore)
    expect(legitimateResult.ok).toBe(true)

    // Root that doesn't exist at all — also rejected
    const unknownRootSubmission = makeSubmission({
      seed: 'unknown-root',
      proof_bundle: { cohort_root_hash: sha256Hex('completely-unknown-root') },
    })

    const unknownResult = checkRootActive(unknownRootSubmission, rootStore)
    expect(unknownResult.ok).toBe(false)
    expect(unknownResult.reject_code).toBe('inactive_root')
  })
})
