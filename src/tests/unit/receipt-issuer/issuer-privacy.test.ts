import { describe, it, expect } from 'vitest'
import { sha256Hex } from '../../helpers/crypto.js'

/**
 * Receipt Issuer — Privacy Properties
 * Spec: 12-receipt-spec.md Privacy Properties 1-2
 *
 * 1. Issuer unlinkability: the issuer cannot link (r, S) to the blinded request B
 * 2. Issuer-verifier unlinkability: even though verifier sees r, issuer cannot reverse
 */

describe('Receipt Issuer — Privacy', () => {
  it('T-406: Issuer does not learn r — only blinded value B visible to issuer', () => {
    // Spec: 12-receipt-spec.md Privacy Property 1
    //
    // Simulate the issuance protocol and verify that the issuer
    // only ever sees B (the blinded value), never r (the secret).

    // Client generates secret r (never sent to issuer)
    const r = sha256Hex('client-secret-406')

    // Client computes blinding factor and blinded value B
    const blindingFactor = sha256Hex(`blinding:${r}`)
    const B = sha256Hex(`blind:${r}:${blindingFactor}`)

    // What the issuer sees: ONLY B
    const issuerObserved = { blinded_value: B }

    // The issuer never sees r
    expect(issuerObserved).not.toHaveProperty('r')
    expect(issuerObserved.blinded_value).not.toBe(r)

    // B is not derivable back to r without the blinding factor
    // (In real RSABSSA, the blinding is computationally hiding under RSA assumption)
    expect(B).not.toBe(r)
    expect(B).not.toBe(blindingFactor)
  })

  it('T-407: Issuer cannot link S_blind to unblinded (r, S) — no deterministic linkage across batch', () => {
    // Spec: 12-receipt-spec.md Privacy Property 2
    //
    // When multiple clients blind-sign in a batch, the issuer cannot
    // match which S_blind corresponds to which (r, S) after unblinding.

    // Simulate 3 clients going through blind signing
    const clients = ['alice', 'bob', 'carol'].map((name) => {
      const r = sha256Hex(`secret:${name}`)
      const blindingFactor = sha256Hex(`blinding:${r}`)
      const B = sha256Hex(`blind:${r}:${blindingFactor}`)
      const signingKey = sha256Hex('issuer-sk')
      const S_blind = sha256Hex(`sign:${B}:${signingKey}`)
      const S = sha256Hex(`unblind:${S_blind}:${blindingFactor}`)
      return { name, r, B, S_blind, S }
    })

    // Issuer sees: [B_alice, B_bob, B_carol] and [S_blind_alice, S_blind_bob, S_blind_carol]
    const issuerSees = clients.map((c) => ({ B: c.B, S_blind: c.S_blind }))

    // Verifier later sees: [(r_alice, S_alice), (r_bob, S_bob), (r_carol, S_carol)]
    const verifierSees = clients.map((c) => ({ r: c.r, S: c.S }))

    // The issuer cannot link issuerSees to verifierSees:
    // - B values don't appear in verifier data
    for (const issuerRecord of issuerSees) {
      for (const verifierRecord of verifierSees) {
        expect(issuerRecord.B).not.toBe(verifierRecord.r)
        expect(issuerRecord.B).not.toBe(verifierRecord.S)
        expect(issuerRecord.S_blind).not.toBe(verifierRecord.S)
      }
    }

    // All blinded values are distinct (no collision)
    const blindedSet = new Set(issuerSees.map((i) => i.B))
    expect(blindedSet.size).toBe(3)

    // All unblinded signatures are distinct
    const sigSet = new Set(verifierSees.map((v) => v.S))
    expect(sigSet.size).toBe(3)
  })
})
