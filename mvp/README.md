# MVP Plan V4: ZK-First Consumer/Local-Business Reviews

## Scope of This Document

This plan focuses on **technical design and protocol correctness**. The following are explicitly out of scope:

1. **Testing requirements** — test plans, test matrices, and coverage criteria are tracked separately and not part of the technical design review.
2. **Estimated coding or dev time** — no time estimates, sprint durations, or delivery forecasts. We care about getting the technical plan right, not predicting how long it takes.

## Objective

Build an MVP that enforces:

1. High anonymity for reviewers
2. WoT-based trust filtering
3. Proof of real interaction
4. Clear trust boundaries for users

This is the canonical V4 plan for MVP execution.

## Product Lane

Consumer / local-business review app.

## Decision Hierarchy

The objectives above are the product goals — what we are building and why. Design principles and architectural commitments below are the means to achieve those goals. When a design principle appears to conflict with a core objective, find a design that satisfies both. Design principles guide *how* we build, not *whether* we build. A principle should never be used to argue away a core objective.

## Design Principles

1. **Privacy and anonymity are the priority.** When a design choice is a tradeoff between stronger anonymity and lower computational cost, choose stronger anonymity. Additional computation, storage, or complexity in service of privacy is an acceptable cost. Features that weaken anonymity guarantees — even slightly, even conveniently — are not acceptable.
2. **Never trust the client for security-critical values.** If the server can derive or verify a value, the client should not be the authority for it. Client-submitted values are hints or conveniences, never the source of truth for policy enforcement.
3. **Prefer removing features over compromising guarantees.** If a feature cannot be implemented without weakening privacy, anonymity, or trust boundaries, remove the feature. Don't ship a degraded version that looks like it works.
4. **Prefer decentralization.** When choosing between a centralized and decentralized approach, prefer decentralization. MVP may launch with centralized components for pragmatism, but design decisions should not close the door on decentralization later.
5. **Local proving is a privacy decision, not a performance decision.** Local proving keeps private witness data (identity secrets, Merkle paths, interaction timestamps) on the user's device. Remote proving requires trusting a third party with that data. We default to local proving because it eliminates that trust requirement, regardless of computational cost.
6. **Ship to real users.** This MVP is a product, not a proof of concept. The spec must be complete enough to build something real users submit reviews through, not just a technical demonstration.

## Architectural Commitments

1. **Nostr is the WoT source.** The social graph is built from Nostr follow data. This is non-negotiable. Nostr-specific ingestion semantics (replaceable events, relay variance, deterministic resolution) must be fully specified.
2. **Interaction receipts use blind signatures.** The goal is "prove the reviewer interacted with the subject without revealing reviewer identity." Blind signatures provide issuer unlinkability: the issuer signs a blinded value at interaction time and cannot link it to the unblinded receipt presented at review time. See `12-receipt-spec.md` for the full lifecycle.
3. **One canonical spec per domain.** Each spec file owns its domain. Other files reference, not redefine. When conflicts arise, the canonical owner wins:
   - `02-architecture.md` → system components, submission flow, storage model
   - `03-proof-spec.md` → proof statements, public/private inputs, nullifier construction, admission policy
   - `09-event-and-api-spec.md` → API endpoints, event schemas, proof bundle fields, reject codes
   - `11-time-window-policy.md` → time-window circuit, adaptive window calculation, batch release policy
   - `12-receipt-spec.md` → interaction receipt lifecycle, blind signature mechanism, issuer binding, spend semantics
   - `06-trust-model-and-risk-mitigation.md` → trust boundaries, residual risks, mitigations

## Non-Negotiable Requirements

1. `TimeBlind` is mandatory (no exact interaction timestamps in public proofs).
2. `k_min` anonymity threshold is mandatory (default 50, configurable).
3. One-review-per-subject-per-epoch via nullifier.
4. Persistent identity key is never used directly to sign review posts.
5. If `k < k_min`, submission is rejected (`insufficient_anonymity_set`) and is not admitted, held, or published.
6. `epoch_id` is server-authoritative: the gateway derives and enforces it, never trusting a top-level client value.

## Core Stack (MVP)

1. `nostr-keys` for identity and signing
2. `nostr-web-of-trust` for social graph
3. Semaphore v4 (`@semaphore-protocol/*`) for ZK membership proofs + nullifiers
4. Blind-signed interaction receipts with keyset rotation for temporal binding (see `12-receipt-spec.md`)
5. Custom Circom time-window circuit (`circomlib/comparators.circom`) for privacy-preserving timestamp range proofs

## Proving Policy

1. Local proving is default.
2. Remote proving is optional fallback only, with explicit trust warning.
3. Verifier rejects proofs that fail any required check.

## MVP Folder Organization

1. `mvp/README.md`: canonical V4 plan and execution index
2. `mvp/01-scope-and-success.md`: product scope, in/out boundaries, KPIs
3. `mvp/02-architecture.md`: system components and request/verification flows
4. `mvp/03-proof-spec.md`: proof statements, inputs, and verification policy
5. `mvp/04-implementation-plan.md`: implementation steps and deliverables
6. `mvp/05-sprint-plan.md`: sprint-by-sprint delivery sequence
7. `mvp/06-trust-model-and-risk-mitigation.md`: trust boundaries and mitigations
8. `mvp/07-risc0-evaluation.md`: RISC Zero fit analysis and recommendation
9. `mvp/08-open-decisions.md`: unresolved decisions to close before build lock
10. `mvp/09-event-and-api-spec.md`: submission payload and API contract
11. `mvp/10-test-plan.md`: functional, adversarial, and privacy test coverage
12. `mvp/11-time-window-policy.md`: time-window proof circuit, adaptive window calculation, `t_min` threshold, and batch release policy
13. `mvp/12-receipt-spec.md`: interaction receipt lifecycle, blind signature mechanism, issuer/subject/reviewer binding, spend semantics

## Build Sequence

1. Freeze proof stack and verification policy.
2. Implement WoT cohorting and root publication.
3. Implement proof generation and verification pipeline.
4. Add review gateway admission checks.
5. Ship minimal UI for proof-verified review browsing.
6. Run adversarial and privacy-focused test suite.

## Delivery Target

2-3 week prototype delivering:

1. End-to-end proof-verified review post
2. WoT-qualified review feed
3. Policy enforcement (`k_min`, nullifier, time windows)
4. Local proving default with explicit remote fallback path
