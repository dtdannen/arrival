import { describe, it, expect } from 'vitest'

/**
 * Privacy — Remote Prover Warning Tests
 * Spec: README.md Design Principle #5, Proving Policy #2, 06-trust-model-and-risk-mitigation.md §2
 *
 * Core invariant: remote proving requires explicit trust warning before any
 * witness data leaves the device. Local proving is the default.
 */

// ── Simulated proving mode configuration ─────────────────────────────

type ProvingMode = 'local' | 'remote'

interface ProvingConfig {
  mode: ProvingMode
  remoteEndpoint?: string
  trustWarningAccepted: boolean
}

interface ProverClient {
  config: ProvingConfig
  generateProof(witness: { identity_secret: string; merkle_path: string[] }): {
    proofSent: boolean
    witnessSentRemotely: boolean
    warningShown: boolean
  }
}

function createProverClient(config: ProvingConfig): ProverClient {
  return {
    config,
    generateProof(witness) {
      if (config.mode === 'local') {
        return { proofSent: false, witnessSentRemotely: false, warningShown: false }
      }

      // Remote mode: must show warning and get acceptance before sending witness
      if (!config.trustWarningAccepted) {
        // Block: do not send witness remotely without warning acceptance
        return { proofSent: false, witnessSentRemotely: false, warningShown: true }
      }

      return { proofSent: true, witnessSentRemotely: true, warningShown: true }
    },
  }
}

describe('Privacy — Remote Prover', () => {
  it('T-1306: Remote prover fallback shows trust warning before witness data leaves device', () => {
    // Default config is local proving — no warning needed, no remote data
    const localProver = createProverClient({ mode: 'local', trustWarningAccepted: false })
    const localResult = localProver.generateProof({
      identity_secret: 'secret-data',
      merkle_path: ['path-node-1', 'path-node-2'],
    })
    expect(localResult.witnessSentRemotely).toBe(false)
    expect(localResult.warningShown).toBe(false)

    // Remote mode WITHOUT trust warning accepted — witness must NOT be sent
    const remoteNoAccept = createProverClient({
      mode: 'remote',
      remoteEndpoint: 'https://prover.example.com',
      trustWarningAccepted: false,
    })
    const remoteBlockedResult = remoteNoAccept.generateProof({
      identity_secret: 'secret-data',
      merkle_path: ['path-node-1', 'path-node-2'],
    })
    expect(remoteBlockedResult.witnessSentRemotely).toBe(false)
    expect(remoteBlockedResult.warningShown).toBe(true) // warning shown but not accepted

    // Remote mode WITH trust warning accepted — witness can be sent
    const remoteAccepted = createProverClient({
      mode: 'remote',
      remoteEndpoint: 'https://prover.example.com',
      trustWarningAccepted: true,
    })
    const remoteAcceptedResult = remoteAccepted.generateProof({
      identity_secret: 'secret-data',
      merkle_path: ['path-node-1', 'path-node-2'],
    })
    expect(remoteAcceptedResult.witnessSentRemotely).toBe(true)
    expect(remoteAcceptedResult.warningShown).toBe(true)
  })
})
