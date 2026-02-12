# MVP Spec Inconsistencies and Gaps

This document focuses on **cryptographic/protocol correctness, stack fit, and cross-doc consistency**. The following are explicitly out of scope:

1. **Testing requirements** — test coverage gaps, test plans, and test matrices are not tracked here.
2. **Estimated coding or dev time** — no time estimates or implementation scheduling.

## Conventions

- **Never delete resolved issues.** Mark them with ~~strikethrough~~ and `RESOLVED`, then add a `**Resolution**` block documenting the decision and rationale. This preserves the decision history so we can revisit *why* choices were made.
- **Issue numbers are stable IDs, not sequence positions.** Numbers may appear out of order within severity sections because new issues are appended. Never renumber — other docs and conversations may reference these IDs.
- **Each issue has two sections**: a full description (in the severity-grouped section above) and a solution options summary (in "Solution Options by Issue" below). For resolved issues, the description section carries the full resolution narrative; the solution options section carries the concise decision record.
- **Severity tiers** (Critical / High / Medium) reflect protocol impact, not implementation effort.
- **Design principles and architectural commitments apply to all decisions, but objectives take priority.** See `README.md` "Decision Hierarchy", "Design Principles", and "Architectural Commitments" sections. When a design principle appears to conflict with a core objective, find a design that satisfies both — don't use a principle to remove a feature that serves a core goal. Key rules: privacy wins over computation; never trust the client for security-critical values; prefer decentralization; interaction proof mechanism is open (not locked to Cashu); one canonical spec per domain.

## Critical

### 1. ~~"NullReview" and "TimeBlind" Don't Exist as Real Projects~~ RESOLVED

The spec references `semaphore/nullreview` and `timeblind` as if they're established libraries or protocols. Web searches turn up zero results for either.

- **NullReview**: No library, paper, or protocol by this name exists publicly. Semaphore exists, but "NullReview" does not. If this is something we plan to build, it needs to be called out explicitly as custom work, not referenced as an existing dependency.
- **TimeBlind**: Same problem. There is no published protocol, library, or paper called "TimeBlind." ZK range proofs on timestamps are a real concept, but there's no off-the-shelf `timeblind` package. This is custom cryptographic engineering that needs to be designed, specified, and built.

**Affected files**: `README.md`, `02-architecture.md`, `03-proof-spec.md`, `07-risc0-evaluation.md`

**Resolution**:
- **NullReview** → use Semaphore v4 (`@semaphore-protocol/*`) directly for membership proofs and nullifiers. "NullReview" was never a real dependency.
- **TimeBlind** → custom Circom circuit using `circomlib/comparators.circom` `LessEqThan(32)` templates. Two range checks (~68 constraints) proving a private receipt timestamp falls within a public time window. Fully specified in `11-time-window-policy.md`.
- The time-window design also revealed that **time-window anonymity is independent of `k_min`** (cohort membership anonymity). A new `t_min` threshold, adaptive system-calculated windows, and batch release policy were designed to address this. See `11-time-window-policy.md` for the complete specification.
- Spec files referencing these names need updating to use real dependency names externally; internal module aliases are acceptable.

### 2. ~~Nullifier Construction Doesn't Match Semaphore v4~~ RESOLVED

`03-proof-spec.md` previously defined a four-input nullifier that didn't match Semaphore v4's two-input construction.

**Resolution**:
- **Decision**: Option A — pack application context into Semaphore's `scope` parameter and use the native nullifier directly.
- **Scope packing**: `scope = Poseidon(domain_tag, subject_id, epoch_id)`. Each component is a BN254 scalar field element.
- **Nullifier**: `nullifier = Poseidon(identity_secret, scope)` — Semaphore v4's unmodified construction.
- **Verifier responsibility**: independently compute `scope` from known public values and confirm it matches the proof's public input.
- **Cascade**: This also resolves Issue 6 (trusted setup). Since we use Semaphore's circuits unmodified, we reuse Semaphore v4's existing Groth16 ceremony (400+ participants). No custom ceremony needed.
- Spec files updated: `03-proof-spec.md`, `06-trust-model-and-risk-mitigation.md`.

