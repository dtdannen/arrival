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
2. ~~Epoch granularity~~ **CLOSED**: unified with time window. `epoch_id = hash(subject_id || time_window_id)`. Epoch scope adapts with the adaptive time window (weekly/biweekly/monthly/quarterly). One review per identity per subject per window. See `02-architecture.md` and `11-time-window-policy.md`.
3. ~~TimeBlind window policy~~ **CLOSED**: system-calculated adaptive windows (weekly / biweekly / monthly / quarterly) per `11-time-window-policy.md`

## Proof/Infra Decisions

1. ~~Proof composition~~ **CLOSED**: modular verifiers. Membership (Semaphore v4 Groth16), time-window (custom Circom), and interaction receipt (traditional signature verification) are separate proofs with independent verification steps. This avoids a custom trusted setup and matches the existing `proof_bundle` schema and verification pipeline.
2. ~~Prover operation~~ **CLOSED**: local-first with optional remote fallback at launch.
   - Local proving is the default path.
   - Remote proving is opt-in fallback only, with explicit trust warning.
3. Circuit/proof versioning and migration cadence
4. ~~Technology stack~~ **CLOSED**: TypeScript/Circom-first. TypeScript for all services and client, Circom + snarkjs for ZK circuits and proving (WASM for browser-local), nostr-tools for Nostr integration, PostgreSQL for data. See `04-implementation-plan.md` "Technology Stack."

## Receipt Decisions

Receipt lifecycle, mechanism (blind signatures), subject/reviewer binding, and spend semantics are now specified in `12-receipt-spec.md`. Remaining open items:

1. ~~Specific blind signature scheme~~ **CLOSED**: RSA blind signatures (RSABSSA per IETF RFC 9474). Battle-tested, well-understood security properties, TypeScript implementations available. No ZK-circuit-friendliness needed since interaction proof uses traditional signature verification. See `12-receipt-spec.md`.
2. ~~Accepted issuer registry governance~~ **CLOSED**: admin-managed table with manual registration for MVP. An operator adds issuers and their keysets to the PostgreSQL registry. No self-registration or on-chain attestation for MVP. Does not close the door on more decentralized governance post-MVP. See `12-receipt-spec.md`.
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
