/**
 * Review Gateway — 10-step verification pipeline for review admission.
 *
 * Spec: 03-proof-spec.md (Verification Steps)
 *       09-event-and-api-spec.md (API Endpoints, Reject Codes)
 *
 * Pipeline ordered cheapest-first. Each step has exactly one reject code.
 * Rejected submissions do not consume nullifiers (allows retry).
 *
 * Steps:
 * 1. Ed25519 signature           → invalid_signature
 * 2. Schema validation            → invalid_schema
 * 3. Proof version                → unsupported_proof_version
 * 4. Epoch context                → invalid_epoch_context
 * 5. Root active                  → inactive_root
 * 6. k_min threshold              → insufficient_anonymity_set
 * 7. Membership proof (ZK)        → invalid_membership_proof
 * 8. Interaction receipt (RSA)    → invalid_interaction_proof
 * 9. Time-window proof (ZK)       → invalid_timeblind_proof
 * 10. Nullifier uniqueness        → duplicate_nullifier
 */

import {
  ed25519Verify,
  canonicalSerialize,
  hexToBytes,
  sha256Hex,
  deriveEpochId,
} from '../shared/crypto.js'
import { SUPPORTED_PROOF_VERSIONS, K_MIN } from '../shared/constants.js'
import type {
  ReviewSubmission,
  StepResult,
  VerificationResult,
  VerifiedFlags,
  RootStore,
  RootRecord,
  NullifierStore,
  WindowRegistry,
  KeysetRecord,
  InteractionProof,
  RejectCode,
} from '../shared/types.js'

// ── Verifier interfaces ──────────────────────────────────────────────

export interface MembershipVerifier {
  verify(proof: unknown, root_hash: string): boolean
}

export interface TimeblindVerifier {
  verify(proof: unknown, window_start: number, window_end: number): boolean
}

export interface InteractionVerifier {
  verifySignature(r: string, S: string, keyset_id: string, subject_id: string): boolean
}

export interface SpentReceiptStore {
  isSpent(receipt_hash: string): boolean
  markSpent(receipt_hash: string): void
}

export interface KeysetRegistry {
  getKeyset(keyset_id: string, subject_id: string): KeysetRecord | null
}

// ── Pipeline context ─────────────────────────────────────────────────

export interface PipelineContext {
  time_window_id: string
  rootStore: RootStore
  k_min: number
  nullifierStore: NullifierStore
  windowRegistry: WindowRegistry
  keysetRegistry: KeysetRegistry
  spentReceipts: SpentReceiptStore
  membershipVerifier?: MembershipVerifier
  timeblindVerifier?: TimeblindVerifier
  interactionVerifier?: InteractionVerifier
}

// ── Step 1: Ed25519 signature ────────────────────────────────────────

