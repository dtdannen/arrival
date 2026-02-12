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
3. ~~TimeBlind window policy~~ **CLOSED**: system-calculated adaptive windows (weekly / biweekly / monthly / quarterly) per `11-time-window-policy.md`

## Proof/Infra Decisions

1. Proof composition:
   - single combined bundle vs modular verifiers
2. ~~Prover operation~~ **CLOSED**: local-first with optional remote fallback at launch.
   - Local proving is the default path.
   - Remote proving is opt-in fallback only, with explicit trust warning.
3. Circuit/proof versioning and migration cadence

## Receipt Decisions

Receipt lifecycle, mechanism (blind signatures), subject/reviewer binding, and spend semantics are now specified in `12-receipt-spec.md`. Remaining open items:

1. Specific blind signature scheme (RSA blind signatures, BDH-based, etc.)
2. Accepted issuer registry governance (who can register, vetting process)
3. Keyset rotation schedule (daily recommended)
4. ~~Receipt expiration policy~~ **CLOSED**: expiration is emergent from time-window + keyset system. A receipt is usable as long as its keyset period falls within an open time window. No separate expiration timer needed. Cross-epoch reuse blocked by epoch-independent spent-receipts table. See `12-receipt-spec.md` "Receipt Expiration and Epoch Interaction."

## Security/Privacy Decisions

1. Logging retention window
2. Delayed publish bucket size
3. Abuse handling process without deanonymization

## Launch Readiness Decisions

1. MVP go-live gates and owner sign-offs
2. Red-team scenario coverage threshold
3. Public trust-model disclosure wording
