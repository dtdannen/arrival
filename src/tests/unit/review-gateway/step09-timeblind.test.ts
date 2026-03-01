import { describe, it, expect } from 'vitest'
import type { StepResult, WindowRegistry } from '../../helpers/types.js'

/**
 * Step 9: Verify time-window bounds match and time-window ZK proof.
 * Spec: 11-time-window-policy.md, 03-proof-spec.md admission step 9
 * Reject code: invalid_timeblind_proof
 *
 * Two sub-checks:
 * a) Window bounds match: client-submitted window_start/window_end match
 *    the authoritative bounds for time_window_id (pure lookup, no ZK)
 * b) ZK proof: the timeblind proof is valid (circuit verification)
 *
 * Per spec: "verifier looks up authoritative window bounds for time_window_id
 * and confirms client-submitted window_start/window_end match exactly"
 */

interface TimeblindVerifier {
  verify(proof: unknown, window_start: number, window_end: number): boolean
}

function verifyTimeblind(
  timeblindProof: unknown,
  time_window_id: string,
  clientWindowStart: number,
  clientWindowEnd: number,
  windowRegistry: WindowRegistry,
  zkVerifier: TimeblindVerifier,
): StepResult {
  // Sub-check (a): verify window bounds match authoritative values
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

  // Sub-check (b): verify ZK proof
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

describe('Review Gateway — Step 9: Time-Window Proof', () => {
  const windowId = '2026-W09'
  const windowStart = 1740000000
  const windowEnd = 1740604800

  const registry: WindowRegistry = {
    getBounds(id: string) {
      if (id === windowId) {
        return { window_start: windowStart, window_end: windowEnd }
      }
      return null
    },
  }

  const acceptingVerifier: TimeblindVerifier = { verify: () => true }
  const rejectingVerifier: TimeblindVerifier = { verify: () => false }

  it('T-980: Valid timeblind proof passes', () => {
    const proof = { protocol: 'groth16', proof_data: 'valid-proof' }

    const result = verifyTimeblind(
      proof, windowId, windowStart, windowEnd, registry, acceptingVerifier,
    )

    expect(result.ok).toBe(true)
  })

  it('T-981: Invalid timeblind proof rejected — invalid_timeblind_proof', () => {
    const proof = { protocol: 'groth16', proof_data: 'invalid-proof' }

    const result = verifyTimeblind(
      proof, windowId, windowStart, windowEnd, registry, rejectingVerifier,
    )

    expect(result.ok).toBe(false)
    expect(result.reject_code).toBe('invalid_timeblind_proof')
  })

  it('T-982: Window bounds mismatch rejected — invalid_timeblind_proof', () => {
    const proof = { protocol: 'groth16', proof_data: 'valid-proof' }
    // Client claims different bounds than server authoritative values
    const wrongStart = windowStart + 1000
    const wrongEnd = windowEnd - 1000

    const result = verifyTimeblind(
      proof, windowId, wrongStart, wrongEnd, registry, acceptingVerifier,
    )

    expect(result.ok).toBe(false)
    expect(result.reject_code).toBe('invalid_timeblind_proof')
    expect(result.reject_detail).toContain('bounds')
  })
})