### 3. ~~`max_distance` Filter Is Architecturally Impossible With Anonymous Reviews~~ RESOLVED

`09-event-and-api-spec.md` lists `max_distance=1|2|3` as a filter on `GET /v1/subjects/{subject_id}/reviews`. This implies the reader's WoT distance to each reviewer is computed at query time. But:

- Reviews are anonymous (posted with one-time keys)
- The architecture has no component that maps anonymous reviews back to WoT distance from the reader
- This would require either breaking anonymity or a separate ZK proof of WoT distance stored per-review

This filter as described **cannot work** without either deanonymization or additional proof infrastructure not specified anywhere. The WoT membership proof only proves the reviewer is *in* the cohort, not *how far* they are from any particular reader.

**Resolution**:
- **Decision**: Option B — precompute distance-bucketed cohort roots and prove membership in a specific tier at submission time.
- `cohort-root-publisher` builds three Merkle trees per subject: `d<=1`, `d<=2`, `d<=3`. Each has its own root hash and `k_size`.
- The cohort-root endpoint returns all tiers. The client selects the closest (smallest) tier where `k_size >= k_min`.
- The reviewer proves membership against that tier's root. The `cohort_root_hash` in the proof bundle implicitly identifies the distance tier.
- At admission, the gateway derives `distance_bucket` from the root's metadata and stores it on the review.
- The `max_distance` filter on `GET /v1/subjects/{subject_id}/reviews` filters on this stored `distance_bucket` — no per-reader computation, no anonymity break.
- `k_min` applies per tier: if `d<=1` has too few members, the reviewer falls back to `d<=2` or `d<=3`. This is visible to the reviewer via the cohort-root endpoint before submission.
- Spec files updated: `02-architecture.md` (cohort-root-publisher, storage model), `09-event-and-api-spec.md` (cohort-root endpoint, filter semantics).

**Affected files**: `09-event-and-api-spec.md`, `02-architecture.md`

### 4. ~~`cohort_size` Client Trust -- Security Gap~~ RESOLVED

`cohort_size` previously appeared in the client-submitted `proof_bundle` (`09-event-and-api-spec.md`) and the server-side `roots` table (`k_size` in `02-architecture.md`). A malicious client could lie about cohort size to bypass `k_min`.

**Resolution**:
- **Decision**: Option A — remove `cohort_size` from the client-submitted proof bundle entirely.
- The verifier always reads `k_size` from the server-side `roots` table using `cohort_root_hash`. No client input is consulted for `k_min` enforcement.
- Users still see cohort size via the cohort-root endpoint response before submitting (read-only, informational).
- Spec files updated: `09-event-and-api-spec.md` (field removed from `proof_bundle`), `03-proof-spec.md` (admission pseudocode clarified as server-side lookup).

### 15. ~~Admission/Publication Lifecycle Is Contradictory~~ RESOLVED

The architecture and proof spec model a binary accept/reject outcome with immediate publication:

- `02-architecture.md` step 8: "If admitted, review is indexed and published with verification badges."
- `03-proof-spec.md` admission pseudocode ends with `accept()` — no intermediate state.
- `09-event-and-api-spec.md` verification result only has `accepted` (bool) with no held/deferred state.

But `11-time-window-policy.md` requires a hold/defer + batch release lifecycle:

- "Hold all admitted reviews until the time window closes" (batch release rule 1)
- "Verify `t_min` is met before releasing the batch" (batch release rule 2)
- "Window with fewer than `t_min` receipts: review held, not published" (test requirement 4)

