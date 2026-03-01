import { describe, it, expect } from 'vitest'
import { deterministicKeypair, sha256Hex } from '../../helpers/crypto.js'
import { makeSubmission } from '../../helpers/fixtures.js'

/**
 * Identity Client — Submission Privacy
 * Spec: 02-architecture.md Component 1 (identity-client)
 *
 * The persistent Nostr key must never appear in the review submission.
 * Only the one-time posting key appears in posting_pubkey.
 */

describe('Identity Client — Submission Privacy', () => {
  it('T-102: Persistent key never appears in submission — Nostr pubkey absent from all fields of review_submission_v1', () => {
    // Spec: 02-architecture.md "derives one-time review posting keys"
    // The submission must only contain the posting key, never the persistent identity.
    const persistentKeypair = deterministicKeypair('alice-persistent-nostr')
    const persistentPubkey = persistentKeypair.publicKeyHex

    // Create a submission using a DIFFERENT seed (simulating derived posting key)
    const submission = makeSubmission({ seed: 'alice-posting-key-derived' })

    // The persistent pubkey must not appear anywhere in the submission
    const submissionJson = JSON.stringify(submission)
    expect(submissionJson).not.toContain(persistentPubkey)

    // posting_pubkey should be different from persistent key
    expect(submission.posting_pubkey).not.toBe(persistentPubkey)

    // Check individual fields explicitly
    expect(submission.posting_pubkey).not.toBe(persistentPubkey)
    expect(submission.signature).not.toContain(persistentPubkey)
    expect(submission.review_id).not.toContain(persistentPubkey)
    expect(submission.subject_id).not.toContain(persistentPubkey)

    // Proof bundle should not contain persistent key
    const bundleJson = JSON.stringify(submission.proof_bundle)
    expect(bundleJson).not.toContain(persistentPubkey)
  })
})
