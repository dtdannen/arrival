# Arrival MVP — Build Guide

This is the implementation reference for the Arrival MVP. The `mvp/` folder contains the frozen spec — this document distills it into what you need to build.

## What We're Building

A consumer/local-business review app where every published review is cryptographically verified: the reviewer belongs to a relevant Web of Trust cohort, interacted with the subject, and cannot be identified or retaliated against.

## Objectives

1. **High anonymity for reviewers** — reviewers cannot be identified by subjects, other users, or the system operator
2. **WoT-based trust filtering** — readers filter reviews by social graph distance (d<=1, d<=2, d<=3)
3. **Proof of real interaction** — every review is backed by a blind-signed interaction receipt
4. **Clear trust boundaries for users** — users know exactly what they're trusting and what they're not

## Decision Hierarchy

Objectives are the product goals. Design principles guide *how* we achieve them. When a principle appears to conflict with an objective, find a design that satisfies both. Never use a principle to argue away an objective.

## Design Principles

1. **Privacy and anonymity are the priority.** Choose stronger anonymity over lower computational cost.
2. **Never trust the client for security-critical values.** Server derives and verifies.
3. **Prefer removing features over compromising guarantees.**
4. **Prefer decentralization.** MVP may use centralized components, but don't close the door.
5. **Local proving is a privacy decision, not a performance decision.**
6. **Ship to real users.** This is a product, not a proof of concept.

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript (all services + client) |
| Runtime | Node.js (backend) |
| ZK Circuits | Circom (Semaphore v4 membership + custom time-window) |
| ZK Proving | snarkjs (WASM build for browser-local proving) |
| Membership Proofs | Semaphore v4 (`@semaphore-protocol/*`) — Groth16, existing ceremony |
| Blind Signatures | RSA blind signatures (RSABSSA per IETF RFC 9474) |
| Nostr | `nostr-tools` for event parsing, signatures, relay communication |
| Database | PostgreSQL (roots, reviews, nullifiers, spent-receipts, issuer registry) |
| Client | Web app with in-browser proving via snarkjs WASM |

## System Components

### 1. `identity-client`
- Manages persistent Nostr identity for WoT participation
- Derives one-time Ed25519 posting keys for review submissions

### 2. `wot-indexer`
- Ingests Nostr kind 3 (contact list) events
- Applies replaceable event semantics (latest `created_at` per author, lexicographic tie-break on event `id`)
- Queries defined relay set, unions responses, applies replace semantics
- Computes deterministic `graph_snapshot_hash` over normalized follow graph
- Outputs: `author_pubkey -> [followed_pubkeys]` map

### 3. `cohort-root-publisher`
- Builds Merkle trees per distance tier (`d<=1`, `d<=2`, `d<=3`) per subject
- Publishes roots with metadata: `root_hash`, `k_size`, `distance_bucket`, `graph_snapshot_hash`
- Rebuilds only when graph has changed

### 4. `receipt-issuer`
- Blind signing endpoint: receives blinded value `B`, returns `S_blind`
- Per-subject keyset management with temporal rotation (daily recommended)
- Keyset format: `keyset_id -> (subject_id, keyset_start, keyset_end, public_key)`

### 5. `receipt-verifier`
- RSA signature verification against issuer registry
- Keyset lookup and temporal validation
- Spent-receipts table (`receipt_hash = Hash(r)`) for one-receipt-one-review

### 6. `proof-engine`
- Client-side SDK for generating proof bundles
- Local-first (snarkjs WASM in browser), optional remote fallback with trust warning
- Produces: membership proof (Semaphore v4), interaction proof (raw receipt), timeblind proof (Circom), nullifier

### 7. `review-gateway`
- Verifies full proof bundle (10-step pipeline)
- Applies admission policy
- Returns `status: "admitted"` with `held_reason`, or `status: "rejected"` with `reject_code`

### 8. `nullifier-store`
- Tracks used nullifiers by `(subject_id, epoch_id, nullifier_hash)`
- PostgreSQL-backed

### 9. `review-feed-api`
- Serves published reviews with verification badges
- Filters: `verified_only`, `max_distance`, `time_window_id`
- Never exposes `created_at` — only `time_window_id` as timing signal

### 10. `web-ui`
- Review submission flow with pre-submission disclosure
- Verified review browsing with distance/verification badges

## Core Cryptographic Design

### Nullifier Construction

```
scope = Poseidon(domain_tag, subject_id, epoch_id)
nullifier = Poseidon(identity_secret, scope)
```

- Uses Semaphore v4's native two-input nullifier unmodified
- `domain_tag`: fixed protocol constant
- `epoch_id = hash(subject_id || time_window_id)` — unified with time window
- Verifier recomputes `scope` from known public values

### Time-Window Circuit

Custom Circom circuit using `circomlib/comparators.circom`:

```
LessEqThan(32): window_start <= t
LessEqThan(32): t <= window_end
```

- ~68 constraints total
- Private input: `interaction_timestamp` (from receipt keyset period)
- Public inputs: `time_window_id`, `window_start`, `window_end`

### Interaction Receipt (RSABSSA)

1. Client generates random secret `r`, computes `B = Blind(r)`
2. Issuer signs: `S_blind = Sign(sk, B)`
3. Client unblinds: `S = Unblind(S_blind)`
4. Client stores: `(r, S, subject_id, keyset_id)`
5. At submission: `interaction_proof = (r, S, keyset_id)` — verified by traditional RSA signature check (not ZK)

