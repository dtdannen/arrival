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

### 16. Time-Window Proof Inputs Don't Match API/Proof Schema

`11-time-window-policy.md` defines three public inputs for the time-window circuit:

1. `time_window_id`
2. `window_start` (unix timestamp)
3. `window_end` (unix timestamp)

The circuit literally requires `window_start` and `window_end` to perform the range check (`LessEqThan(32): window_start <= t` and `t <= window_end`).

But `03-proof-spec.md` public inputs only list `time_window_id`, and `09-event-and-api-spec.md` `proof_bundle` fields only include `time_window_id`. Neither carries `window_start` or `window_end`.

Without these values in the proof bundle and public inputs, the circuit cannot be verified. The verifier needs the public inputs that were used during proving.

**Resolution needed**: Add `window_start` and `window_end` to both `03-proof-spec.md` public inputs and `09-event-and-api-spec.md` `proof_bundle` fields. The verifier must also confirm these match the server's authoritative window bounds for the given `time_window_id`.

**Affected files**: `03-proof-spec.md`, `09-event-and-api-spec.md`, `11-time-window-policy.md`

## High

### 5. Cashu Interaction Receipt Issuance Flow Is Undefined

The spec treats Cashu blind signatures as proof-of-interaction receipts, but Cashu is an **ecash protocol** designed for payments, not for proving you visited a business or purchased a product. Key gaps:

- **Who is the "mint"/issuer?** The business itself? A third party? A payment processor? `08-open-decisions.md` lists "accepted issuer governance" as open, but this is architecturally foundational, not a detail to defer.
- **How does a blind signature prove interaction?** Cashu proves you received a token from a mint. It doesn't inherently prove you visited a physical location or purchased something. The spec never explains the actual issuance trigger or flow.
- **No reviewer-binding rule is defined**: possession of a valid token is not the same as "this reviewer interacted." Without an explicit binding mechanism (for example, spend conditions tied to reviewer-controlled keys), receipt transferability weakens the interaction claim.
- **Privacy tradeoff not acknowledged**: If a user reveals a DLEQ proof to contest a receipt, it breaks unlinkability. This is documented in Cashu's own protocol spec but not mentioned in `06-trust-model-and-risk-mitigation.md`.
- **One receipt, one review**: `08-open-decisions.md` lists edge cases (refunds, chargebacks, disputes) but the core question -- how does a receipt get bound to a subject in the first place -- is never answered.

**Resolution needed**: Define the complete receipt lifecycle: who issues, what triggers issuance, how it binds to a subject and reviewer, and how the blind signature scheme maps to "proof of interaction."

**Affected files**: `02-architecture.md`, `03-proof-spec.md`, `06-trust-model-and-risk-mitigation.md`, `08-open-decisions.md`

### 6. ~~Trusted Setup Requirement Not Properly Acknowledged~~ RESOLVED

`06-trust-model-and-risk-mitigation.md` previously hedged with "if using setup-based proving," treating the trusted setup as optional.

**Resolution**:
- **Decision**: Option A — use unmodified Semaphore v4 circuits and existing Groth16 ceremony artifacts.
- This was made possible by resolving Issue 2 with scope packing instead of a custom nullifier circuit. Since we don't modify Semaphore's circuits, we reuse its ceremony directly.
- `06-trust-model-and-risk-mitigation.md` updated to state the trusted setup dependency explicitly and reference Semaphore v4's 400+ participant ceremony. "If" hedging removed.

### 7. RISC Zero Remote Proving Section Is Dated

`07-risc0-evaluation.md` references a "Boundless/Bonsai ecosystem" for remote proving. Current Boundless docs state Bonsai was deprecated and retired on **December 1, 2025**.

This does not change the MVP decision to defer RISC Zero as primary, but it does make the remote-prover subsection factually outdated and can cause wrong stack assumptions if used for planning.

**Resolution needed**: Update the RISC Zero evaluation text to remove Bonsai as an active option and align all remote proving references with current Boundless documentation.

**Affected files**: `07-risc0-evaluation.md`

### 17. Window Authority Conflicts Across Docs

Three documents give contradictory answers about who determines time windows and what sizes are available:

- `02-architecture.md` step 4: "Client **selects** time window and constructs TimeBlind witness."
- `11-time-window-policy.md`: "Time windows are **system-calculated and uniform per subject**. All reviewers for a given subject in a given period use the same window. Per-reviewer window variation is not allowed."
- `08-open-decisions.md` lists window options as "weekly only" or "weekly + monthly" (two sizes).
- `11-time-window-policy.md` window size table includes four sizes: weekly, biweekly, monthly, and quarterly.

These can't all be true. Either the client selects a window or the system assigns one. Either there are two window sizes or four.

**Resolution needed**: Align all docs on window authority (system-assigned, per `11-time-window-policy.md`) and available window sizes. Update `02-architecture.md` submission flow and close the relevant open decision in `08-open-decisions.md`.

