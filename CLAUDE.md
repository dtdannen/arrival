# Arrival — Agent Instructions

## What This Is

Anonymous, cryptographically verified review system built on Nostr Web of Trust. Zero-knowledge proofs ensure reviewers can't be identified or retaliated against. Every published review proves: WoT membership, real interaction, recency, and uniqueness.

## Objectives

These are the product goals. Everything else serves these.

1. **High anonymity for reviewers** — reviewers cannot be identified by subjects, other users, or the system operator
2. **WoT-based trust filtering** — readers filter reviews by social graph distance (d<=1, d<=2, d<=3)
3. **Proof of real interaction** — every review is backed by a blind-signed interaction receipt
4. **Clear trust boundaries for users** — users know exactly what they're trusting and what they're not

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

1. **Nostr is the WoT source.** Non-negotiable. Nostr-specific ingestion semantics (replaceable events, relay variance, deterministic resolution) must be fully specified.
2. **Interaction receipts use blind signatures.** The goal is "prove the reviewer interacted with the subject without revealing reviewer identity." Blind signatures provide issuer unlinkability: the issuer signs a blinded value at interaction time and cannot link it to the unblinded receipt presented at review time. See `12-receipt-spec.md` for the full lifecycle.
3. **One canonical spec per domain.** Each spec file owns its domain. Other files reference, not redefine. When conflicts arise, the canonical owner wins:
   - `02-architecture.md` → components, submission flow, storage model
   - `03-proof-spec.md` → proof statements, inputs, nullifier construction, admission policy
   - `09-event-and-api-spec.md` → API endpoints, schemas, reject codes
   - `11-time-window-policy.md` → time-window circuit, adaptive windows, batch release
   - `12-receipt-spec.md` → receipt lifecycle, blind signatures, issuer binding, spend semantics
   - `06-trust-model-and-risk-mitigation.md` → trust boundaries, residual risks

## Non-Negotiable Requirements

1. **TimeBlind is mandatory** — no exact interaction timestamps in public proofs
2. **k_min anonymity threshold is mandatory** — default 50, configurable
3. **One review per subject per epoch** via nullifier
4. **Persistent identity key is never used directly to sign review posts**
5. **If `k < k_min`, submission is rejected** (`insufficient_anonymity_set`) and is not admitted, held, or published
6. **`epoch_id` is server-authoritative** — the gateway derives and enforces it, never trusting a top-level client value

### Derived Requirements (from spec)

- **`created_at` never in any API response** — internal-only field (per `09-event-and-api-spec.md`)
- **Batch release only** — reviews never published synchronously (per `11-time-window-policy.md`)
- **No witness material in logs** — identity secrets, Merkle paths, interaction timestamps (per `06-trust-model-and-risk-mitigation.md`)

## Guardian Agent

After each implementation step, the `arrival-guardian` agent reviews work against the above principles before merge. A single failure in Privacy, Client Trust, or Spec Compliance = blocked merge. See `.claude/agents/arrival-guardian.md`.

---

## Spec

The frozen spec lives in `mvp/`. Do not modify spec files. Build to spec.

**`mvp/INCONSISTENCIES.md`** documents 25 resolved spec inconsistencies with full decision rationale. When you need to understand *why* the spec says what it says — why the nullifier uses scope packing, why `interaction_proof` is raw RSA not ZK, why `created_at` is internal-only, why the pipeline has exactly 10 steps — the answer is in INCONSISTENCIES.md. Read the relevant issue before making design decisions that touch that area.

The build guide is `src/README.md`. The test spec is `src/TESTS.md`.

## Code Organization

Production code goes in `src/` with one directory per system component:

```
src/
  shared/               # Canonical types, crypto, constants — production owns these
  identity-client/      # Nostr identity, posting key derivation
  wot-indexer/          # Kind 3 ingestion, graph management
  cohort-root-publisher/ # Merkle trees per distance tier
  receipt-issuer/       # Blind signing endpoint, keyset management
  receipt-verifier/     # RSA verification, spent-receipt tracking
  proof-engine/         # Client-side proof bundle generation
  review-gateway/       # 10-step verification pipeline
  nullifier-store/      # Nullifier dedup (PostgreSQL-backed)
  review-feed-api/      # Published review serving + filters
  web-ui/               # Submission flow + verified browsing
  tests/helpers/        # Test factories + deterministic seeders (imports from src/shared/)
```

### Shared Code Ownership

Production owns canonical definitions. Tests import from production.