**Resolution**:
- **Decision**: Option A — three-state lifecycle: `rejected` / `admitted` (held) / `published`.
- `02-architecture.md` submission flow: step 8 now stores with status `admitted` (held, not visible). New step 10 adds batch release job that transitions `admitted` → `published` at window close when `t_min` is met. Rejected submissions do not consume nullifiers.
- `03-proof-spec.md` admission pseudocode: `accept()` → `admit()` with comment clarifying admission is not publication.
- `09-event-and-api-spec.md` verification result: `accepted` (bool) → `status` (`"rejected"` | `"admitted"`). Added `held_reason` field (`"window_open"`, `"t_min_not_met"`). Feed endpoint returns only `published` reviews. Gateway never returns `"published"` synchronously.
- `02-architecture.md` storage model: `reviews` table gains `status` and `time_window_id` columns.
- `10-test-plan.md`: added "Review Lifecycle Tests" section covering held-not-visible, batch release timing, window merge, nullifier non-consumption on reject.
- `11-time-window-policy.md`: no changes needed — it was already correct and is the canonical owner of batch release policy.
- **No max hold duration.** If `t_min` is never met, the review stays held. Window merging (weekly → biweekly → monthly → quarterly) is the escape valve. If even quarterly can't meet `t_min`, publishing would deanonymize the reviewer. The pre-submission disclosure warns the reviewer before they submit.

**Affected files**: `02-architecture.md`, `03-proof-spec.md`, `09-event-and-api-spec.md`, `10-test-plan.md`

### 16. ~~Time-Window Proof Inputs Don't Match API/Proof Schema~~ RESOLVED

`11-time-window-policy.md` defines three public inputs for the time-window circuit:

1. `time_window_id`
2. `window_start` (unix timestamp)
3. `window_end` (unix timestamp)

The circuit literally requires `window_start` and `window_end` to perform the range check (`LessEqThan(32): window_start <= t` and `t <= window_end`).

But `03-proof-spec.md` public inputs only listed `time_window_id`, and `09-event-and-api-spec.md` `proof_bundle` fields only included `time_window_id`. Neither carried `window_start` or `window_end`.

**Resolution**:
- **Decision**: Option A — add `window_start` and `window_end` to both `03-proof-spec.md` public inputs and `09-event-and-api-spec.md` `proof_bundle` fields.
- The verifier performs a server-side equality check: looks up the authoritative window bounds for the submitted `time_window_id` and rejects if the client-submitted `window_start`/`window_end` don't match. This check runs before ZK proof verification in the admission pseudocode.
- The client gets these values from the cohort-root endpoint (already specified in `11-time-window-policy.md` API surface).
- Also aligned `03-proof-spec.md` allowed window sizes with `11-time-window-policy.md`'s four-tier adaptive scheme (weekly, biweekly, monthly, quarterly).
- `11-time-window-policy.md`: no changes needed — it was already correct as the canonical owner.
- Spec files updated: `03-proof-spec.md` (public inputs, admission pseudocode, window sizes), `09-event-and-api-spec.md` (proof_bundle fields).

**Affected files**: `03-proof-spec.md`, `09-event-and-api-spec.md`

### 20. ~~Receipt Issuance Pipeline Missing From Execution Docs~~ RESOLVED

`04-implementation-plan.md` Step 2 and `05-sprint-plan.md` Sprint 1 plan a `receipt-verifier` but not receipt issuance infrastructure. However, `02-architecture.md` lists `receipt-issuer / receipt-verifier` as a component pair, and `12-receipt-spec.md` defines a full issuance flow requiring an issuer endpoint, keyset management, issuer registry, and spent-receipt tracking.

Without the issuer side built, no receipts can be produced for reviewers. The proof engine (Step 3) requires receipts as input, making this a blocker on the end-to-end flow.

**Affected files**: `04-implementation-plan.md`, `05-sprint-plan.md`, `README.md`

**Resolution**:
- **Decision**: Add the full receipt issuance pipeline as explicit deliverables alongside the existing receipt verifier.
- `04-implementation-plan.md` Step 2: expanded from 3 tasks / 2 deliverables to 6 tasks / 6 deliverables covering issuer endpoint, keyset management, issuer registry, verifier, spent-receipts store, and replay protections. Exit criteria expanded to cover end-to-end receipt flow, keyset rotation, subject binding, and spent-receipt rejection.
- `05-sprint-plan.md` Sprint 1: expanded goals, outputs, and demo to include receipt issuance (blind signing endpoint, keyset management, issuer registry) alongside verification. Demo now covers full blind-sign-unblind-verify flow and spent-receipt rejection.
- `README.md` Build Sequence: added step 3 ("Implement interaction receipt pipeline") as an explicit step before proof generation.
- Spec files updated: `04-implementation-plan.md`, `05-sprint-plan.md`, `README.md`.

