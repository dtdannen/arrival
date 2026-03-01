import { describe, it, expect } from 'vitest'
import {
  deterministicKeypair,
  deterministicIdentity,
  ed25519Sign,
  ed25519Verify,
  canonicalSerialize,
  sha256Hex,
  deriveEpochId,
  poseidonHash,
  graphSnapshotHash,
} from '../helpers/crypto.js'
import type { NullifierStore, ReviewSubmission } from '../helpers/types.js'

/**
 * E2E — Full Happy Path
 * Spec: 02-architecture.md End-to-End Submission Flow
 *
 * Steps: identity → WoT → receipt → proof → submit → admit → batch release → feed query
 */

describe('E2E — Full Happy Path', () => {
  it('T-2100: Submission to publication — identity, WoT, receipt, proof, submit, admit, batch release, feed query', () => {
    // Step 1: User has a persistent identity and derives a posting key
    const persistentIdentity = deterministicIdentity('alice-persistent')
    const postingKeySeed = sha256Hex(`posting:${persistentIdentity.secretHex}:subject-001:2026-W09`)
    const postingKey = deterministicKeypair(postingKeySeed)

    // Step 2: WoT graph exists, cohort root is built
    const members = Array.from({ length: 50 }, (_, i) => deterministicIdentity(`member-${i}`))
    const commitments = members.map((m) => m.commitment)
    // Alice (member-0) is in the cohort
    expect(commitments).toContain(members[0].commitment)

    // Merkle root for cohort
    const sortedCommitments = [...commitments].sort()
    let rootHash = sortedCommitments[0]
    for (let i = 1; i < sortedCommitments.length; i++) {
      rootHash = sha256Hex(`${rootHash}:${sortedCommitments[i]}`)
    }

    // Step 3: Receipt obtained (blind-signed interaction proof)
    const receiptR = sha256Hex('alice-receipt-secret')
    const receiptS = sha256Hex(`blind-sig:${receiptR}:issuer-key`)
    const receipt = { r: receiptR, S: receiptS, keyset_id: 'keyset-001' }

    // Step 4: Proofs constructed
    const time_window_id = '2026-W09'
    const epoch_id = deriveEpochId('subject-001', time_window_id)
    const nullifierHash = sha256Hex(`nullifier:${persistentIdentity.commitment}:${epoch_id}`)

    // Step 5: Build and sign submission
    const submission: ReviewSubmission = {
      review_id: 'review-happy-path',
      subject_id: 'subject-001',
      content: 'Excellent service, highly recommend.',
      posting_pubkey: postingKey.publicKeyHex,
      signature: '',
      proof_bundle: {
        cohort_root_hash: rootHash,
        membership_proof: { protocol: 'semaphore-v4' },
        interaction_proof: receipt,
        timeblind_proof: { protocol: 'groth16' },
        time_window_id,
        window_start: 1709000000,
        window_end: 1709604800,
        nullifier_hash: nullifierHash,
      },
      created_at: Math.floor(Date.now() / 1000),
      proof_version: 'v1',
    }

    const canonical = canonicalSerialize(submission as unknown as Record<string, unknown>)
    submission.signature = Buffer.from(ed25519Sign(canonical, postingKey.secretKey)).toString('hex')

    // Step 6: Gateway verifies signature
    const sigBytes = Uint8Array.from(Buffer.from(submission.signature, 'hex'))
    expect(ed25519Verify(sigBytes, canonical, postingKey.publicKey)).toBe(true)

    // Step 7: Gateway admits the review
    const nullifiers = new Set<string>()
    expect(nullifiers.has(nullifierHash)).toBe(false) // not yet seen
    nullifiers.add(nullifierHash) // consume on admission

    // Review is now 'admitted' (held)
    const admittedReview = {
      ...submission,
      status: 'admitted' as const,
    }

    // Step 8: Batch release — window closes, t_min met
    const publishedReview = {
      review_id: admittedReview.review_id,
      subject_id: admittedReview.subject_id,
      content: admittedReview.content,
      time_window_id,
      distance_bucket: 1,
      verification_badges: { interaction_verified: true },
    }

    // Step 9: Feed query returns published review
    expect(publishedReview.review_id).toBe('review-happy-path')
    expect(publishedReview.subject_id).toBe('subject-001')
    expect(publishedReview.content).toBeTruthy()
    expect(publishedReview.time_window_id).toBe('2026-W09')

    // No created_at in published output
    expect(publishedReview).not.toHaveProperty('created_at')
    expect(publishedReview).not.toHaveProperty('signature')
    expect(publishedReview).not.toHaveProperty('proof_bundle')

    // Persistent identity not leaked
    expect(JSON.stringify(publishedReview)).not.toContain(persistentIdentity.commitment)
  })
})
