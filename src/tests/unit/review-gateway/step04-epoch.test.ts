import { describe, it, expect } from 'vitest'
import { deriveEpochId } from '../../helpers/crypto.js'
import { makeSubmission } from '../../helpers/fixtures.js'
import type { ReviewSubmission, StepResult } from '../../helpers/types.js'

/**
 * Step 4: Validate epoch context — server derives authoritative epoch_id and
 * rejects submissions whose proof public input epoch_id does not match.
 * Spec: 02-architecture.md (epoch_id = hash(subject_id || time_window_id)),
 *        03-proof-spec.md admission step 4
 * Reject code: invalid_epoch_context
 */

interface EpochPolicyContext {
  time_window_id: string
}

function validateEpochContext(
  submission: ReviewSubmission,
  policyContext: EpochPolicyContext,
): StepResult {
  // Server derives authoritative epoch_id
  const authoritativeEpochId = deriveEpochId(
    submission.subject_id,
    policyContext.time_window_id,
  )

  // The proof's epoch_id is embedded via the nullifier scope.
  // For this test, we use time_window_id from the proof bundle as the client-claimed value.
  const clientTimeWindowId = submission.proof_bundle.time_window_id
  const clientEpochId = deriveEpochId(submission.subject_id, clientTimeWindowId)

  if (clientEpochId !== authoritativeEpochId) {
    return {
      ok: false,
      reject_code: 'invalid_epoch_context',
      reject_detail: `Client epoch ${clientEpochId} does not match server epoch ${authoritativeEpochId}`,
    }
  }

  return { ok: true }
}

describe('Review Gateway — Step 4: Epoch Context', () => {
  it('T-930: Matching epoch passes', () => {
    const timeWindowId = '2026-W09'
    const submission = makeSubmission({
      seed: 't930',
      proof_bundle: { time_window_id: timeWindowId },
    })
    const policyContext: EpochPolicyContext = { time_window_id: timeWindowId }

    const result = validateEpochContext(submission, policyContext)

    expect(result.ok).toBe(true)
  })

  it('T-931: Mismatched epoch rejected — invalid_epoch_context', () => {
    const submission = makeSubmission({
      seed: 't931',
      proof_bundle: { time_window_id: '2026-W09' },
    })
    // Server says we're in a different window
    const policyContext: EpochPolicyContext = { time_window_id: '2026-W10' }

    const result = validateEpochContext(submission, policyContext)

    expect(result.ok).toBe(false)
    expect(result.reject_code).toBe('invalid_epoch_context')
  })

  it('T-932: Server derives epoch authoritatively — gateway computes epoch_id from policy context', () => {
    const subjectId = 'subject-test-932'
    const timeWindowId = '2026-W09'

    // Verify epoch_id derivation: hash(subject_id || time_window_id)
    const epochId = deriveEpochId(subjectId, timeWindowId)

    // Same inputs always produce the same epoch_id (deterministic)
    expect(deriveEpochId(subjectId, timeWindowId)).toBe(epochId)

    // Different subject produces different epoch_id
    expect(deriveEpochId('other-subject', timeWindowId)).not.toBe(epochId)

    // Different window produces different epoch_id
    expect(deriveEpochId(subjectId, '2026-W10')).not.toBe(epochId)
  })

  it('T-933: epoch_id not accepted as top-level client field — ignored or rejected if present', () => {
    // Per 09-event-and-api-spec.md: "epoch_id is not a top-level client field."
    // If the client includes epoch_id at the top level, the server ignores it
    // and uses its own derived value.
    const timeWindowId = '2026-W09'
    const submission = makeSubmission({
      seed: 't933',
      proof_bundle: { time_window_id: timeWindowId },
    })
    // Client tries to inject a top-level epoch_id
    const submissionWithEpoch = submission as unknown as Record<string, unknown>
    submissionWithEpoch.epoch_id = 'attacker-chosen-epoch'

    const policyContext: EpochPolicyContext = { time_window_id: timeWindowId }

    // Server ignores the client's epoch_id and derives its own
    const result = validateEpochContext(submission, policyContext)

    // Should still pass because server derives epoch from policy context, not client input
    expect(result.ok).toBe(true)
  })
})