## High

### 5. ~~Cashu Interaction Receipt Issuance Flow Is Undefined~~ RESOLVED

The spec previously treated Cashu blind signatures as proof-of-interaction receipts, but Cashu is an ecash protocol designed for payments, not for proving interaction. The receipt lifecycle was entirely undefined.

**Resolution**:
- **Decision**: Drop Cashu. Use blind signatures directly (without the ecash layer) as the receipt mechanism. Full lifecycle specified in new canonical file `12-receipt-spec.md`.
- **Issuer**: The business/service provider (or their POS system), with signing keysets scoped per `subject_id`.
- **Issuance trigger**: Completed transaction. Reviewer's client blinds a random secret, issuer signs, reviewer unblinds.
- **Subject binding**: Issuer keys are scoped per `subject_id`; receipts don't cross subjects.
- **Reviewer binding**: Soft binding — only the reviewer knows the secret `r`. One-receipt-one-review limits transfer incentive.
- **One-receipt-one-review**: `receipt_hash = Hash(r)` checked against spent-receipts table at admission. Server-side enforced.
- **Temporal binding**: Keyset rotation (e.g., daily). The keyset used at signing time encodes the interaction's time period. The verifier derives the timestamp range from `keyset_id`, providing the time-window proof its private witness without revealing exact timing.
- **Privacy**: Issuer unlinkability via blind signatures — issuer cannot link unblinded receipt to the blinding request they signed.
- **Trust model**: Receipt trust boundaries added to `06-trust-model-and-risk-mitigation.md`. Issuer collusion and keyset compromise added as residual risks.
- Spec files updated: `README.md` (architectural commitment, core stack, canonical owners, folder org), `02-architecture.md` (component description), `06-trust-model-and-risk-mitigation.md` (trust boundaries, residual risks), `08-open-decisions.md` (closed resolved items, kept truly open items), `11-time-window-policy.md` (removed Cashu reference, linked to receipt spec).

**Affected files**: `README.md`, `02-architecture.md`, `06-trust-model-and-risk-mitigation.md`, `08-open-decisions.md`, `11-time-window-policy.md`, `12-receipt-spec.md`

### 6. ~~Trusted Setup Requirement Not Properly Acknowledged~~ RESOLVED

`06-trust-model-and-risk-mitigation.md` previously hedged with "if using setup-based proving," treating the trusted setup as optional.

**Resolution**:
- **Decision**: Option A — use unmodified Semaphore v4 circuits and existing Groth16 ceremony artifacts.
- This was made possible by resolving Issue 2 with scope packing instead of a custom nullifier circuit. Since we don't modify Semaphore's circuits, we reuse its ceremony directly.
- `06-trust-model-and-risk-mitigation.md` updated to state the trusted setup dependency explicitly and reference Semaphore v4's 400+ participant ceremony. "If" hedging removed.

### 7. ~~RISC Zero Remote Proving Section Is Dated~~ RESOLVED

`07-risc0-evaluation.md` referenced a "Boundless/Bonsai ecosystem" for remote proving. Bonsai was deprecated and retired on December 1, 2025.

**Resolution**:
- Updated remote proving reference to note Bonsai deprecation and current Boundless network.
- Also updated all stale naming in the file: "NullReview" → Semaphore v4, "TimeBlind" → custom Circom time-window circuit, "receipt proofs" → blind-signed interaction receipts. Aligns with resolved Issues #1 and #5.
- Spec files updated: `07-risc0-evaluation.md`.

**Affected files**: `07-risc0-evaluation.md`

### 17. ~~Window Authority Conflicts Across Docs~~ RESOLVED

Three documents gave contradictory answers about who determines time windows and what sizes are available.

**Resolution**:
- **Decision**: Option A — align all docs to system-assigned windows per `11-time-window-policy.md` (canonical owner of time-window policy).
- `02-architecture.md` step 4: "Client selects" → "Client receives system-assigned time window from cohort-root endpoint."
- `08-open-decisions.md`: TimeBlind window policy decision closed — system-calculated adaptive windows (weekly / biweekly / monthly / quarterly) per `11-time-window-policy.md`.
- `11-time-window-policy.md`: no changes needed — already correct as canonical owner.
- Spec files updated: `02-architecture.md`, `08-open-decisions.md`.

