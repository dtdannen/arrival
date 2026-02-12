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
6. Mismatched proof `epoch_id` vs server-derived epoch fails (`invalid_epoch_context`)

## Policy Enforcement Tests

1. `k_min` threshold hard-rejects undersized cohort (submission is never admitted/held)
2. Duplicate nullifier rejects second submission
3. Cross-subject submissions with same user do not collide nullifiers
4. Epoch rotation allows new submission in new epoch

## Review Lifecycle Tests

1. Admitted review is not visible in feed (status = `admitted`, not returned by `GET /v1/subjects/{subject_id}/reviews`)
2. Batch release transitions all held reviews for a closed window to `published` simultaneously
3. Batch release does not occur while time window is still open
4. Batch release does not occur when `t_min` is not met (reviews remain `admitted`)
5. Published reviews appear in randomized order (not submission order)
6. Gateway returns `status: "admitted"` with `held_reason` on successful submission
7. Rejected submission does not consume nullifier (reviewer can resubmit corrected proof)
8. Window merge: reviews held in a short window that never met `t_min` are merged into the next longer window

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
