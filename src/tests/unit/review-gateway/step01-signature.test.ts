import { describe, it, expect } from 'vitest'
import {
  deterministicKeypair,
  ed25519Sign,
  ed25519Verify,
  canonicalSerialize,
  bytesToHex,
  hexToBytes,
} from '../../helpers/crypto.js'
import { makeSubmission } from '../../helpers/fixtures.js'
import type { ReviewSubmission, StepResult } from '../../helpers/types.js'

/**
 * Step 1: Verify Ed25519 signature over canonical body serialization.
 * Spec: 03-proof-spec.md admission step 1, 09-event-and-api-spec.md
 * Reject code: invalid_signature
 */
function verifySignature(submission: ReviewSubmission): StepResult {
  try {
    const pubkey = hexToBytes(submission.posting_pubkey)
    const sig = hexToBytes(submission.signature)
    const canonical = canonicalSerialize(submission as unknown as Record<string, unknown>)
    const valid = ed25519Verify(sig, canonical, pubkey)
    if (!valid) {
      return { ok: false, reject_code: 'invalid_signature', reject_detail: 'Ed25519 signature verification failed' }
    }
    return { ok: true }
  } catch {
    return { ok: false, reject_code: 'invalid_signature', reject_detail: 'Signature verification error' }
  }
}

describe('Review Gateway — Step 1: Signature Verification', () => {
  it('T-900: Valid Ed25519 signature passes', () => {
    const submission = makeSubmission({ seed: 't900-signer' })

    const result = verifySignature(submission)

    expect(result.ok).toBe(true)
    expect(result.reject_code).toBeUndefined()
  })

  it('T-901: Invalid signature rejected — invalid_signature', () => {
    const submission = makeSubmission({ seed: 't901-signer' })
    // Corrupt the signature: flip the last byte
    const sigBytes = hexToBytes(submission.signature)
    sigBytes[sigBytes.length - 1] ^= 0xff
    submission.signature = bytesToHex(sigBytes)

    const result = verifySignature(submission)

    expect(result.ok).toBe(false)
    expect(result.reject_code).toBe('invalid_signature')
  })

  it('T-902: Signature over wrong payload rejected — invalid_signature', () => {
    // Sign a different payload, then set it as the signature for the real submission
    const keypair = deterministicKeypair('t902-signer')
    const submission = makeSubmission({ seed: 't902-signer' })

    // Create signature over a completely different message
    const wrongPayload = canonicalSerialize({ content: 'different payload entirely' })
    const wrongSig = ed25519Sign(wrongPayload, keypair.secretKey)
    submission.signature = bytesToHex(wrongSig)

    const result = verifySignature(submission)

    expect(result.ok).toBe(false)
    expect(result.reject_code).toBe('invalid_signature')
  })
})
