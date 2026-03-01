import { describe, it, expect } from 'vitest'
import { makeSubmission } from '../../helpers/fixtures.js'
import type { StepResult } from '../../helpers/types.js'

/**
 * Step 2: Validate proof bundle schema — all required fields present.
 * Spec: 09-event-and-api-spec.md Body and proof_bundle fields
 * Reject code: invalid_schema
 */

const REQUIRED_SUBMISSION_FIELDS = [
  'review_id', 'subject_id', 'content', 'posting_pubkey',
  'signature', 'proof_bundle', 'proof_version',
] as const

const REQUIRED_BUNDLE_FIELDS = [
  'cohort_root_hash', 'membership_proof', 'interaction_proof',
  'timeblind_proof', 'time_window_id', 'window_start',
  'window_end', 'nullifier_hash',
] as const

function validateSchema(submission: Record<string, unknown>): StepResult {
  for (const field of REQUIRED_SUBMISSION_FIELDS) {
    if (!(field in submission) || submission[field] === undefined || submission[field] === null) {
      return {
        ok: false,
        reject_code: 'invalid_schema',
        reject_detail: `Missing required field: ${field}`,
      }
    }
  }

  const bundle = submission.proof_bundle
  if (typeof bundle !== 'object' || bundle === null) {
    return {
      ok: false,
      reject_code: 'invalid_schema',
      reject_detail: 'proof_bundle must be an object',
    }
  }

  // Per 09-event-and-api-spec.md: proof_bundle must not contain proof_version
  if ('proof_version' in (bundle as Record<string, unknown>)) {
    return {
      ok: false,
      reject_code: 'invalid_schema',
      reject_detail: 'proof_bundle must not contain proof_version (top-level field only)',
    }
  }

  for (const field of REQUIRED_BUNDLE_FIELDS) {
    if (!(field in (bundle as Record<string, unknown>))) {
      return {
        ok: false,
        reject_code: 'invalid_schema',
        reject_detail: `Missing required proof_bundle field: ${field}`,
      }
    }
  }

  return { ok: true }
}

describe('Review Gateway — Step 2: Schema Validation', () => {
  it('T-910: Valid schema passes', () => {
    const submission = makeSubmission({ seed: 't910' })

    const result = validateSchema(submission as unknown as Record<string, unknown>)

    expect(result.ok).toBe(true)
  })

  it('T-911: Missing required field rejected — invalid_schema', () => {
    const submission = makeSubmission({ seed: 't911' }) as unknown as Record<string, unknown>
    delete submission.proof_bundle

    const result = validateSchema(submission)

    expect(result.ok).toBe(false)
    expect(result.reject_code).toBe('invalid_schema')
    expect(result.reject_detail).toContain('proof_bundle')
  })

  it('T-912: Extra unexpected fields tolerated', () => {
    // Spec does not mandate rejecting extra fields. Lenient policy: tolerate them.
    const submission = makeSubmission({ seed: 't912' }) as unknown as Record<string, unknown>
    submission.extra_field = 'unexpected'

    const result = validateSchema(submission)

    expect(result.ok).toBe(true)
  })

  it('T-913: proof_bundle must not contain proof_version — rejected if present', () => {
    // Per 09-event-and-api-spec.md: "proof_bundle must not contain proof_version;
    // version selection is done at the top-level request schema."
    const submission = makeSubmission({ seed: 't913' })
    const bundle = submission.proof_bundle as unknown as Record<string, unknown>
    bundle.proof_version = 'v1'

    const result = validateSchema(submission as unknown as Record<string, unknown>)

    expect(result.ok).toBe(false)
    expect(result.reject_code).toBe('invalid_schema')
    expect(result.reject_detail).toContain('proof_version')
  })
})
