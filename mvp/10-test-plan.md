# MVP Test Plan

## Test Categories

1. Functional verification tests
2. Policy enforcement tests
3. Adversarial/security tests
4. Performance and reliability tests

## Functional Verification Tests

1. Valid bundle passes admission
2. Valid membership + invalid receipt fails
3. Valid receipt + invalid membership fails
4. Invalid time-window proof fails
5. Unsupported proof version fails

## Policy Enforcement Tests

1. `k_min` threshold rejects undersized cohort
2. Duplicate nullifier rejects second submission
3. Cross-subject submissions with same user do not collide nullifiers
4. Epoch rotation allows new submission in new epoch

## Adversarial Tests

1. Replay attack with same payload
2. Proof bundle field tampering after generation
3. Receipt substitution attack
4. Root mismatch attack (proof built for stale/other root)
5. Timestamp narrowing attempt below policy minimum

## Privacy-Protection Tests

1. Logs do not store witness material
2. Logs do not include stable user identifiers in admission path
3. Delayed publication policy enforced
4. UI never shows exact interaction timestamp

## Performance Tests

1. End-to-end submit latency (p50, p95)
2. Verification throughput under concurrent load
3. Nullifier-store lookup/write latency

## Reliability Tests

1. Gateway restarts do not break nullifier integrity
2. Root refresh does not admit proofs against expired roots
3. Partial service failure returns deterministic error states

## Exit Criteria

1. No critical/admission-bypass bugs
2. No duplicate nullifier acceptance
3. `k_min` gate fully enforced
4. Privacy logging policy passes audit checks
