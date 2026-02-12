# MVP Scope and Success Criteria

## Problem

Consumers need honest reviews without retaliation risk, while still being able to trust review quality through social context and interaction verification.

## MVP Promise

For each published review, users can verify:

1. Reviewer belongs to the relevant WoT cohort
2. Reviewer interacted with the reviewed subject
3. Reviewer timing is privacy-preserving (windowed, not exact)
4. Duplicate review attempts in same context are blocked

## In Scope

1. Anonymous review creation with one-time posting identity
2. WoT cohort generation and verification roots
3. Proof-of-interaction receipt verification
4. Time-window proof verification
5. Nullifier dedupe enforcement
6. Verified review feed for a single initial vertical

## Out of Scope

1. Ring signatures
2. Stake-weighted review economics
3. Full encrypted aggregate rating stack
4. Cross-service portable reputation credentials
5. Multi-vertical launch

## Target Users

1. Reviewer: privacy-sensitive user leaving honest review
2. Reader: user filtering by trust distance and verification status
3. Operator: team running verifier and admission policy

## MVP KPIs

1. `100%` published reviews pass all required proof checks
2. `0` accepted duplicate nullifiers per `(subject_id, epoch)`
3. `100%` reviews below `k_min` blocked or deferred
4. End-to-end review submission median under target SLA (define in implementation)
5. Successful red-team replay/tamper tests rejected by verifier

## Primary Go/No-Go Demo

1. Create identity and WoT membership
2. Receive interaction receipt
3. Generate proof bundle locally
4. Submit review
5. Verify feed displays:
   - WoT-qualified badge
   - interaction-verified badge
   - anonymity-set badge
6. Attempt duplicate submission and show deterministic rejection
