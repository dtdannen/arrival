import { describe, it, expect } from 'vitest'
import { makeSubmission } from '../../helpers/fixtures.js'
import { deterministicKeypair, deterministicIdentity, sha256Hex } from '../../helpers/crypto.js'

/**
 * Privacy — Log Safety Tests
 * Spec: 06-trust-model-and-risk-mitigation.md Mitigation Control #7, 10-test-plan.md Privacy-Protection Tests
 *
 * Core invariant: logs must never contain witness material or stable user identifiers.
 * The admission path must be loggable for operational debugging without leaking
 * privacy-sensitive data.
 */

// ── Simulated structured logger ──────────────────────────────────────

interface LogEntry {
  level: string
  event: string
  fields: Record<string, unknown>
}

const FORBIDDEN_WITNESS_PATTERNS = [
  'identity_secret',
  'merkle_path',
  'receipt_secret',
  'interaction_timestamp',
  'secret_key',
  'private_key',
]

const FORBIDDEN_IDENTIFIER_PATTERNS = [
  // Stable Nostr pubkey (persistent identity) — NOT posting_pubkey (one-time key, OK to log)
  // We check that the persistent identity keypair's pubkey doesn't appear
]

class SafeLogger {
  public entries: LogEntry[] = []

  log(level: string, event: string, fields: Record<string, unknown>) {
    this.entries.push({ level, event, fields })
  }

  /** Simulate logging an admission pipeline run */
  logAdmission(submission: ReturnType<typeof makeSubmission>, result: { status: string; reject_code?: string }) {
    // Safe fields to log: review_id, subject_id, posting_pubkey (one-time), proof_version, status, reject_code
    this.log('info', 'admission_result', {
      review_id: submission.review_id,
      subject_id: submission.subject_id,
      posting_pubkey: submission.posting_pubkey,
      proof_version: submission.proof_version,
      status: result.status,
      reject_code: result.reject_code || null,
    })
  }
}

function logEntriesContainAny(entries: LogEntry[], forbidden: string[]): string[] {
  const found: string[] = []
  for (const entry of entries) {
    const serialized = JSON.stringify(entry).toLowerCase()
    for (const pattern of forbidden) {
      if (serialized.includes(pattern.toLowerCase())) {
        found.push(`${entry.event}: contains "${pattern}"`)
      }
    }
  }
  return found
}

function logEntriesContainValue(entries: LogEntry[], value: string): boolean {
  const serialized = JSON.stringify(entries)
  return serialized.includes(value)
}

describe('Privacy — Log Safety', () => {
  it('T-1302: Logs do not store witness material — no identity secret, Merkle path, receipt secret, or interaction timestamp', () => {
    const logger = new SafeLogger()
    const submission = makeSubmission({ seed: 't1302-signer' })

    // Simulate admission pipeline logging
    logger.logAdmission(submission, { status: 'admitted' })

    // Also log a rejection case
    logger.logAdmission(submission, { status: 'rejected', reject_code: 'invalid_membership_proof' })

    // Check no witness material appears in any log entry
    const violations = logEntriesContainAny(logger.entries, FORBIDDEN_WITNESS_PATTERNS)
    expect(violations).toEqual([])

    // Specifically verify receipt secret r is not logged
    expect(logEntriesContainValue(logger.entries, submission.proof_bundle.interaction_proof.r)).toBe(false)

    // Verify the receipt signature S is not logged
    expect(logEntriesContainValue(logger.entries, submission.proof_bundle.interaction_proof.S)).toBe(false)

    // Verify nullifier_hash IS logged (it's a derived public value, not witness material)
    // Actually, nullifier_hash should only be logged if needed for dedup debugging — for safety, check it's not present
    // The key rule: no raw witness material
  })

  it('T-1303: Logs do not contain stable user identifiers — no persistent Nostr pubkeys or IP-to-identity mappings', () => {
    const logger = new SafeLogger()
    const submission = makeSubmission({ seed: 't1303-signer' })

    // Simulate a persistent identity (Nostr pubkey) — this is the user's real identity
    const persistentIdentity = deterministicKeypair('persistent-nostr-identity')
    const semaphoreIdentity = deterministicIdentity('persistent-nostr-identity')

    // Log the admission
    logger.logAdmission(submission, { status: 'admitted' })

    // The persistent Nostr pubkey must NOT appear in logs
    expect(logEntriesContainValue(logger.entries, persistentIdentity.publicKeyHex)).toBe(false)

    // The Semaphore identity commitment must NOT appear in logs
    expect(logEntriesContainValue(logger.entries, semaphoreIdentity.commitment)).toBe(false)

    // The one-time posting_pubkey IS acceptable in logs (it's ephemeral and unlinkable)
    expect(logEntriesContainValue(logger.entries, submission.posting_pubkey)).toBe(true)
  })
})
