import { describe, it, expect } from 'vitest'
import {
  deterministicKeypair,
  ed25519Sign,
  ed25519Verify,
  canonicalSerialize,
  hexToBytes,
  bytesToHex,
  sha256Hex,
  deriveEpochId,
} from '../../helpers/crypto.js'
import { makeSubmission } from '../../helpers/fixtures.js'
import {
  REJECT_CODES,
  SUPPORTED_PROOF_VERSIONS,
  type ReviewSubmission,
  type StepResult,
  type NullifierStore,
  type RootStore,
  type RootRecord,
  type WindowRegistry,
  type VerificationResult,
  type KeysetRecord,
} from '../../helpers/types.js'

/**
 * Full admission pipeline — composes all 10 verification steps in order.
 * Spec: 02-architecture.md Verification Pipeline, 03-proof-spec.md Admission Policy
 *
 * Steps are ordered cheapest-first. Each step maps to exactly one reject code.
 */

// ── Minimal pipeline context ─────────────────────────────────────────

interface PipelineContext {
  time_window_id: string
  rootStore: RootStore
  k_min: number
  nullifierStore: NullifierStore
  windowRegistry: WindowRegistry
  keysetRegistry: { getKeyset(kid: string, sid: string): KeysetRecord | null }
  spentReceipts: { isSpent(h: string): boolean; markSpent(h: string): void }
}

// ── Pipeline function ────────────────────────────────────────────────

function admitSubmission(
  submission: ReviewSubmission,
  ctx: PipelineContext,
): VerificationResult {
  const flags = {
    membership_verified: false,
    interaction_verified: false,
    timeblind_verified: false,
    nullifier_unique: false,
    k_threshold_met: false,
  }

  function reject(code: StepResult['reject_code'], detail: string): VerificationResult {
    return {
      status: 'rejected',
      reject_code: code!,
      reject_detail: detail,
      held_reason: null,
      verified_flags: flags,
    }
  }

  // Step 1: Signature verification
  try {
    const pubkey = hexToBytes(submission.posting_pubkey)
    const sig = hexToBytes(submission.signature)
    const canonical = canonicalSerialize(submission as unknown as Record<string, unknown>)
    if (!ed25519Verify(sig, canonical, pubkey)) {
      return reject('invalid_signature', 'Ed25519 signature verification failed')
    }
  } catch {
    return reject('invalid_signature', 'Signature verification error')
  }

  // Step 2: Schema validation
  const requiredFields = ['review_id', 'subject_id', 'content', 'posting_pubkey', 'signature', 'proof_bundle', 'proof_version']
  for (const f of requiredFields) {
    if (!(f in (submission as unknown as Record<string, unknown>))) {
      return reject('invalid_schema', `Missing field: ${f}`)
    }
  }
  if (typeof submission.proof_bundle !== 'object' || submission.proof_bundle === null) {
    return reject('invalid_schema', 'proof_bundle must be an object')
  }

  // Step 3: Proof version
  if (!(SUPPORTED_PROOF_VERSIONS as readonly string[]).includes(submission.proof_version)) {
    return reject('unsupported_proof_version', `Unsupported: ${submission.proof_version}`)
  }

  // Step 4: Epoch context
  const authEpochId = deriveEpochId(submission.subject_id, ctx.time_window_id)
  const clientEpochId = deriveEpochId(submission.subject_id, submission.proof_bundle.time_window_id)
  if (clientEpochId !== authEpochId) {
    return reject('invalid_epoch_context', 'Epoch mismatch')
  }

  // Step 5: Root verification
  const root = ctx.rootStore.getActive(submission.subject_id, submission.proof_bundle.cohort_root_hash)
  if (!root) {
    return reject('inactive_root', 'No active root found')
  }

  // Step 6: k_min threshold
  if (root.k_size < ctx.k_min) {
    return reject('insufficient_anonymity_set', `k_size ${root.k_size} < k_min ${ctx.k_min}`)
  }
  flags.k_threshold_met = true

  // Step 7: Membership proof (mock: check proof is non-null object with protocol)
  const mp = submission.proof_bundle.membership_proof
  if (!mp || typeof mp !== 'object' || !(mp as Record<string, unknown>).protocol) {
    return reject('invalid_membership_proof', 'Invalid membership proof')
  }
  flags.membership_verified = true

  // Step 8: Interaction proof (mock: check keyset exists and receipt not spent)
  const ip = submission.proof_bundle.interaction_proof
  const keyset = ctx.keysetRegistry.getKeyset(ip.keyset_id, submission.subject_id)
  if (!keyset) {
    return reject('invalid_interaction_proof', 'Unknown keyset')
  }
  const receiptHash = sha256Hex(ip.r)
  if (ctx.spentReceipts.isSpent(receiptHash)) {
    return reject('invalid_interaction_proof', 'Receipt already spent')
  }
  flags.interaction_verified = true

  // Step 9: Timeblind proof
  const bounds = ctx.windowRegistry.getBounds(submission.proof_bundle.time_window_id)
  if (!bounds) {
    return reject('invalid_timeblind_proof', 'Unknown window')
  }
  if (
    submission.proof_bundle.window_start !== bounds.window_start ||
    submission.proof_bundle.window_end !== bounds.window_end
  ) {
    return reject('invalid_timeblind_proof', 'Window bounds mismatch')
  }
  const tp = submission.proof_bundle.timeblind_proof
  if (!tp || typeof tp !== 'object') {
    return reject('invalid_timeblind_proof', 'Invalid timeblind proof')
  }
  flags.timeblind_verified = true

  // Step 10: Nullifier uniqueness
  if (ctx.nullifierStore.exists(submission.subject_id, authEpochId, submission.proof_bundle.nullifier_hash)) {
    return reject('duplicate_nullifier', 'Nullifier already used')
  }
  ctx.nullifierStore.store(submission.subject_id, authEpochId, submission.proof_bundle.nullifier_hash)
  ctx.spentReceipts.markSpent(receiptHash)
  flags.nullifier_unique = true

  return {
    status: 'admitted',
    reject_code: null,
    reject_detail: null,
    held_reason: 'window_open',
    verified_flags: flags,
  }
}

