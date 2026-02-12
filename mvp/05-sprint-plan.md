# MVP Sprint Plan (2-3 Weeks)

## Sprint 0 (2 days): Specification Lock

Goals:

1. Freeze proof and event schemas
2. Freeze verification policy and reject codes
3. Define acceptance tests

Outputs:

1. Signed-off schema docs
2. test matrix draft

## Sprint 1 (Week 1): Core Backends

Goals:

1. Ship WoT cohort + root publication
2. Ship receipt verifier
3. Ship nullifier store skeleton

Outputs:

1. `wot-indexer` and root API
2. `receipt-verifier` API
3. context-scoped nullifier persistence

Demo:

1. Generate subject root
2. Verify sample receipts
3. Simulate nullifier insertion and duplicate detection

## Sprint 2 (Week 2): Proof Path and Admission

Goals:

1. Implement local proof generation flow
2. Implement review-gateway verification pipeline
3. Enforce `k_min`, nullifier, and time window policy

Outputs:

1. proof-engine SDK integration
2. gateway accept/reject pipeline
3. policy test suite

Demo:

1. Submit valid proof bundle and admit
2. Submit duplicate nullifier and reject
3. Submit below-`k_min` context and reject

## Sprint 3 (Week 3): UI, Hardening, and E2E Demo

Goals:

1. Build minimal submission + feed UI
2. Add delayed publish and privacy-safe logging
3. Run adversarial tests and final demo script

Outputs:

1. review submission page
2. verified feed page with badges
3. readiness report with known limits

Demo:

1. End-to-end from identity to verified feed
2. show rejection paths with clear error codes
3. show local-first proving and optional remote fallback disclosure

## Release Gate Checklist

1. All acceptance tests pass
2. No duplicate nullifier acceptance
3. `k_min` gate enforced in all paths
4. Proof artifact pinning verified
5. Privacy logging policy validated
