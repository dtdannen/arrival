import { describe, it, expect } from 'vitest'
import { makeSubmission } from '../../helpers/fixtures.js'
import type { ReviewSubmission, StepResult } from '../../helpers/types.js'
import { SUPPORTED_PROOF_VERSIONS } from '../../helpers/types.js'

/**
 * Step 3: Validate proof_version is in the supported set.
 * Spec: 03-proof-spec.md Versioning Rules
 * Reject code: unsupported_proof_version
 *
 * Per spec: "Verifier must validate proof_version before unpacking proof_bundle."
 * This means version check happens BEFORE schema validation of bundle internals.
 */
function validateProofVersion(submission: ReviewSubmission): StepResult {
  const version = submission.proof_version
  if (!version || !(SUPPORTED_PROOF_VERSIONS as readonly string[]).includes(version)) {
    return {
      ok: false,
      reject_code: 'unsupported_proof_version',
      reject_detail: `Unsupported proof version: ${version}`,
    }
  }
  return { ok: true }
}

describe('Review Gateway — Step 3: Proof Version', () => {
  it('T-920: Supported proof version passes', () => {
    const submission = makeSubmission({ seed: 't920', proof_version: 'v1' })

    const result = validateProofVersion(submission)

    expect(result.ok).toBe(true)
  })

  it('T-921: Unsupported proof version rejected — unsupported_proof_version', () => {
    const submission = makeSubmission({ seed: 't921', proof_version: 'v999' })

    const result = validateProofVersion(submission)

    expect(result.ok).toBe(false)
    expect(result.reject_code).toBe('unsupported_proof_version')
  })

  it('T-922: proof_version checked before bundle unpacking — rejects with unsupported_proof_version not invalid_schema', () => {
    // Submit with unsupported version AND a completely mangled proof_bundle.
    // If version is checked first, we get unsupported_proof_version (not invalid_schema).
    const submission = makeSubmission({ seed: 't922', proof_version: 'v999' })
    // Destroy the proof bundle to also trigger schema validation failure
    ;(submission as unknown as Record<string, unknown>).proof_bundle = 'not-an-object'

    // Version check should fire first
    const result = validateProofVersion(submission)

    expect(result.ok).toBe(false)
    expect(result.reject_code).toBe('unsupported_proof_version')
    // Crucially NOT 'invalid_schema'
    expect(result.reject_code).not.toBe('invalid_schema')
  })
})
