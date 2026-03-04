/**
 * Policy defaults and canonical constants for Arrival MVP.
 *
 * Sources:
 *   - 03-proof-spec.md (reject codes, proof versions, domain_tag)
 *   - 09-event-and-api-spec.md (reject code canon)
 *   - 11-time-window-policy.md (k_min, t_min)
 */

// ── Reject Codes (09-event-and-api-spec.md Reject Code Canon) ────────

export const REJECT_CODES = [
  'invalid_signature',
  'invalid_schema',
  'unsupported_proof_version',
  'invalid_epoch_context',
  'inactive_root',
  'insufficient_anonymity_set',
  'invalid_membership_proof',
  'invalid_interaction_proof',
  'invalid_timeblind_proof',
  'duplicate_nullifier',
] as const

export type RejectCode = (typeof REJECT_CODES)[number]

// ── Supported proof versions ─────────────────────────────────────────

export const SUPPORTED_PROOF_VERSIONS = ['v1'] as const

// ── Policy thresholds (11-time-window-policy.md) ─────────────────────

/** Minimum WoT cohort size for admission */
export const K_MIN = 50

/** Minimum receipts before batch release */
export const T_MIN = 20

// ── Domain tag (03-proof-spec.md) ────────────────────────────────────

/**
 * Fixed application constant identifying this protocol.
 * Used in scope packing: scope = Poseidon(domain_tag, subject_id, epoch_id)
 * The actual BN254 scalar is Poseidon("arrival-review-v1").
 */
export const DOMAIN_TAG = 'arrival-review-v1'

// ── Epoch separator (CLAUDE.md Protocol Decisions) ───────────────────

/**
 * Literal separator used in epoch_id derivation.
 * epoch_id = sha256(subject_id + EPOCH_SEPARATOR + time_window_id)
 */
export const EPOCH_SEPARATOR = '||'
