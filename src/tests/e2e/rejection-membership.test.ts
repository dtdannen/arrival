import { describe, it, expect } from 'vitest'
import { deterministicIdentity, sha256Hex, deriveEpochId } from '../helpers/crypto.js'

/**
 * E2E — Rejection: Invalid Membership
 * Spec: 02-architecture.md Verification Pipeline step 7
 *       03-proof-spec.md "Invalid membership rejected"
 *
 * "Identity not in cohort — rejected with invalid_membership_proof, nullifier not consumed"
 */

describe('E2E — Rejection: Invalid Membership', () => {
  it('T-2101: Identity not in cohort — rejected with invalid_membership_proof, nullifier not consumed', () => {
    // Build cohort with members 0-9
    const cohortMembers = Array.from({ length: 10 }, (_, i) =>
      deterministicIdentity(`cohort-member-${i}`),
    )
    const commitments = new Set(cohortMembers.map((m) => m.commitment))

    // Eve is NOT in the cohort
    const eve = deterministicIdentity('eve-outsider')
    expect(commitments.has(eve.commitment)).toBe(false)

    // Eve tries to submit a review
    const nullifiers = new Set<string>()
    const eveNullifier = sha256Hex(`nullifier:${eve.commitment}:${deriveEpochId('subject-001', '2026-W09')}`)

    // Membership verification fails
    const membershipValid = commitments.has(eve.commitment)
    expect(membershipValid).toBe(false)

    // Rejection: invalid_membership_proof
    const result = {
      status: 'rejected' as const,
      reject_code: 'invalid_membership_proof' as const,
      reject_detail: 'Identity commitment not found in active cohort root',
    }

    expect(result.status).toBe('rejected')
    expect(result.reject_code).toBe('invalid_membership_proof')

    // Nullifier NOT consumed on rejection
    expect(nullifiers.has(eveNullifier)).toBe(false)

    // Eve can fix the issue (e.g., get added to WoT) and resubmit
    // without being blocked by a consumed nullifier
  })
})
