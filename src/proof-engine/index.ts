/**
 * Proof Engine — Client-side proof bundle generation.
 *
 * Spec: 03-proof-spec.md (Proof Statements, Nullifier Construction)
 *       11-time-window-policy.md (Adaptive Windows, Volume Bucketing)
 *
 * Responsibilities:
 * - Determine time window policy from volume metrics
 * - Compute time_window_id for a subject + policy + date
 * - Construct nullifier scope and nullifier hash
 * - Package proof bundles for submission
 */

import { sha256 } from '@noble/hashes/sha256'
import { utf8ToBytes } from '@noble/hashes/utils'
import { poseidonHash, sha256Hex } from '../shared/crypto.js'
import { DOMAIN_TAG } from '../shared/constants.js'
import type { TimeWindowPolicy } from '../shared/types.js'

// ── Types ────────────────────────────────────────────────────────────

export interface VolumeMetrics {
  receipts_per_week: number
  receipts_per_month: number
}

export type VolumeBucket = 'low' | 'medium' | 'high'

// ── Time window policy ───────────────────────────────────────────────

/**
 * Determine the adaptive time window policy based on volume metrics.
 *
 * Per 11-time-window-policy.md:
 * - weekly: 100+ receipts/week
 * - biweekly: 20-99 receipts/week
 * - monthly: 20+ receipts/month (but <20/week)
 * - quarterly: <20 receipts/month
 */
export function determineWindowPolicy(metrics: VolumeMetrics): TimeWindowPolicy {
  if (metrics.receipts_per_week >= 100) return 'weekly'
  if (metrics.receipts_per_week >= 20) return 'biweekly'
  if (metrics.receipts_per_month >= 20) return 'monthly'
  return 'quarterly'
}

/**
 * Coarse volume bucketing — deliberately imprecise to avoid leaking exact sales data.
 *
 * Per 11-time-window-policy.md: "receipt_volume_bucket is coarse"
 */
export function determineVolumeBucket(receiptCount: number): VolumeBucket {
  if (receiptCount >= 100) return 'high'
  if (receiptCount >= 20) return 'medium'
  return 'low'
}

/**
 * Compute the canonical time_window_id for a subject under a given policy.
 *
 * Format per 11-time-window-policy.md:
 * - weekly:    "2026-W09"
 * - biweekly:  "2026-BW05"
 * - monthly:   "2026-M02"
 * - quarterly: "2026-Q1"
 */
export function computeTimeWindowId(
  _subject_id: string,
  policy: TimeWindowPolicy,
  referenceDate: Date,
): string {
  const year = referenceDate.getUTCFullYear()
  const month = referenceDate.getUTCMonth() + 1

  switch (policy) {
    case 'weekly': {
      const jan1 = new Date(Date.UTC(year, 0, 1))
      const days = Math.floor((referenceDate.getTime() - jan1.getTime()) / 86400000)
      const week = Math.ceil((days + jan1.getUTCDay() + 1) / 7)
      return `${year}-W${String(week).padStart(2, '0')}`
    }
    case 'biweekly': {
      const jan1 = new Date(Date.UTC(year, 0, 1))
      const days = Math.floor((referenceDate.getTime() - jan1.getTime()) / 86400000)
      const biweek = Math.ceil((days + jan1.getUTCDay() + 1) / 14)
      return `${year}-BW${String(biweek).padStart(2, '0')}`
    }
    case 'monthly':
      return `${year}-M${String(month).padStart(2, '0')}`
    case 'quarterly': {
      const quarter = Math.ceil(month / 3)
      return `${year}-Q${quarter}`
    }
  }
}

// ── Nullifier construction ───────────────────────────────────────────

/**
 * Convert a string to a BN254 scalar field element.
 * Takes first 31 bytes of SHA-256 hash to stay within the field.
 */
export function fieldElement(str: string): bigint {
  const hash = sha256(utf8ToBytes(str))
  let result = 0n
  for (let i = 0; i < 31; i++) {
    result = (result << 8n) | BigInt(hash[i])
  }
  return result
}

/**
 * Compute nullifier scope per 03-proof-spec.md:
 * scope = Poseidon(domain_tag, subject_id, epoch_id)
 *
 * The domain_tag is itself a Poseidon hash of the arrival domain string,
 * ensuring domain separation for nullifiers.
 */
export function computeScope(subject_id: string, epoch_id: string): bigint {
  const domainTag = poseidonHash(BigInt('0x' + sha256Hex(DOMAIN_TAG).slice(0, 16)))
  return poseidonHash(domainTag, fieldElement(subject_id), fieldElement(epoch_id))
}

/**
 * Compute nullifier per 03-proof-spec.md:
 * nullifier = Poseidon(identity_secret, scope)
 *
 * Deterministic: same identity + same scope = same nullifier.
 * This enforces one review per subject per epoch.
 */
export function computeNullifier(identitySecret: Uint8Array, scope: bigint): bigint {
  const secretBigInt = fieldElement(Buffer.from(identitySecret).toString('hex'))
  return poseidonHash(secretBigInt, scope)
}
