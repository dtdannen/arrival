# Implementation Plan (Step-by-Step)

## Technology Stack

### Language and Runtime

- **TypeScript** for all services (gateway, indexer, publisher, feed API) and client application
- **Node.js** runtime for backend services

### ZK Circuits and Proving

- **Circom** for circuit authoring (Semaphore v4 membership circuit + custom time-window circuit)
- **snarkjs** for proof generation and verification, with WASM build for browser-local proving
- **Semaphore v4** (`@semaphore-protocol/*`) packages for membership proofs, nullifiers, and Groth16 ceremony artifacts

### Nostr Integration

- **nostr-tools** (`nostr-tools`) for Nostr event parsing, signature validation, and relay communication

### Data

- **PostgreSQL** for persistent storage (roots, reviews, nullifiers, spent-receipts, issuer registry)

### Client / UI

- Web application with in-browser proving via snarkjs WASM
- No native app for MVP

### Rationale

TypeScript/Circom-first is the natural fit because Semaphore v4's entire ecosystem is TypeScript, snarkjs compiles to WASM for browser-local proving (a design principle, not just a performance choice), and nostr-tools is the most mature Nostr library. A single language across client and server reduces integration friction for MVP.

## Step 0: Lock Decisions and Interfaces

Deliverables:

1. Freeze proof stack for MVP
2. Freeze verification policy defaults (`k_min`, epoch, window rules)
3. Freeze schema for review + proof bundle
4. Confirm technology stack selections (see above)

Exit criteria:

1. All fields versioned
2. Reject codes documented
3. Technology stack locked and documented

## Step 1: WoT Cohort Pipeline

Tasks:

1. Implement graph ingestion from Nostr follow data
2. Define cohort selection policy by subject
3. Build Merkle root generation and publication

Deliverables:

1. `wot-indexer` service
2. `cohort-root-publisher` service
3. root metadata API

Exit criteria:

1. Deterministic cohort rebuild
2. root validity intervals enforced

## Step 2: Interaction Receipt Pipeline

Tasks:

1. Implement receipt issuer endpoint (blind signing API: receives blinded value `B`, returns `S_blind`)
2. Implement per-subject keyset management with temporal rotation
3. Implement accepted issuer registry (`keyset_id → subject_id, keyset_start, keyset_end, public_key`)
4. Implement receipt verifier (signature verification, keyset lookup, temporal validation)
5. Implement spent-receipts table and one-receipt-one-review enforcement (`receipt_hash = Hash(r)`)
6. Add replay and malformed-input protections

Deliverables:

1. `receipt-issuer` service with blind signing endpoint
2. keyset management and rotation tooling
3. accepted issuer registry
4. `receipt-verifier` module
5. spent-receipts store
6. receipt issuance and verification APIs

Exit criteria:

1. End-to-end receipt flow works: blind, sign, unblind, verify
2. Keyset rotation produces new keys on schedule without breaking existing receipts
3. Receipts for wrong `subject_id` are rejected
4. Spent receipts (duplicate `receipt_hash`) are rejected
5. Malformed/forged receipts fail

## Step 3: Proof Generation Client

Tasks:

1. Implement local proving flow for membership + time + nullifier statements
2. Build optional remote proving fallback path (feature flag)
3. Add proof bundle packaging and signing

Deliverables:

1. `proof-engine` SDK
2. local proving UX flow
3. remote fallback UX with trust warning

Exit criteria:

1. End-to-end bundle generation succeeds locally on target dev machines
2. remote fallback only available when explicitly enabled

## Step 4: Review Admission Gateway

Tasks:

1. Implement verifier pipeline
2. Implement nullifier dedupe store
3. Implement reject reason mapping

Deliverables:

1. `review-gateway` service
2. `nullifier-store`

Exit criteria:

1. Duplicate nullifier is deterministically rejected
2. policy failures return stable reject codes

## Step 5: Review Feed and UI

Tasks:

1. Build submission UI
2. Build verified feed with trust/verification badges
3. Add filter controls (distance, verified interaction only)

Deliverables:

1. `web-ui` submission page
2. `web-ui` feed page

Exit criteria:

1. Verified reviews render with complete metadata
2. below-threshold reviews not individually visible

## Step 6: Security and Privacy Hardening

Tasks:

1. Implement privacy-safe logging policy
2. Add delayed/bucketed publishing
3. Pin proof/circuit verification artifacts
4. Build replay and tamper adversarial tests

Deliverables:

1. hardening checklist
2. CI checks for invalid proof vectors

Exit criteria:

1. privacy policy tests pass
2. tampered bundles consistently rejected

## Step 7: MVP Demo and Readiness

Tasks:

1. Run scripted end-to-end demo scenario
2. Capture performance baseline
3. Document known limitations

Deliverables:

1. demo runbook
2. readiness report

Exit criteria:

1. all MVP gates in `01-scope-and-success.md` pass