**Affected files**: `02-architecture.md`, `08-open-decisions.md`

### 18. ~~Submission Signing/Authenticity Path Is Missing~~ RESOLVED

`posting_pubkey` existed without a corresponding `signature` field, meaning anyone could claim any pubkey.

**Resolution**:
- **Decision**: Option A — add `signature` field and verification step.
- `09-event-and-api-spec.md`: added `signature` (Ed25519 by `posting_pubkey` over canonical body serialization) to `review_submission_v1`. Added `invalid_signature` reject code.
- `02-architecture.md`: added signature verification as step 1 in the verification pipeline (before schema validation). Pipeline now has 9 steps.
- Signature verification is cheap, prevents content tampering, and provides authenticity independent of ZK proof validity.
- Spec files updated: `09-event-and-api-spec.md`, `02-architecture.md`.

**Affected files**: `09-event-and-api-spec.md`, `02-architecture.md`

### 19. ~~Cohort-Root Endpoint Contract Out of Sync With Time-Window Policy~~ RESOLVED

`11-time-window-policy.md` defined an expanded cohort-root endpoint response, but `09-event-and-api-spec.md` (the canonical API owner) didn't include the time-window fields.

**Resolution**:
- **Decision**: Option A — merged all time-window fields into `09-event-and-api-spec.md` as the canonical contract.
- `09-event-and-api-spec.md`: cohort-root endpoint now returns `time_window_id`, `time_window_policy`, `window_start`, `window_end`, `receipt_volume_bucket`, `k_min`, `t_min` alongside `distance_roots`.
- `11-time-window-policy.md`: replaced inline endpoint definition with reference to `09-event-and-api-spec.md` as canonical. Kept `receipt_volume_bucket` mapping (domain-specific detail owned by time-window policy).
- Spec files updated: `09-event-and-api-spec.md`, `11-time-window-policy.md`.

**Affected files**: `09-event-and-api-spec.md`, `11-time-window-policy.md`

## Medium

### 8. ~~Epoch ID Computation/Verification Gap~~ RESOLVED

`02-architecture.md` defines:
```
epoch_id = hash(subject_id || iso_week)
```

But `09-event-and-api-spec.md` treated `epoch_id` as a simple `string` submitted by the client. If `epoch_id` is deterministically derived, the verifier should **recompute** it from `subject_id` and current time rather than trusting the client's value. A malicious client could submit a forged `epoch_id` to:

- Reuse a nullifier from a different epoch
- Submit a review against an epoch where the root was different

The spec didn't say whether the gateway recomputes and compares, or trusts the submitted `epoch_id`.

**Resolution**:
- **Decision**: Option A — `epoch_id` is server-derived only (no top-level client `epoch_id` field).
- `09-event-and-api-spec.md` now removes top-level `epoch_id` from `review_submission_v1` and adds `invalid_epoch_context` reject code.
- `09-event-and-api-spec.md` `GET /v1/subjects/{subject_id}/cohort-root` now returns authoritative `epoch_id` as read-only policy context for proof construction.
- `03-proof-spec.md` admission pseudocode now derives authoritative `epoch_id` server-side and rejects mismatches between derived `epoch_id` and proof public input.
- `02-architecture.md` now states `epoch_id` is server-authoritative and enforced in the verification pipeline.

**Affected files**: `02-architecture.md`, `09-event-and-api-spec.md`, `03-proof-spec.md`

### 9. ~~`proof_version` Location Inconsistency~~ RESOLVED

In `09-event-and-api-spec.md`, `proof_version` is a **top-level field** on `review_submission_v1`. But it describes a property of the proof, so it arguably belongs inside `proof_bundle`. This matters for validation ordering: the gateway needs to know the proof version before it can interpret the bundle contents, but schema validation of the top-level event shouldn't depend on proof-specific versioning.

