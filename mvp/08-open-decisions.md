# Open Decisions to Resolve Before Build Lock

## Product Decisions

1. Initial vertical:
   - beauty products
   - local business services
2. Initial geography and language scope
3. Single-subject type for MVP vs mixed subject types

## Policy Decisions

1. Final `k_min`:
   - 50 baseline
   - 100 stricter mode
2. Epoch granularity:
   - weekly default
   - monthly option
3. TimeBlind window policy:
   - weekly only
   - weekly + monthly

## Proof/Infra Decisions

1. Proof composition:
   - single combined bundle vs modular verifiers
2. Prover operation:
   - local-only at launch
   - local-first with remote fallback at launch
3. Circuit/proof versioning and migration cadence

## Receipt Decisions

1. Accepted issuer list governance
2. Receipt expiration policy
3. One receipt to one review policy edge cases (refunds, chargebacks, disputes)

## Security/Privacy Decisions

1. Logging retention window
2. Delayed publish bucket size
3. Abuse handling process without deanonymization

## Launch Readiness Decisions

1. MVP go-live gates and owner sign-offs
2. Red-team scenario coverage threshold
3. Public trust-model disclosure wording