**Affected files**: `02-architecture.md`, `08-open-decisions.md`, `11-time-window-policy.md`

### 18. Submission Signing/Authenticity Path Is Missing

`04-implementation-plan.md` step 3 lists "proof bundle packaging and signing" as a deliverable. The README references a "one-time review posting key" model. But:

- `09-event-and-api-spec.md` has `posting_pubkey` as a field but no `signature` field.
- `02-architecture.md` verification pipeline has no signature verification step.

A `posting_pubkey` without a corresponding signature proves nothing — anyone could submit a review claiming any pubkey. The gateway has no way to verify that the submitter controls the claimed posting key. This is needed to prevent review content tampering and replay of someone else's proof bundle with different content.

**Resolution needed**: Add a `signature` field to the submission event (signed by `posting_pubkey` over the review content and proof bundle). Add a signature verification step to the verification pipeline.

**Affected files**: `09-event-and-api-spec.md`, `02-architecture.md`, `04-implementation-plan.md`

### 19. Cohort-Root Endpoint Contract Out of Sync With Time-Window Policy

`11-time-window-policy.md` defines an expanded cohort-root endpoint response with fields needed for the time-window proof flow:

```
time_window_id, time_window_policy, window_start, window_end,
receipt_volume_bucket, k_min, t_min
```

But `09-event-and-api-spec.md` `GET /v1/subjects/{subject_id}/cohort-root` only returns:

```
active root hash, cohort size, validity window, proof policy metadata (k_min, allowed windows)
```

The client cannot construct a valid time-window proof without `window_start`, `window_end`, and `time_window_id` from the server. The pre-submission disclosure flow (showing the reviewer their anonymity set size) also requires `receipt_volume_bucket` and `t_min`.

**Resolution needed**: Backport the expanded endpoint response from `11-time-window-policy.md` into `09-event-and-api-spec.md` as the canonical contract.

**Affected files**: `09-event-and-api-spec.md`, `11-time-window-policy.md`

## Medium

### 8. Epoch ID Computation/Verification Gap

`02-architecture.md` defines:
```
epoch_id = hash(subject_id || iso_week)
```

But `09-event-and-api-spec.md` treats `epoch_id` as a simple `string` submitted by the client. If `epoch_id` is deterministically derived, the verifier should **recompute** it from `subject_id` and current time rather than trusting the client's value. A malicious client could submit a forged `epoch_id` to:

- Reuse a nullifier from a different epoch
- Submit a review against an epoch where the root was different

The spec doesn't say whether the gateway recomputes and compares, or trusts the submitted `epoch_id`.

**Resolution needed**: Specify that the gateway independently computes `epoch_id` and rejects submissions where the client-provided value doesn't match.

**Affected files**: `02-architecture.md`, `09-event-and-api-spec.md`, `03-proof-spec.md`

### 9. ~~`proof_version` Location Inconsistency~~ RESOLVED

In `09-event-and-api-spec.md`, `proof_version` is a **top-level field** on `review_submission_v1`. But it describes a property of the proof, so it arguably belongs inside `proof_bundle`. This matters for validation ordering: the gateway needs to know the proof version before it can interpret the bundle contents, but schema validation of the top-level event shouldn't depend on proof-specific versioning.

**Resolution**:
- **Decision**: Option A — keep `proof_version` top-level on `review_submission_v1`.
- **Rationale**: The gateway must gate by version before interpreting `proof_bundle`; top-level placement allows early routing/rejection without bundle-specific parsing logic.
- **Normative rule**: `proof_bundle` does not include `proof_version`. Verifier checks `proof_version` before bundle unpack/verification and returns `unsupported_proof_version` when unsupported.
- Spec files updated: `09-event-and-api-spec.md`, `03-proof-spec.md`.

**Affected files**: `09-event-and-api-spec.md`, `03-proof-spec.md`

### 10. Verification Pipeline Step Count Mismatches

- `02-architecture.md` lists **8 steps** in the verification pipeline (including "Admit or reject")
- `03-proof-spec.md` admission pseudocode has **7 logical checks**
- `09-event-and-api-spec.md` lists **8 reject codes**

The reject code `unsupported_proof_version` has no corresponding explicit step in the verification pipeline of `02-architecture.md`. Version validation is only mentioned in step 1 as part of "schema and version" but the reject code treats it as distinct from `invalid_schema`. These three documents should agree on the exact verification sequence.

**Affected files**: `02-architecture.md`, `03-proof-spec.md`, `09-event-and-api-spec.md`

### 11. Receipt Expiration vs. Epoch Boundary Interaction

`08-open-decisions.md` lists receipt expiration as open. But this interacts with epochs in ways that need protocol-level resolution:

- If a receipt expires before the epoch ends, can a user still submit a review?
- If receipts outlive epochs, can a stale receipt be used in a new epoch?
- Does the receipt carry its own timestamp that the TimeBlind proof must cover, or is receipt validity independent of time window proofs?