**Resolution**:
- **Decision**: Option A — keep `proof_version` top-level on `review_submission_v1`.
- **Rationale**: The gateway must gate by version before interpreting `proof_bundle`; top-level placement allows early routing/rejection without bundle-specific parsing logic.
- **Normative rule**: `proof_bundle` does not include `proof_version`. Verifier checks `proof_version` before bundle unpack/verification and returns `unsupported_proof_version` when unsupported.
- Spec files updated: `09-event-and-api-spec.md`, `03-proof-spec.md`.

**Affected files**: `09-event-and-api-spec.md`, `03-proof-spec.md`

### 10. ~~Verification Pipeline Step Count Mismatches~~ RESOLVED

- `02-architecture.md` lists **8 steps** in the verification pipeline (including "Admit or reject")
- `03-proof-spec.md` admission pseudocode has **7 logical checks**
- `09-event-and-api-spec.md` lists **8 reject codes**

The reject code `unsupported_proof_version` has no corresponding explicit step in the verification pipeline of `02-architecture.md`. Version validation is only mentioned in step 1 as part of "schema and version" but the reject code treats it as distinct from `invalid_schema`. These three documents should agree on the exact verification sequence.

**Affected files**: `02-architecture.md`, `03-proof-spec.md`, `09-event-and-api-spec.md`

**Resolution**:
- **Decision**: Option A — single canonical verification pipeline with 1:1 step-to-reject-code mapping.
- `02-architecture.md`: pipeline rewritten as 10 verification steps + admit/reject outcome. Split "schema and version" into separate steps (2 and 3). Moved `k_min` check from step 9 to step 6 (cheap metadata check before expensive ZK verifications). Each step now shows its corresponding reject code. Pipeline header references `03-proof-spec.md` as canonical pseudocode and `09-event-and-api-spec.md` for reject codes.
- `09-event-and-api-spec.md`: reject codes reordered to match pipeline step sequence. Added header noting the ordering correspondence.
- `03-proof-spec.md`: no changes needed — pseudocode was already correct and served as the reference for the alignment.
- Spec files updated: `02-architecture.md`, `09-event-and-api-spec.md`.

### 11. ~~Receipt Expiration vs. Epoch Boundary Interaction~~ RESOLVED

`08-open-decisions.md` lists receipt expiration as open. But this interacts with epochs in ways that need protocol-level resolution:

- If a receipt expires before the epoch ends, can a user still submit a review?
- If receipts outlive epochs, can a stale receipt be used in a new epoch?
- Does the receipt carry its own timestamp that the TimeBlind proof must cover, or is receipt validity independent of time window proofs?

These are not independent policy knobs -- they interact with each other and with the nullifier scope.

**Affected files**: `08-open-decisions.md`, `03-proof-spec.md`, `12-receipt-spec.md`

**Resolution**:
- **Decision**: Option A — receipt expiration is emergent from the time-window + keyset system, not a separate policy knob.
- **Expiration**: A receipt is usable as long as its keyset period falls within an open time window for the subject. No separate timer needed.
- **Cross-epoch reuse**: Blocked by the one-receipt-one-review rule (`receipt_hash` in spent-receipts table), which is epoch-independent. Same receipt can never be used twice regardless of epoch boundaries.
- **Temporal binding**: The keyset period is the receipt's temporal binding for the time-window proof. Already specified in `12-receipt-spec.md` temporal binding flow.
- **Nullifier vs. spent-receipt complementarity**: Nullifier prevents same identity re-reviewing in same epoch (even with different receipts). Spent-receipt prevents same receipt reuse (even across epochs or identities).
- `12-receipt-spec.md`: added "Receipt Expiration and Epoch Interaction" section documenting expiration rule, cross-epoch behavior, and time-window proof interaction. Removed receipt expiration from open items.
- `08-open-decisions.md`: closed receipt expiration policy decision with reference to `12-receipt-spec.md`.
- `03-proof-spec.md`: no changes needed — `verify_interaction(bundle)` delegates to receipt spec.
- Spec files updated: `12-receipt-spec.md`, `08-open-decisions.md`.

### 12. No Technology Stack Specified

The entire spec is technology-agnostic. Semaphore v4 is TypeScript/Circom. Cashu implementations exist in TypeScript, Python, and Rust. Nostr libraries span multiple languages. These choices cascade: if the proof engine must run in-browser (local proving default), that constrains the stack to what compiles to WASM. This should be locked before implementation.