- `src/shared/types.ts` — canonical types (source of truth)
- `src/shared/crypto.ts` — canonical crypto utilities
- `src/shared/constants.ts` — policy defaults (k_min, t_min, reject codes, domain_tag)
- `src/tests/helpers/` — test-specific factories and deterministic seeders, imports from `src/shared/`

Worker branches never modify `src/shared/` directly. Shared code changes go through main.

## Tech Stack

- TypeScript (all services + client)
- Node.js runtime (backend)
- Circom + snarkjs (ZK circuits, WASM for browser proving)
- Semaphore v4 (`@semaphore-protocol/*`)
- `@cloudflare/blindrsa-ts` (RSABSSA per RFC 9474)
- `nostr-tools` (event parsing, Schnorr signatures, relay communication — covers identity and WoT roles described in spec)
- PostgreSQL (all persistent storage, via `docker compose` — PG container only, Node services run locally)
- Vitest (testing)
- Circom circuits in `circuits/`, compiled artifacts in `circuits/build/` (gitignored, built from source)

## Build Rules

1. **Never modify spec files** in `mvp/`. They are frozen.
2. **Tests are the source of truth.** 162 tests in `src/tests/` define expected behavior. All tests must pass at all times.
3. **Test inline implementations are reference code.** Tests contain working implementations (e.g., `verifySignature()` in test files). Production modules are written separately — do not move or remove inline test code.
4. **PostgreSQL from day one.** Use `docker compose` for local development. No SQLite, no in-memory substitutes.
5. **Feature branches per implementation step.** Branch naming: `step-N-description` (e.g., `step-1-wot-cohort-pipeline`).
6. **Use `docker compose`** (with a space), never `docker-compose`.
7. **Stubs are replaced by the step that owns them.** No step is complete until its stubs are replaced with real implementations. No `throw new Error('Not implemented')` in touched components.
8. **Never check compiled circuit artifacts into git.** Circuits in `circuits/`, builds in `circuits/build/` (gitignored).

## Protocol Decisions

These are protocol-level choices not explicitly specified in the frozen spec. They are binding — client and server must agree.

- **Canonical serialization**: `JSON.stringify` with recursively sorted keys, `signature` field excluded, encoded as UTF-8 bytes. Defined in `src/shared/crypto.ts`.
- **epoch_id derivation**: `sha256(subject_id + "||" + time_window_id)` — the `||` is a literal two-character separator. subject_id and time_window_id must not contain `||` (enforced by schema validation).

## Component-to-Spec Mapping

| Component | Primary Spec | Supporting Specs |
|-----------|-------------|-----------------|
| `identity-client` | `02-architecture.md` | `09-event-and-api-spec.md` |
| `wot-indexer` | `02-architecture.md` (Nostr Ingestion Rules) | — |
| `cohort-root-publisher` | `02-architecture.md` | `03-proof-spec.md` |
| `receipt-issuer` | `12-receipt-spec.md` | `02-architecture.md` |
| `receipt-verifier` | `12-receipt-spec.md` | `09-event-and-api-spec.md` |
| `proof-engine` | `03-proof-spec.md` | `11-time-window-policy.md`, `12-receipt-spec.md` |
| `review-gateway` | `03-proof-spec.md`, `09-event-and-api-spec.md` | `06-trust-model-and-risk-mitigation.md` |
| `nullifier-store` | `03-proof-spec.md` | `02-architecture.md` |
| `review-feed-api` | `09-event-and-api-spec.md` | `11-time-window-policy.md` |
| `web-ui` | `09-event-and-api-spec.md` | `06-trust-model-and-risk-mitigation.md` |

## Verification Pipeline (10 Steps)

Ordered cheapest-first. Each step has exactly one reject code.

| Step | Check | Reject Code |
|------|-------|-------------|
| 1 | Ed25519 signature | `invalid_signature` |
| 2 | Schema validation | `invalid_schema` |
| 3 | Proof version | `unsupported_proof_version` |
| 4 | Epoch context | `invalid_epoch_context` |
| 5 | Root active | `inactive_root` |
| 6 | k_min threshold | `insufficient_anonymity_set` |
| 7 | Membership proof (ZK) | `invalid_membership_proof` |
| 8 | Interaction receipt (RSA) | `invalid_interaction_proof` |
| 9 | Time-window proof (ZK) | `invalid_timeblind_proof` |
| 10 | Nullifier uniqueness | `duplicate_nullifier` |

## Policy Defaults

- `k_min = 50` — minimum WoT cohort size for admission
- `t_min = 20` — minimum receipts before batch release
- Adaptive time windows: weekly (100+/wk), biweekly (20-99/wk), monthly (20+/mo), quarterly (<20/mo)
- `epoch_id = hash(subject_id || time_window_id)`