### Proof Composition (Modular)

| Proof | Type | System |
|-------|------|--------|
| Membership | ZK | Semaphore v4 Groth16 |
| Interaction | Traditional | RSA signature verification |
| TimeBlind | ZK | Custom Circom circuit |
| Uniqueness | Server-side | Nullifier dedup check |

## Epoch and Time Window Model

`epoch_id` and `time_window_id` are **unified**:

```
epoch_id = hash(subject_id || time_window_id)
```

- One review per identity per subject per time window
- Time windows are adaptive per subject based on receipt volume:

| Receipt volume | Window size |
|---------------|-------------|
| 100+ receipts/week | Weekly |
| 20-99 receipts/week | Biweekly |
| 20+ receipts/month | Monthly |
| < 20 receipts/month | Quarterly (or suppress) |

- `t_min = 20`: minimum receipts before batch release
- `k_min = 50` (default): minimum WoT cohort size for admission

## Verification Pipeline

Ordered cheapest-first. Each step maps to exactly one reject code.

| Step | Check | Reject Code |
|------|-------|------------|
| 1 | Verify Ed25519 signature | `invalid_signature` |
| 2 | Validate proof bundle schema | `invalid_schema` |
| 3 | Validate `proof_version` supported | `unsupported_proof_version` |
| 4 | Derive `epoch_id`, reject mismatch | `invalid_epoch_context` |
| 5 | Verify root exists and is active | `inactive_root` |
| 6 | Enforce `k_min` (hard reject) | `insufficient_anonymity_set` |
| 7 | Verify membership proof (ZK) | `invalid_membership_proof` |
| 8 | Verify interaction receipt (RSA) | `invalid_interaction_proof` |
| 9 | Verify time-window bounds + proof (ZK) | `invalid_timeblind_proof` |
| 10 | Check nullifier uniqueness | `duplicate_nullifier` |

If all pass: `admit()` — review stored with status `admitted` (held for batch release).

## Review Lifecycle

```
rejected  --->  (discarded, nullifier NOT consumed)
admitted  --->  (held, not visible in feed, nullifier consumed)
published --->  (batch-released at window close, visible in feed)
```

- Gateway never returns `"published"` synchronously
- Batch release: all reviews for `(subject_id, time_window)` published simultaneously in randomized order
- `t_min` must be met; if not, reviews stay held (window merging is the escape valve)

## API Endpoints

### `GET /v1/subjects/{subject_id}/cohort-root`

Returns: `distance_roots[]`, `epoch_id`, `time_window_id`, `time_window_policy`, `window_start`, `window_end`, `receipt_volume_bucket`, `k_min`, `t_min`

### `POST /v1/reviews/submit`

Input: `review_submission_v1` body
Output: verification result object (`status`, `reject_code`, `held_reason`, `verified_flags`)

### `GET /v1/subjects/{subject_id}/reviews`

Filters: `verified_only`, `max_distance`, `time_window_id`
Returns: published reviews only. Fields: `review_id`, `subject_id`, `content`, `time_window_id`, `distance_bucket`, `verification_badges`. No `created_at`.

### `GET /v1/reviews/{review_id}/verification`

Returns: proof metadata and verification status. No exact timestamps.

## Storage Model

### `roots` table
`root_id`, `subject_id`, `root_hash`, `k_size`, `distance_bucket`, `graph_snapshot_hash`, `valid_from`, `valid_to`

### `reviews` table
`review_id`, `subject_id`, `epoch_id`, `content_ref`, `proof_ref`, `distance_bucket`, `status`, `time_window_id`, `created_at` (internal only)

### `nullifiers` table
`subject_id`, `epoch_id`, `nullifier_hash`, `first_seen_at`

### `spent_receipts` table
`receipt_hash`, `subject_id`, `spent_at`

### `issuer_registry` table
`keyset_id`, `subject_id`, `keyset_start`, `keyset_end`, `public_key`, `issuer_id`

## Build Sequence

1. **Lock decisions** — freeze schemas, reject codes, policy defaults
2. **WoT cohort pipeline** — Nostr ingestion, Merkle root publication
3. **Receipt pipeline** — issuer endpoint, keyset management, verification, spent-receipt tracking
4. **Proof generation** — client-side proof engine (snarkjs WASM)
5. **Review gateway** — verification pipeline, nullifier store, admission policy
6. **Feed and UI** — submission flow, verified review browsing
7. **Hardening** — privacy logging, artifact pinning, adversarial tests

## Non-Negotiable Requirements

1. No exact interaction timestamps in public proofs (TimeBlind mandatory)
2. `k_min` anonymity threshold enforced — below-threshold submissions are hard-rejected
3. One review per subject per epoch via nullifier
4. Persistent identity key never used directly to sign review posts
5. `epoch_id` is server-authoritative
6. `created_at` is never exposed in any API response

## Spec Reference

The frozen spec lives in `mvp/`. Canonical owners:

- `mvp/02-architecture.md` — components, flows, storage
- `mvp/03-proof-spec.md` — proof statements, inputs, admission pseudocode
- `mvp/09-event-and-api-spec.md` — API contracts, schemas, reject codes
- `mvp/11-time-window-policy.md` — time-window circuit, adaptive windows, batch release
- `mvp/12-receipt-spec.md` — receipt lifecycle, RSABSSA, issuer binding
- `mvp/06-trust-model-and-risk-mitigation.md` — trust boundaries, residual risks
