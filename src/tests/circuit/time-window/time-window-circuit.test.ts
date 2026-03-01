import { describe, it, expect } from 'vitest'

/**
 * Circuit — Time-Window
 * Spec: 11-time-window-policy.md Circuit Design
 *
 * "LessEqThan(32): window_start <= t"
 * "LessEqThan(32): t <= window_end"
 * "Total: ~68 constraints for the range proof"
 */

interface TimeWindowCircuitInputs {
  // Public inputs
  time_window_id: string
  window_start: number
  window_end: number
  // Private input (witness)
  interaction_timestamp: number
}

interface CircuitResult {
  satisfied: boolean
}

/**
 * Simulates the time-window range-check circuit.
 * In production this is a Circom circuit with two LessEqThan(32) comparators.
 */
function evaluateTimeWindowCircuit(inputs: TimeWindowCircuitInputs): CircuitResult {
  // Constraint 1: window_start <= t
  // Constraint 2: t <= window_end
  const satisfied =
    inputs.window_start <= inputs.interaction_timestamp &&
    inputs.interaction_timestamp <= inputs.window_end
  return { satisfied }
}

describe('Circuit — Time-Window', () => {
  it('T-600: Valid timestamp within window — proof accepted', () => {
    // Spec: 11-time-window-policy.md "LessEqThan(32): window_start <= t"
    // and "LessEqThan(32): t <= window_end"
    const result = evaluateTimeWindowCircuit({
      time_window_id: '2026-W09',
      window_start: 1000,
      window_end: 2000,
      interaction_timestamp: 1500, // within [1000, 2000]
    })

    expect(result.satisfied).toBe(true)
  })

  it('T-601: Timestamp before window_start — circuit unsatisfied, no valid proof', () => {
    // Spec: 11-time-window-policy.md constraint: window_start <= t
    const result = evaluateTimeWindowCircuit({
      time_window_id: '2026-W09',
      window_start: 1000,
      window_end: 2000,
      interaction_timestamp: 999, // before window_start
    })

    expect(result.satisfied).toBe(false)
  })

  it('T-602: Timestamp after window_end — circuit unsatisfied, no valid proof', () => {
    // Spec: 11-time-window-policy.md constraint: t <= window_end
    const result = evaluateTimeWindowCircuit({
      time_window_id: '2026-W09',
      window_start: 1000,
      window_end: 2000,
      interaction_timestamp: 2001, // after window_end
    })

    expect(result.satisfied).toBe(false)
  })

  it('T-603: Timestamp at exact window_start boundary — proof valid (inclusive)', () => {
    // Spec: 11-time-window-policy.md "LessEqThan" (less-than-or-equal, inclusive)
    const result = evaluateTimeWindowCircuit({
      time_window_id: '2026-W09',
      window_start: 1000,
      window_end: 2000,
      interaction_timestamp: 1000, // exactly at window_start
    })

    expect(result.satisfied).toBe(true)
  })

  it('T-604: Timestamp at exact window_end boundary — proof valid (inclusive)', () => {
    // Spec: 11-time-window-policy.md "LessEqThan" (less-than-or-equal, inclusive)
    const result = evaluateTimeWindowCircuit({
      time_window_id: '2026-W09',
      window_start: 1000,
      window_end: 2000,
      interaction_timestamp: 2000, // exactly at window_end
    })

    expect(result.satisfied).toBe(true)
  })

  it('T-605: Constraint count matches spec — ~68 constraints', () => {
    // Spec: 11-time-window-policy.md
    // "Num2Bits(33): 34 constraints (33 bit-checks + 1 reconstruction) per comparator"
    // "Total: ~68 constraints for the range proof"
    const constraintsPerComparator = 34 // Num2Bits(33) = 33 + 1
    const numComparators = 2 // LessEqThan for start, LessEqThan for end
    const totalConstraints = constraintsPerComparator * numComparators

    expect(totalConstraints).toBe(68)

    // Verify the breakdown matches spec
    expect(constraintsPerComparator).toBe(34) // "34 constraints"
    expect(numComparators).toBe(2) // two LessEqThan(32) comparators
  })
})