These are not independent policy knobs -- they interact with each other and with the nullifier scope.

**Affected files**: `08-open-decisions.md`, `03-proof-spec.md`

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

### 5. Cashu Interaction Receipt Issuance Flow Is Undefined

Option A:
Keep Cashu and define full lifecycle:
- issuer role (who mints)
- issuance trigger (what event proves interaction)
- subject binding (`subject_id` commitment in receipt payload)
- reviewer binding (spend condition tied to reviewer-controlled key)
- one-receipt-one-review spend semantics

Option B:
Replace Cashu with direct signed interaction attestations (non-ecash), then prove attestation validity in-circuit or verifier.

Recommended:
Option A if anonymity-preserving transferable-token model is desired; Option B if simpler attestation flow is preferred over ecash complexity.

### 6. ~~Trusted Setup Requirement Not Properly Acknowledged~~ RESOLVED

**Decision**: Option A — use unmodified Semaphore circuits and existing ceremony artifacts. Enabled by resolving Issue 2 with scope packing (no circuit modifications needed).

### 7. RISC Zero Remote Proving Section Is Dated

Option A:
Update docs to current Boundless-only remote proving references.

Option B:
Remove remote RISC Zero references entirely from MVP docs because RISC Zero is deferred.

Recommended:
Option B for MVP docs; keep Option A in post-MVP evaluation notes.

### 8. Epoch ID Computation/Verification Gap

Option A:
Make `epoch_id` server-derived only; client omits it.

Option B:
Client sends `epoch_id` as hint, gateway recomputes and rejects mismatches.

Recommended:
Option A for minimal ambiguity.

### 9. ~~`proof_version` Location Inconsistency~~ RESOLVED

**Decision**: Option A — `proof_version` remains top-level, and the gateway version-gates before parsing `proof_bundle`.

### 10. Verification Pipeline Step Count Mismatches

Option A:
Define a single canonical verification state machine with one reject code per step.

Option B:
Keep separate docs but link each reject code to explicit pipeline step IDs.

Recommended:
Option A and generate all docs from the same canonical checklist/table.

### 11. Receipt Expiration vs. Epoch Boundary Interaction

Option A:
Policy: receipt has explicit validity interval and can be used exactly once; proof/verifier enforce both receipt validity and epoch policy.

Option B:
Policy: receipt validity ignored once issued; epoch/nullifier only enforce freshness.

Recommended:
Option A for predictable replay and stale-receipt handling.

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

### 16. Time-Window Proof Inputs Don't Match API/Proof Schema

Option A:
Add `window_start` and `window_end` to `03-proof-spec.md` public inputs and to `09-event-and-api-spec.md` `proof_bundle` fields. Verifier confirms submitted values match server's authoritative window bounds for the `time_window_id`.

Option B:
Verifier derives `window_start` and `window_end` from `time_window_id` server-side (never sent by client). Client still needs them for proof generation but gets them from the cohort-root endpoint.

Recommended:
Option A. The values are already public inputs to the circuit — they must be available to the verifier for proof verification. Sending them in the bundle is explicit and verifiable.

### 17. Window Authority Conflicts Across Docs

Option A:
Align all docs to system-assigned windows per `11-time-window-policy.md`. Update `02-architecture.md` step 4 to say client *receives* (not selects) the window. Close the window policy open decision in `08-open-decisions.md` with the four-tier adaptive scheme.

Option B:
Revert to client-selected windows from a fixed menu (weekly/monthly only). Simpler but loses the adaptive anonymity protection.

Recommended:
Option A. System-assigned windows are a core privacy property — letting clients choose fragments the anonymity set.

### 18. Submission Signing/Authenticity Path Is Missing

Option A:
Add `signature` field to `review_submission_v1` (Ed25519 signature by `posting_pubkey` over canonical serialization of content + proof bundle). Add signature verification as step 0 in the verification pipeline (before schema validation of proof contents).

Option B:
Remove `posting_pubkey` entirely and rely solely on proof bundle integrity (the ZK proof itself authenticates the submission). No separate signature needed if the proof binds to the content.

Recommended:
Option A. Signature verification is cheap, prevents content tampering, and provides a clear authenticity chain independent of proof validity. Option B is viable but couples content integrity to ZK verification ordering.

### 19. Cohort-Root Endpoint Contract Out of Sync With Time-Window Policy

Option A:
Update `09-event-and-api-spec.md` cohort-root endpoint to match `11-time-window-policy.md`'s expanded response. Make `11-time-window-policy.md` reference the canonical API spec rather than defining its own.

Option B:
Split into two endpoints: cohort-root (membership data) and time-window-policy (window/receipt data). Keeps concerns separate.

Recommended:
Option A for MVP simplicity. A single endpoint gives the client everything needed for proof construction in one call.