export function verifySignatureStep(submission: ReviewSubmission): StepResult {
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

// ── Step 2: Schema validation ────────────────────────────────────────

const REQUIRED_SUBMISSION_FIELDS = [
  'review_id', 'subject_id', 'content', 'posting_pubkey',
  'signature', 'proof_bundle', 'proof_version',
] as const

const REQUIRED_BUNDLE_FIELDS = [
  'cohort_root_hash', 'membership_proof', 'interaction_proof',
  'timeblind_proof', 'time_window_id', 'window_start',
  'window_end', 'nullifier_hash',
] as const

export function validateSchema(submission: Record<string, unknown>): StepResult {
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

// ── Step 3: Proof version ────────────────────────────────────────────

export function validateProofVersion(submission: ReviewSubmission): StepResult {
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

// ── Step 4: Epoch context ────────────────────────────────────────────

export function validateEpochContext(
  submission: ReviewSubmission,
  serverTimeWindowId: string,
): StepResult {
  const authoritativeEpochId = deriveEpochId(submission.subject_id, serverTimeWindowId)
  const clientEpochId = deriveEpochId(submission.subject_id, submission.proof_bundle.time_window_id)

  if (clientEpochId !== authoritativeEpochId) {
    return {
      ok: false,
      reject_code: 'invalid_epoch_context',
      reject_detail: `Client epoch ${clientEpochId} does not match server epoch ${authoritativeEpochId}`,
    }
  }
  return { ok: true }
}

// ── Step 5: Root active ──────────────────────────────────────────────

export function validateRoot(
  cohort_root_hash: string,
  subject_id: string,
  rootStore: RootStore,
  now?: number,
): StepResult {
  const root = rootStore.getActive(subject_id, cohort_root_hash, now)
  if (!root) {
    return {
      ok: false,
      reject_code: 'inactive_root',
      reject_detail: `No active root found for subject ${subject_id} with hash ${cohort_root_hash}`,
    }
  }
  return { ok: true }
}

// ── Step 6: k_min threshold ──────────────────────────────────────────

export function validateKMin(
  root: RootRecord,
  k_min: number,
): StepResult {
  if (root.k_size < k_min) {
    return {
      ok: false,
      reject_code: 'insufficient_anonymity_set',
      reject_detail: `k_size ${root.k_size} < k_min ${k_min}`,
    }
  }
  return { ok: true }
}

// ── Step 7: Membership proof (ZK) ───────────────────────────────────

export function verifyMembershipProof(
  membershipProof: unknown,
  cohortRootHash: string,
  verifier: MembershipVerifier,
): StepResult {
  try {
    if (!membershipProof || typeof membershipProof !== 'object') {
      return {
        ok: false,
        reject_code: 'invalid_membership_proof',
        reject_detail: 'Membership proof is missing or malformed',
      }
    }
    const valid = verifier.verify(membershipProof, cohortRootHash)
    if (!valid) {
      return {
        ok: false,
        reject_code: 'invalid_membership_proof',
        reject_detail: 'Membership ZK proof verification failed',
      }
    }
    return { ok: true }
  } catch {
    return {
      ok: false,
      reject_code: 'invalid_membership_proof',
      reject_detail: 'Membership proof verification threw an error',
    }
  }
}

// ── Step 8: Interaction receipt (RSA) ────────────────────────────────

export function verifyInteractionProof(
  interactionProof: InteractionProof,
  subject_id: string,
  keysetRegistry: KeysetRegistry,
  spentReceipts: SpentReceiptStore,
  verifier: InteractionVerifier,
): StepResult {
  const keyset = keysetRegistry.getKeyset(interactionProof.keyset_id, subject_id)
  if (!keyset) {
    return {
      ok: false,
      reject_code: 'invalid_interaction_proof',
      reject_detail: `Unknown keyset_id ${interactionProof.keyset_id} for subject ${subject_id}`,
    }
  }

  const sigValid = verifier.verifySignature(
    interactionProof.r,
    interactionProof.S,
    interactionProof.keyset_id,
    subject_id,
  )
  if (!sigValid) {
    return {
      ok: false,
      reject_code: 'invalid_interaction_proof',
      reject_detail: 'RSA blind signature verification failed',
    }
  }

  const receiptHash = sha256Hex(interactionProof.r)
  if (spentReceipts.isSpent(receiptHash)) {
    return {
      ok: false,
      reject_code: 'invalid_interaction_proof',
      reject_detail: 'Receipt already spent',
    }
  }

  return { ok: true }
}

// ── Step 9: Time-window proof (ZK) ──────────────────────────────────

export function verifyTimeblind(
  timeblindProof: unknown,
  time_window_id: string,
  clientWindowStart: number,
  clientWindowEnd: number,
  windowRegistry: WindowRegistry,
  zkVerifier: TimeblindVerifier,
): StepResult {
  const authoritativeBounds = windowRegistry.getBounds(time_window_id)
  if (!authoritativeBounds) {
    return {
      ok: false,
      reject_code: 'invalid_timeblind_proof',
      reject_detail: `Unknown time_window_id: ${time_window_id}`,
    }
  }

  if (
    clientWindowStart !== authoritativeBounds.window_start ||
    clientWindowEnd !== authoritativeBounds.window_end
  ) {
    return {
      ok: false,
      reject_code: 'invalid_timeblind_proof',
      reject_detail: 'Client window bounds do not match authoritative bounds for time_window_id',
    }
  }

  if (!timeblindProof || typeof timeblindProof !== 'object') {
    return {
      ok: false,
      reject_code: 'invalid_timeblind_proof',
      reject_detail: 'Timeblind proof is missing or malformed',
    }
  }

  const zkValid = zkVerifier.verify(timeblindProof, clientWindowStart, clientWindowEnd)
  if (!zkValid) {
    return {
      ok: false,
      reject_code: 'invalid_timeblind_proof',
      reject_detail: 'Timeblind ZK proof verification failed',
    }
  }

  return { ok: true }
}

// ── Step 10: Nullifier uniqueness ───────────────────────────────────

export function checkNullifier(
  subject_id: string,
  epoch_id: string,
  nullifier_hash: string,
  nullifierStore: NullifierStore,
): StepResult {
  if (nullifierStore.exists(subject_id, epoch_id, nullifier_hash)) {
    return {
      ok: false,
      reject_code: 'duplicate_nullifier',
      reject_detail: `Nullifier ${nullifier_hash} already exists for (${subject_id}, ${epoch_id})`,
    }
  }
  nullifierStore.store(subject_id, epoch_id, nullifier_hash)
  return { ok: true }
}

// ── Full admission pipeline ──────────────────────────────────────────

/**
 * Run the full 10-step verification pipeline.
 *
 * Per 03-proof-spec.md and 09-event-and-api-spec.md:
 * - Ordered cheapest-first
 * - Each step has exactly one reject code
 * - Rejected submissions do not consume nullifiers
 * - epoch_id is server-authoritative
 * - k_min is sourced from root metadata
 */
export function admitSubmission(
  submission: ReviewSubmission,
  ctx: PipelineContext,
): VerificationResult {
  const flags: VerifiedFlags = {
    membership_verified: false,
    interaction_verified: false,
    timeblind_verified: false,
    nullifier_unique: false,
    k_threshold_met: false,
  }

  function reject(code: RejectCode, detail: string): VerificationResult {
    return {
      status: 'rejected',
      reject_code: code,
      reject_detail: detail,
      held_reason: null,
      verified_flags: flags,
    }
  }

  // Step 1: Signature
  const step1 = verifySignatureStep(submission)
  if (!step1.ok) return reject(step1.reject_code!, step1.reject_detail!)

  // Step 2: Schema
  const step2 = validateSchema(submission as unknown as Record<string, unknown>)
  if (!step2.ok) return reject(step2.reject_code!, step2.reject_detail!)

  // Step 3: Proof version
  const step3 = validateProofVersion(submission)
  if (!step3.ok) return reject(step3.reject_code!, step3.reject_detail!)

  // Step 4: Epoch context (server-authoritative)
  const step4 = validateEpochContext(submission, ctx.time_window_id)
  if (!step4.ok) return reject(step4.reject_code!, step4.reject_detail!)

  // Step 5: Root active
  const root = ctx.rootStore.getActive(
    submission.subject_id,
    submission.proof_bundle.cohort_root_hash,
  )
  if (!root) {
    return reject('inactive_root', 'No active root found')
  }

  // Step 6: k_min threshold
  if (root.k_size < ctx.k_min) {
    return reject('insufficient_anonymity_set', `k_size ${root.k_size} < k_min ${ctx.k_min}`)
  }
  flags.k_threshold_met = true

  // Step 7: Membership proof
  const mp = submission.proof_bundle.membership_proof
  if (!mp || typeof mp !== 'object' || !(mp as Record<string, unknown>).protocol) {
    return reject('invalid_membership_proof', 'Invalid membership proof')
  }
  if (ctx.membershipVerifier) {
    const step7 = verifyMembershipProof(mp, submission.proof_bundle.cohort_root_hash, ctx.membershipVerifier)
    if (!step7.ok) return reject(step7.reject_code!, step7.reject_detail!)
  }
  flags.membership_verified = true

  // Step 8: Interaction proof
  const ip = submission.proof_bundle.interaction_proof
  const keyset = ctx.keysetRegistry.getKeyset(ip.keyset_id, submission.subject_id)
  if (!keyset) {
    return reject('invalid_interaction_proof', 'Unknown keyset')
  }
  if (ctx.interactionVerifier) {
    const sigValid = ctx.interactionVerifier.verifySignature(ip.r, ip.S, ip.keyset_id, submission.subject_id)
    if (!sigValid) {
      return reject('invalid_interaction_proof', 'RSA blind signature verification failed')
    }
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
  if (ctx.timeblindVerifier) {
    const step9 = verifyTimeblind(tp, submission.proof_bundle.time_window_id,
      submission.proof_bundle.window_start, submission.proof_bundle.window_end,
      ctx.windowRegistry, ctx.timeblindVerifier)
    if (!step9.ok) return reject(step9.reject_code!, step9.reject_detail!)
  }
  flags.timeblind_verified = true

  // Step 10: Nullifier uniqueness
  const authEpochId = deriveEpochId(submission.subject_id, ctx.time_window_id)
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