**Affected files**: `04-implementation-plan.md`, `08-open-decisions.md`

### 13. Nostr WoT Ingestion Rules Are Underspecified (Replaceable Event Semantics)

`04-implementation-plan.md` says to ingest Nostr follow data, but does not define the event-resolution rules for contact lists.

Nostr contact lists are replaceable events; the latest valid event for an author should replace prior values. If the indexer unions historical lists instead of applying replace semantics, cohort roots become non-deterministic and can diverge across nodes.

**Resolution needed**: Specify Nostr ingestion semantics precisely (replaceability, conflict resolution, relay variance handling) and enforce deterministic root build rules from that normalized graph.

**Affected files**: `04-implementation-plan.md`, `02-architecture.md`

### 14. Timestamp Privacy Goal Conflicts With Exact Submission Timestamp Field

The spec emphasizes time privacy ("windowed, not exact"), but `09-event-and-api-spec.md` includes exact `created_at` in submission events.

Even if interaction timestamps are protected in proofs, exact submission and publication timestamps can still support correlation attacks (for example, tying user network activity to review appearance).

**Resolution needed**: Define timestamp exposure policy end-to-end: what is rounded or bucketed, what is never exposed externally, and whether API responses return coarse publish buckets instead of exact times.

**Affected files**: `09-event-and-api-spec.md`, `02-architecture.md`, `06-trust-model-and-risk-mitigation.md`

## Solution Options by Issue

### 1. ~~"NullReview" and "TimeBlind" Don't Exist as Real Projects~~ RESOLVED

**Decision**: Option A externally (real dependency names), Option B internally (module aliases).

- NullReview → `@semaphore-protocol/*` (Semaphore v4)
- TimeBlind → custom Circom circuit (`LessEqThan(32)` from `circomlib/comparators.circom`)
- Full time-window policy (adaptive windows, `t_min`, batch release) specified in `11-time-window-policy.md`

### 2. ~~Nullifier Construction Doesn't Match Semaphore v4~~ RESOLVED

**Decision**: Option A — use Semaphore as-is with scope packing.

- `scope = Poseidon(domain_tag, subject_id, epoch_id)` (all BN254 scalar field elements)
- `nullifier = Poseidon(identity_secret, scope)` (Semaphore v4 native)
- Verifier recomputes `scope` from known public values
- Reuses Semaphore v4's existing trusted setup ceremony

### 3. ~~`max_distance` Filter Is Architecturally Impossible With Anonymous Reviews~~ RESOLVED

**Decision**: Option B — distance-bucketed cohort roots with membership proof at submission time. Distance bucket stored on review at admission; `max_distance` filter queries stored metadata. Preserves both anonymity and WoT distance filtering.

### 4. ~~`cohort_size` Client Trust -- Security Gap~~ RESOLVED

**Decision**: Option A — removed `cohort_size` from client-submitted proof bundle. Verifier always uses server-side `k_size` from roots table. No client input trusted for `k_min` enforcement.

### 5. ~~Cashu Interaction Receipt Issuance Flow Is Undefined~~ RESOLVED

**Decision**: Drop Cashu, use blind signatures directly. Full receipt lifecycle specified in `12-receipt-spec.md`: issuer identity, issuance flow, subject/reviewer binding, one-receipt-one-review spend semantics, keyset rotation for temporal binding, and privacy properties.

### 6. ~~Trusted Setup Requirement Not Properly Acknowledged~~ RESOLVED

**Decision**: Option A — use unmodified Semaphore circuits and existing ceremony artifacts. Enabled by resolving Issue 2 with scope packing (no circuit modifications needed).

### 7. ~~RISC Zero Remote Proving Section Is Dated~~ RESOLVED

