# Implementation Plan (Step-by-Step)

## Step 0: Lock Decisions and Interfaces

Deliverables:

1. Freeze proof stack for MVP
2. Freeze verification policy defaults (`k_min`, epoch, window rules)
3. Freeze schema for review + proof bundle

Exit criteria:

1. All fields versioned
2. Reject codes documented

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

1. Define accepted receipt issuers/keys
2. Implement receipt parser + verifier
3. Add replay and malformed-input protections

Deliverables:

1. `receipt-verifier` module
2. receipt verification API

Exit criteria:

1. Valid receipts pass
2. malformed/forged receipts fail

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