// ── Test helpers ─────────────────────────────────────────────────────

function makeContext(overrides?: Partial<PipelineContext>): PipelineContext {
  const timeWindowId = '2026-W09'
  const rootHash = sha256Hex('pipeline-test-root')
  const now = Math.floor(Date.now() / 1000)

  const nullifiers = new Set<string>()
  const spentReceipts = new Set<string>()

  return {
    time_window_id: timeWindowId,
    rootStore: {
      getActive(_sid: string, rh: string): RootRecord | null {
        if (rh === rootHash) {
          return {
            root_id: 'root-1', subject_id: 'subject-001', root_hash: rootHash,
            k_size: 100, distance_bucket: 1, graph_snapshot_hash: sha256Hex('g'),
            valid_from: now - 86400, valid_to: now + 86400,
          }
        }
        return null
      },
    },
    k_min: 50,
    nullifierStore: {
      exists(_s, _e, nh) { return nullifiers.has(`${_s}:${_e}:${nh}`) },
      store(_s, _e, nh) { nullifiers.add(`${_s}:${_e}:${nh}`) },
    },
    windowRegistry: {
      getBounds(id: string) {
        if (id === timeWindowId) {
          return { window_start: now - 604800, window_end: now }
        }
        return null
      },
    },
    keysetRegistry: {
      getKeyset(kid: string, _sid: string) {
        if (kid === 'keyset-001') {
          return {
            keyset_id: 'keyset-001', subject_id: 'subject-001',
            keyset_start: now - 86400, keyset_end: now,
            public_key: 'mock-pk', issuer_id: 'issuer-001',
          }
        }
        return null
      },
    },
    spentReceipts: {
      isSpent(h: string) { return spentReceipts.has(h) },
      markSpent(h: string) { spentReceipts.add(h) },
    },
    ...overrides,
  }
}

function makeValidSubmission(seed: string, ctx: PipelineContext): ReviewSubmission {
  const now = Math.floor(Date.now() / 1000)
  const rootHash = sha256Hex('pipeline-test-root')
  return makeSubmission({
    seed,
    subject_id: 'subject-001',
    proof_bundle: {
      cohort_root_hash: rootHash,
      time_window_id: ctx.time_window_id,
      window_start: now - 604800,
      window_end: now,
    },
  })
}

describe('Review Gateway — Pipeline Order', () => {
  it('T-995: Cheapest checks run first — signature failure before membership failure', () => {
    const ctx = makeContext()
    const submission = makeValidSubmission('t995', ctx)

    // Corrupt the signature so step 1 fails
    const sigBytes = hexToBytes(submission.signature)
    sigBytes[0] ^= 0xff
    submission.signature = bytesToHex(sigBytes)

    // Also make membership proof invalid so step 7 would fail if reached
    submission.proof_bundle.membership_proof = null

    const result = admitSubmission(submission, ctx)

    // Should fail at step 1 (signature), not step 7 (membership)
    expect(result.status).toBe('rejected')
    expect(result.reject_code).toBe('invalid_signature')
  })

  it('T-996: Each step has exactly one reject code — 10 steps, 10 codes, 1:1 mapping', () => {
    // Verify the reject code canon from 09-event-and-api-spec.md
    const expectedCodes = [
      'invalid_signature',           // Step 1
      'invalid_schema',              // Step 2
      'unsupported_proof_version',   // Step 3
      'invalid_epoch_context',       // Step 4
      'inactive_root',               // Step 5
      'insufficient_anonymity_set',  // Step 6
      'invalid_membership_proof',    // Step 7
      'invalid_interaction_proof',   // Step 8
      'invalid_timeblind_proof',     // Step 9
      'duplicate_nullifier',         // Step 10
    ]

    // Exactly 10 codes
    expect(REJECT_CODES).toHaveLength(10)

    // They match the expected order
    expect([...REJECT_CODES]).toEqual(expectedCodes)

    // No duplicates
    const unique = new Set(REJECT_CODES)
    expect(unique.size).toBe(10)
  })

  it('T-997: Rejected submission does not consume nullifier — corrected resubmit accepted', () => {
    const ctx = makeContext()

    // First attempt: invalid signature (step 1 fails)
    const badSubmission = makeValidSubmission('t997', ctx)
    const sigBytes = hexToBytes(badSubmission.signature)
    sigBytes[0] ^= 0xff
    badSubmission.signature = bytesToHex(sigBytes)

    const firstResult = admitSubmission(badSubmission, ctx)
    expect(firstResult.status).toBe('rejected')
    expect(firstResult.reject_code).toBe('invalid_signature')

    // The nullifier should NOT have been consumed
    const epochId = deriveEpochId('subject-001', ctx.time_window_id)
    expect(
      ctx.nullifierStore.exists('subject-001', epochId, badSubmission.proof_bundle.nullifier_hash),
    ).toBe(false)

    // Second attempt: correctly signed with the same nullifier
    const goodSubmission = makeValidSubmission('t997', ctx)

    const secondResult = admitSubmission(goodSubmission, ctx)
    expect(secondResult.status).toBe('admitted')
    expect(secondResult.verified_flags.nullifier_unique).toBe(true)
  })
})
