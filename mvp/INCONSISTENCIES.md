# MVP Spec Inconsistencies and Gaps

This document intentionally ignores implementation timelines and scheduling.
Focus: cryptographic/protocol correctness, stack fit, and cross-doc consistency.

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

### 3. `max_distance` Filter Is Architecturally Impossible With Anonymous Reviews

`09-event-and-api-spec.md` lists `max_distance=1|2|3` as a filter on `GET /v1/subjects/{subject_id}/reviews`. This implies the reader's WoT distance to each reviewer is computed at query time. But:

- Reviews are anonymous (posted with one-time keys)
- The architecture has no component that maps anonymous reviews back to WoT distance from the reader
- This would require either breaking anonymity or a separate ZK proof of WoT distance stored per-review

This filter as described **cannot work** without either deanonymization or additional proof infrastructure not specified anywhere. The WoT membership proof only proves the reviewer is *in* the cohort, not *how far* they are from any particular reader.

**Resolution needed**: Either remove `max_distance` filtering, or design a mechanism where WoT distance is provably attached to reviews without revealing reviewer identity (e.g., proving distance bucket in ZK at submission time).

**Affected files**: `09-event-and-api-spec.md`, `02-architecture.md`

### 4. `cohort_size` Client Trust -- Security Gap

`cohort_size` appears in two places:

- The `proof_bundle` (submitted by the client) in `09-event-and-api-spec.md`
- The `roots` table (`k_size`) in `02-architecture.md`

Which is authoritative for `k_min` enforcement? If the verifier trusts the client-submitted `cohort_size`, a malicious client could lie about cohort size to bypass the `k_min` threshold. The verifier **must** look up `k_size` from the `roots` table using the `cohort_root_hash`, not trust the client's claim.

**Resolution needed**: Specify that `cohort_size` in the proof bundle is informational only, and that `k_min` enforcement always uses the server-side `k_size` from the roots table. Or remove `cohort_size` from the client-submitted bundle entirely.

**Affected files**: `09-event-and-api-spec.md`, `02-architecture.md`, `03-proof-spec.md`

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

### 9. `proof_version` Location Inconsistency

In `09-event-and-api-spec.md`, `proof_version` is a **top-level field** on `review_submission_v1`. But it describes a property of the proof, so it arguably belongs inside `proof_bundle`. This matters for validation ordering: the gateway needs to know the proof version before it can interpret the bundle contents, but schema validation of the top-level event shouldn't depend on proof-specific versioning.

**Resolution needed**: Decide whether `proof_version` is top-level (current) or inside `proof_bundle`, and document the rationale. If top-level, the gateway should validate it before unpacking the bundle.

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

### 3. `max_distance` Filter Is Architecturally Impossible With Anonymous Reviews

Option A:
Remove `max_distance` from MVP API.

Option B:
Precompute multiple cohort roots by distance bucket (`d<=1`, `d<=2`, `d<=3`) and prove membership in one chosen bucket at submission time.

Option C:
Add reader-specific distance proofs (complex and not MVP-friendly).

Recommended:
Option A immediately, Option B only if distance filtering remains product-critical.

### 4. `cohort_size` Client Trust -- Security Gap

Option A:
Remove `cohort_size` from client-submitted proof bundle.

Option B:
Keep field for observability/UI but treat as non-authoritative; verifier always reads root metadata server-side.

Recommended:
Option A for clean trust boundaries.

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

### 9. `proof_version` Location Inconsistency

Option A:
Keep `proof_version` top-level and require gateway version gate before bundle parsing.

Option B:
Move `proof_version` inside `proof_bundle`.

Option C:
Duplicate in both places and require equality.

Recommended:
Option A for clean request routing and compatibility checks.

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
