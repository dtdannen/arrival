/**
 * Privacy-Safe Logger — Structured logging for the admission pipeline.
 *
 * Spec: 06-trust-model-and-risk-mitigation.md (Mitigation Control #7)
 *       10-test-plan.md (Privacy-Protection Tests)
 *
 * Safe to log: review_id, subject_id, posting_pubkey (one-time), proof_version, status, reject_code
 * NEVER logged: identity_secret, merkle_path, receipt_secret, interaction_timestamp,
 *               secret_key, private_key, persistent nostr_pubkey, identity commitment
 *
 * The posting_pubkey is an ephemeral one-time key derived per-review and is
 * unlinkable to the reviewer's persistent identity. It is safe to log.
 */

// ── Types ────────────────────────────────────────────────────────────

export interface LogEntry {
  level: string
  event: string
  fields: Record<string, unknown>
}

export interface AdmissionLogData {
  review_id: string
  subject_id: string
  posting_pubkey: string
  proof_version: string
  status: string
  reject_code: string | null
}

// ── Forbidden patterns ──────────────────────────────────────────────

/**
 * Field names that must NEVER appear in any log entry.
 * These contain witness material or stable user identifiers.
 */
export const FORBIDDEN_WITNESS_PATTERNS = [
  'identity_secret',
  'merkle_path',
  'receipt_secret',
  'interaction_timestamp',
  'secret_key',
  'private_key',
] as const

/**
 * Safe fields for admission logging.
 * Per 06-trust-model-and-risk-mitigation.md Mitigation Control #7.
 */
export const SAFE_ADMISSION_FIELDS = [
  'review_id',
  'subject_id',
  'posting_pubkey',
  'proof_version',
  'status',
  'reject_code',
] as const

// ── SafeLogger ──────────────────────────────────────────────────────

/**
 * Structured logger that enforces the privacy-safe logging policy.
 *
 * Only emits allowlisted fields for admission events. Witness material
 * and stable user identifiers are never passed through.
 */
export class SafeLogger {
  public entries: LogEntry[] = []

  log(level: string, event: string, fields: Record<string, unknown>): void {
    this.entries.push({ level, event, fields })
  }

  /**
   * Log an admission pipeline result with only safe fields.
   *
   * Explicitly allowlists: review_id, subject_id, posting_pubkey,
   * proof_version, status, reject_code.
   *
   * Never touches: identity_secret, merkle_path, interaction_proof,
   * proof_bundle, nullifier_hash, receipt data (r, S, keyset_id),
   * persistent nostr pubkey, or identity commitment.
   */
  logAdmission(
    submission: { review_id: string; subject_id: string; posting_pubkey: string; proof_version: string },
    result: { status: string; reject_code?: string | null },
  ): void {
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

// ── Log safety checks ───────────────────────────────────────────────

/**
 * Scan log entries for forbidden witness material patterns.
 * Returns a list of violations found.
 */
export function logEntriesContainAny(entries: LogEntry[], forbidden: string[]): string[] {
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

/**
 * Check whether a specific literal value appears anywhere in log entries.
 */
export function logEntriesContainValue(entries: LogEntry[], value: string): boolean {
  const serialized = JSON.stringify(entries)
  return serialized.includes(value)
}
