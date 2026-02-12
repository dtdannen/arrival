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

## Non-Negotiable Requirements

1. `TimeBlind` is mandatory (no exact interaction timestamps in public proofs).
2. `k_min` anonymity threshold is mandatory (default 50, configurable).
3. One-review-per-subject-per-epoch via nullifier.
4. Persistent identity key is never used directly to sign review posts.
5. If `k < k_min`, individual review is not published.

## Core Stack (MVP)

1. `nostr-keys` for identity and signing
2. `nostr-web-of-trust` for social graph
3. `semaphore/nullreview` style ZK membership + nullifier proofs
4. `cashu/blind-signature` interaction receipts
5. `timeblind` range/window proofs

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