**Decision**: Hybrid of Options A and B — kept the evaluation doc (it's useful context for post-MVP) but updated Bonsai reference to note deprecation and aligned all naming with current stack terminology.

### 8. ~~Epoch ID Computation/Verification Gap~~ RESOLVED

**Decision**: Option A — `epoch_id` is server-derived only. Removed top-level client `epoch_id`; gateway derives and enforces authoritative epoch context and rejects mismatches with `invalid_epoch_context`.

### 9. ~~`proof_version` Location Inconsistency~~ RESOLVED

**Decision**: Option A — `proof_version` remains top-level, and the gateway version-gates before parsing `proof_bundle`.

### 10. ~~Verification Pipeline Step Count Mismatches~~ RESOLVED

**Decision**: Option A — single canonical pipeline (10 verification steps, 10 reject codes, 1:1 mapping). Pseudocode in `03-proof-spec.md` is the canonical source; `02-architecture.md` pipeline and `09-event-and-api-spec.md` reject codes aligned to match.

### 11. ~~Receipt Expiration vs. Epoch Boundary Interaction~~ RESOLVED

**Decision**: Option A (refined) — receipt expiration is emergent from time-window + keyset system. No separate expiration timer. Cross-epoch reuse blocked by epoch-independent spent-receipts table. Nullifier and spent-receipt checks are complementary. See `12-receipt-spec.md` "Receipt Expiration and Epoch Interaction."

### 12. No Technology Stack Specified

Option A (TypeScript/Circom-first):
- Web/client/gateway/indexer: TypeScript
- ZK circuits: Circom + Semaphore packages + custom time-window circuit
- Proof tooling: `snarkjs`/WASM-compatible client proving path
- Data: Postgres for roots/reviews/nullifiers

Option B (Rust-first):
- Core services/provers in Rust, custom integrations for Nostr/Cashu/Semaphore interoperability

Recommended:
Option A for closest fit with Semaphore ecosystem and browser-local proving goals.

### 13. Nostr WoT Ingestion Rules Are Underspecified (Replaceable Event Semantics)

Option A:
Specify deterministic reducer:
- signature-valid events only
- replaceable-kind semantics (latest event per author)
- deterministic tie-break rules
- normalized graph snapshot hash included with each cohort root

Option B:
Outsource graph resolution to third-party indexer.

Recommended:
Option A to keep trust and reproducibility in-house.

### 14. Timestamp Privacy Goal Conflicts With Exact Submission Timestamp Field

Option A:
Keep exact `submitted_at` internal only and expose public `publish_bucket` timestamps.

Option B:
Expose exact timestamps publicly and rely only on delayed publishing.

Option C:
Expose coarse timestamps with randomized jittered publication schedule.

Recommended:
Option A plus Option C for stronger linkage resistance.

### 15. ~~Admission/Publication Lifecycle Is Contradictory~~ RESOLVED

**Decision**: Option A — three-state lifecycle (`rejected` / `admitted` / `published`). Gateway returns `status: "admitted"` with `held_reason` on success. Batch release job transitions `admitted` → `published` at window close when `t_min` met. No max hold duration — window merging is the escape valve, and pre-submission disclosure warns the reviewer.

### 16. ~~Time-Window Proof Inputs Don't Match API/Proof Schema~~ RESOLVED

**Decision**: Option A — `window_start` and `window_end` added to public inputs and proof bundle. Verifier checks submitted values match server's authoritative bounds for `time_window_id` before ZK verification.

### 17. ~~Window Authority Conflicts Across Docs~~ RESOLVED

**Decision**: Option A — system-assigned windows per `11-time-window-policy.md`. Client receives (not selects) the window. Open decision closed.

### 18. ~~Submission Signing/Authenticity Path Is Missing~~ RESOLVED

**Decision**: Option A — `signature` field added (Ed25519 by `posting_pubkey`). Signature verification is step 1 in the pipeline with `invalid_signature` reject code.

### 19. ~~Cohort-Root Endpoint Contract Out of Sync With Time-Window Policy~~ RESOLVED

**Decision**: Option A — single canonical endpoint in `09-event-and-api-spec.md` with all fields needed for proof construction. `11-time-window-policy.md` references the canonical spec.

### 20. ~~Receipt Issuance Pipeline Missing From Execution Docs~~ RESOLVED

**Decision**: Add full receipt issuance pipeline (issuer endpoint, keyset management, issuer registry, spent-receipts store) as explicit deliverables in `04-implementation-plan.md` and `05-sprint-plan.md`. Added receipt pipeline step to `README.md` Build Sequence.
