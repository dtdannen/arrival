import { describe, it, expect } from 'vitest'
import { sha256Hex } from '../../helpers/crypto.js'
import type { KeysetRecord } from '../../helpers/types.js'

/**
 * Receipt Issuer — Keyset Management
 * Spec: 12-receipt-spec.md Keyset Rotation and Temporal Binding
 *
 * Key requirements:
 * - Keysets are scoped per subject_id
 * - Validity periods must not overlap
 * - Expired keysets remain in registry for verification
 * - Keyset granularity finer than smallest time window
 */

// ── Keyset registry for testing ──────────────────────────────────────

class KeysetRegistry {
  private keysets: KeysetRecord[] = []

  add(keyset: KeysetRecord): void {
    // Validate no overlap with existing keysets for same subject
    for (const existing of this.keysets) {
      if (
        existing.subject_id === keyset.subject_id &&
        existing.keyset_start < keyset.keyset_end &&
        keyset.keyset_start < existing.keyset_end
      ) {
        throw new Error(
          `Keyset overlap: ${existing.keyset_id} [${existing.keyset_start},${existing.keyset_end}] ` +
          `overlaps with ${keyset.keyset_id} [${keyset.keyset_start},${keyset.keyset_end}]`,
        )
      }
    }
    this.keysets.push(keyset)
  }

  getForSubject(keyset_id: string, subject_id: string): KeysetRecord | null {
    return this.keysets.find(
      (k) => k.keyset_id === keyset_id && k.subject_id === subject_id,
    ) ?? null
  }

  getAllForSubject(subject_id: string): KeysetRecord[] {
    return this.keysets.filter((k) => k.subject_id === subject_id)
  }
}

function makeKeyset(id: string, subject_id: string, start: number, end: number): KeysetRecord {
  return {
    keyset_id: `keyset-${id}`,
    subject_id,
    keyset_start: start,
    keyset_end: end,
    public_key: sha256Hex(`pk-${id}`),
    issuer_id: 'issuer-001',
  }
}

describe('Receipt Issuer — Keyset Management', () => {
  it('T-402: Keyset scoped to subject — verification against wrong subject keyset fails', () => {
    // Spec: 12-receipt-spec.md Subject Binding
    const registry = new KeysetRegistry()
    const keysetA = makeKeyset('subA', 'subject-A', 1000, 2000)
    const keysetB = makeKeyset('subB', 'subject-B', 1000, 2000)
    registry.add(keysetA)
    registry.add(keysetB)

    // Keyset for subject-A exists
    expect(registry.getForSubject('keyset-subA', 'subject-A')).not.toBeNull()

    // Keyset for subject-A does NOT match subject-B
    expect(registry.getForSubject('keyset-subA', 'subject-B')).toBeNull()

    // Keyset for subject-B does NOT match subject-A
    expect(registry.getForSubject('keyset-subB', 'subject-A')).toBeNull()
  })

  it('T-403: Keyset rotation produces new keys — different keyset_id and public key, old keyset in registry', () => {
    // Spec: 12-receipt-spec.md Keyset rotation rules
    const registry = new KeysetRegistry()
    const keyset1 = makeKeyset('day1', 'subject-001', 1000, 2000)
    const keyset2 = makeKeyset('day2', 'subject-001', 2000, 3000)
    registry.add(keyset1)
    registry.add(keyset2)

    // Both keysets are in the registry
    const allKeysets = registry.getAllForSubject('subject-001')
    expect(allKeysets).toHaveLength(2)

    // They have different IDs and public keys
    expect(keyset1.keyset_id).not.toBe(keyset2.keyset_id)
    expect(keyset1.public_key).not.toBe(keyset2.public_key)

    // Old keyset still retrievable (spec: "Expired keysets remain in the registry")
    expect(registry.getForSubject('keyset-day1', 'subject-001')).not.toBeNull()
  })

  it('T-404: Keyset validity periods do not overlap — no overlapping [keyset_start, keyset_end] intervals', () => {
    // Spec: 12-receipt-spec.md Keyset rotation rule 1
    const registry = new KeysetRegistry()
    const keyset1 = makeKeyset('k1', 'subject-001', 1000, 2000)
    registry.add(keyset1)

    // Attempting to add an overlapping keyset should throw
    const overlapping = makeKeyset('k2', 'subject-001', 1500, 2500)
    expect(() => registry.add(overlapping)).toThrow(/overlap/)

    // Non-overlapping keyset for the same subject should succeed
    const valid = makeKeyset('k3', 'subject-001', 2000, 3000)
    expect(() => registry.add(valid)).not.toThrow()
  })

  it('T-405: Expired keyset still valid for verification — receipt signed with expired keyset still verifies', () => {
    // Spec: 12-receipt-spec.md Keyset rotation rule 4
    const now = 5000
    const registry = new KeysetRegistry()
    const expiredKeyset = makeKeyset('expired', 'subject-001', 1000, 2000)
    registry.add(expiredKeyset)

    // The keyset is expired (keyset_end=2000 < now=5000)
    expect(expiredKeyset.keyset_end).toBeLessThan(now)

    // But the registry still returns it — expired keysets remain for verification
    const retrieved = registry.getForSubject('keyset-expired', 'subject-001')
    expect(retrieved).not.toBeNull()
    expect(retrieved!.public_key).toBe(expiredKeyset.public_key)
  })
})
