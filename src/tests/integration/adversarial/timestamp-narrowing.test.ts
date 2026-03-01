import { describe, it, expect } from 'vitest'
import type { StepResult, WindowRegistry } from '../../helpers/types.js'

/**
 * Adversarial — Timestamp Narrowing Tests
 * Spec: 10-test-plan.md Adversarial Test #5, 11-time-window-policy.md
 *
 * Attack: attacker submits a zero-width or sub-policy-minimum time window to
 * narrow the anonymity set to a single interaction.
 * Defense: the verifier checks window bounds match the server's authoritative values,
 * rejecting windows that don't match the system-assigned window.
 */

function checkWindowBounds(
  time_window_id: string,
  submitted_start: number,
  submitted_end: number,
  windowRegistry: WindowRegistry,
): StepResult {
  // Per 03-proof-spec.md: verifier looks up authoritative window bounds
  // and confirms client-submitted values match exactly
  const authoritative = windowRegistry.getBounds(time_window_id)

  if (!authoritative) {
    return {
      ok: false,
      reject_code: 'invalid_timeblind_proof',
      reject_detail: `Unknown time_window_id: ${time_window_id}`,
    }
  }

  if (submitted_start !== authoritative.window_start || submitted_end !== authoritative.window_end) {
    return {
      ok: false,
      reject_code: 'invalid_timeblind_proof',
      reject_detail: `Window bounds mismatch: submitted [${submitted_start},${submitted_end}] vs authoritative [${authoritative.window_start},${authoritative.window_end}]`,
    }
  }

  // Additional policy check: window must have non-zero width
  if (submitted_start >= submitted_end) {
    return {
      ok: false,
      reject_code: 'invalid_timeblind_proof',
      reject_detail: 'Zero-width or negative window',
    }
  }

  return { ok: true }
}

describe('Adversarial — Timestamp Narrowing', () => {
  it('T-1404: Zero-width window (window_start = window_end) — rejected with invalid_timeblind_proof', () => {
    const now = Math.floor(Date.now() / 1000)
    const weeklyWindow = { window_start: now - 604800, window_end: now }

    // Server has the authoritative weekly window
    const registry: WindowRegistry = {
      getBounds(id) {
        if (id === '2026-W09') return weeklyWindow
        return null
      },
    }

    // Attacker submits zero-width window
    const zeroWidthResult = checkWindowBounds('2026-W09', now, now, registry)
    expect(zeroWidthResult.ok).toBe(false)
    expect(zeroWidthResult.reject_code).toBe('invalid_timeblind_proof')
    expect(zeroWidthResult.reject_detail).toContain('mismatch')

    // Attacker submits narrowed window (not matching authoritative bounds)
    const narrowedResult = checkWindowBounds('2026-W09', now - 3600, now, registry)
    expect(narrowedResult.ok).toBe(false)
    expect(narrowedResult.reject_code).toBe('invalid_timeblind_proof')

    // Attacker submits unknown time_window_id
    const unknownResult = checkWindowBounds('2099-W99', now, now, registry)
    expect(unknownResult.ok).toBe(false)
    expect(unknownResult.reject_code).toBe('invalid_timeblind_proof')
    expect(unknownResult.reject_detail).toContain('Unknown time_window_id')

    // Valid submission with correct bounds passes
    const validResult = checkWindowBounds('2026-W09', weeklyWindow.window_start, weeklyWindow.window_end, registry)
    expect(validResult.ok).toBe(true)
  })
})
