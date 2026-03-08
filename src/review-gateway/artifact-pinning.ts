/**
 * Proof Artifact Pinning — Circuit hash and verifying key verification.
 *
 * Spec: 06-trust-model-and-risk-mitigation.md (Mitigation Control #4, Security Regression Checklist)
 *
 * "Pin circuit_hash and verifying_key_hash. Gateway compares loaded artifacts
 *  against pinned hashes at startup or verification time. Fail closed on mismatch."
 *
 * Two circuit families are pinned:
 * - Semaphore v4 membership circuit (Groth16) — membership proof verification
 * - TimeBlind circuit (Groth16) — time-window proof verification
 *
 * Each family pins two artifacts: the circuit WASM and the verifying key.
 * Production replaces placeholder identifiers with real sha256 hashes of
 * compiled circuit artifacts from circuits/build/.
 */

import { sha256Hex } from '../shared/crypto.js'

// ── Types ────────────────────────────────────────────────────────────

export interface PinnedArtifact {
  name: string
  expected_hash: string
}

export interface ArtifactPinConfig {
  membership_circuit_hash: string
  membership_verifying_key_hash: string
  timeblind_circuit_hash: string
  timeblind_verifying_key_hash: string
}

export interface PinVerificationResult {
  valid: boolean
  mismatches: Array<{ artifact: string; expected: string; actual: string }>
}

// ── Pinned artifact identifiers ─────────────────────────────────────

/**
 * Generate pinned hashes from artifact identifiers.
 *
 * In production, these identifiers are replaced with the actual binary content
 * of compiled circuit artifacts. For MVP, we pin the deterministic sha256 of
 * the artifact identifier strings.
 */
export function generatePinnedConfig(): ArtifactPinConfig {
  return {
    membership_circuit_hash: sha256Hex('semaphore-v4-membership-circuit-wasm'),
    membership_verifying_key_hash: sha256Hex('semaphore-v4-membership-vkey'),
    timeblind_circuit_hash: sha256Hex('timeblind-circuit-wasm'),
    timeblind_verifying_key_hash: sha256Hex('timeblind-vkey'),
  }
}

// ── Verification ────────────────────────────────────────────────────

/**
 * Verify loaded circuit artifacts against pinned hashes.
 *
 * Fail closed: any mismatch means the gateway must refuse to verify proofs
 * using the mismatched artifact.
 */
export function verifyArtifacts(
  pinned: ArtifactPinConfig,
  loaded: ArtifactPinConfig,
): PinVerificationResult {
  const mismatches: PinVerificationResult['mismatches'] = []

  const checks: Array<[string, keyof ArtifactPinConfig]> = [
    ['membership_circuit', 'membership_circuit_hash'],
    ['membership_verifying_key', 'membership_verifying_key_hash'],
    ['timeblind_circuit', 'timeblind_circuit_hash'],
    ['timeblind_verifying_key', 'timeblind_verifying_key_hash'],
  ]

  for (const [name, key] of checks) {
    if (pinned[key] !== loaded[key]) {
      mismatches.push({
        artifact: name,
        expected: pinned[key],
        actual: loaded[key],
      })
    }
  }

  return {
    valid: mismatches.length === 0,
    mismatches,
  }
}

/**
 * Compute the sha256 hash of a circuit artifact's binary content.
 *
 * Used to generate the "loaded" hashes to compare against pinned config.
 */
export function hashArtifact(content: string): string {
  return sha256Hex(content)
}
