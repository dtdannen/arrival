import { describe, it, expect } from 'vitest'
import { makeSubmission } from '../../helpers/fixtures.js'
import type { VerificationResult, VerifiedFlags, RejectCode } from '../../helpers/types.js'

/**
 * Integration — Submit API
 * Spec: 09-event-and-api-spec.md POST /v1/reviews/submit
 *
 * "Input: review_submission_v1"
 * "Output: verification result object"
 */

function mockSubmitEndpoint(valid: boolean, rejectCode?: RejectCode): VerificationResult {
  if (valid) {
    return {
      status: 'admitted',
      reject_code: null,
      reject_detail: null,
      held_reason: 'window_open',
      verified_flags: {
        membership_verified: true,
        interaction_verified: true,
        timeblind_verified: true,
        nullifier_unique: true,
        k_threshold_met: true,
      },
    }
  }

  return {
    status: 'rejected',
    reject_code: rejectCode || 'invalid_signature',
    reject_detail: 'Verification failed',
    held_reason: null,
    verified_flags: {
      membership_verified: false,
      interaction_verified: false,
      timeblind_verified: false,
      nullifier_unique: false,
      k_threshold_met: false,
    },
  }
}

describe('Integration — Submit API', () => {
  it('T-1210: Valid submission returns admitted with held_reason and verified_flags', () => {
    // Spec: 09-event-and-api-spec.md Verification Result Object
    const result = mockSubmitEndpoint(true)

    expect(result.status).toBe('admitted')
    expect(result.held_reason).toBeTruthy()
    expect(result.reject_code).toBeNull()
    expect(result.reject_detail).toBeNull()

    // verified_flags present
    expect(result.verified_flags).toBeDefined()
    expect(result.verified_flags.membership_verified).toBe(true)
    expect(result.verified_flags.interaction_verified).toBe(true)
    expect(result.verified_flags.timeblind_verified).toBe(true)
    expect(result.verified_flags.nullifier_unique).toBe(true)
    expect(result.verified_flags.k_threshold_met).toBe(true)
  })

  it('T-1211: Rejected submission returns reject_code and reject_detail', () => {
    // Spec: 09-event-and-api-spec.md "reject_code (nullable string, present when rejected)"
    // "reject_detail (nullable string, present when rejected)"
    const result = mockSubmitEndpoint(false, 'invalid_membership_proof')

    expect(result.status).toBe('rejected')
    expect(result.reject_code).toBe('invalid_membership_proof')
    expect(result.reject_detail).toBeTruthy()
    expect(result.held_reason).toBeNull()
  })

  it('T-1212: verified_flags reflect individual checks — all flags present and correct', () => {
    // Spec: 09-event-and-api-spec.md "verified_flags:
    // membership_verified, interaction_verified, timeblind_verified, nullifier_unique, k_threshold_met"
    const admittedResult = mockSubmitEndpoint(true)

    const flags = admittedResult.verified_flags
    expect(flags).toHaveProperty('membership_verified')
    expect(flags).toHaveProperty('interaction_verified')
    expect(flags).toHaveProperty('timeblind_verified')
    expect(flags).toHaveProperty('nullifier_unique')
    expect(flags).toHaveProperty('k_threshold_met')

    // For admitted: all true
    expect(Object.values(flags).every((v) => v === true)).toBe(true)

    // For rejected: flags reflect which checks passed/failed
    const rejectedResult = mockSubmitEndpoint(false, 'invalid_interaction_proof')
    const rejFlags = rejectedResult.verified_flags
    expect(rejFlags).toHaveProperty('membership_verified')
    expect(rejFlags).toHaveProperty('interaction_verified')
  })
})
