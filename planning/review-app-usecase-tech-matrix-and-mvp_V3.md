# Review App Plan V3: ZK-First Prototype (High Anonymity + WoT)

## Goal

Build a first prototype that guarantees:

1. High reviewer anonymity
2. Web-of-Trust (WoT) based trust filtering
3. Proof that reviewer actually interacted with the business/service

This V3 plan is intentionally **ZK-only for anonymity proofs** (no ring-signature path in prototype scope).

## Product Lane

Consumer / local-business review app.

## Non-Negotiable Requirements

1. `TimeBlind` is required (no exact interaction timestamps in published proofs).
2. `k-anonymity minimum` is required (do not publish individual reviews below threshold).
3. One-review-per-context is enforced via ZK nullifier.
4. Reviewer identity key is never used directly as review posting identity.

## Core Technical Stack (Prototype)

1. `Nostr keys` for persistent user identity and WoT graph participation.
2. `Nostr WoT` for graph-based trust cohorts.
3. `Semaphore/NullReview` style ZK membership proof + nullifier.
4. `Cashu/blind-signature receipt proof` for proof-of-interaction.
5. `TimeBlind` range proof for temporal privacy.

## High-Level Flow

1. User has persistent Nostr identity (for WoT only).
2. System builds WoT cohort for target context (business/product/region).
3. User receives interaction receipt token (Cashu or blind-signed token).
4. User generates one proof bundle:
   - membership in approved WoT cohort
   - valid interaction receipt
   - interaction time within allowed window (not exact time)
   - nullifier scoped to `(subject_id, epoch)`
5. User posts review under one-time key with proof bundle.
6. Verifier accepts only if:
   - all proofs verify
   - nullifier unused
   - cohort size >= `k_min`

## Prototype Constraints and Defaults

1. `k_min`: 50 (prototype default; configurable).
2. `epoch`: weekly by default (`subject_id + week_number`).
3. `time window`: week or month buckets only.
4. If `k < k_min`: keep review private/deferred or aggregate-only mode.
5. No deanonymizing admin controls in prototype.

## MVP V3 Scope

### In scope

1. WoT cohort builder service (bounded depth, cached graph expansion).
2. Merkle root publication for cohort membership.
3. ZK proof generation in client (or delegated prover service for prototype).
4. Receipt verification path (Cashu/blind token verification).
5. TimeBlind proof verification.
6. Nullifier dedupe store.
7. Review feed with filters:
   - WoT distance policy
   - verified interaction badge
   - anonymity set size badge

### Out of scope

1. Ring signatures
2. Stake-weighted economics
3. Homomorphic encrypted rating aggregates
4. Full auditproof aggregation layer
5. Cross-service portable reputation credentials
6. Mobile-native proving optimization (can be staged after prototype)

## Security and Privacy Model (Prototype)

### Protect against

1. Business retaliation via direct identity linkage
2. Duplicate reviews by same reviewer in same epoch/context
3. Simple timing correlation attacks
4. Fake reviews without real interaction

### Residual risks

1. Very small cohorts (mitigated by `k_min` hard gate)
2. Side-channel leakage (network metadata, writing style)
3. WoT graph poisoning attacks (needs follow-up defenses)
4. Trusted setup / proving infra trust assumptions (if applicable to chosen proving system)

## Architecture Components

1. `woT-indexer`
   - pulls follow graph
   - computes cohort
   - builds Merkle tree
   - publishes root + metadata
2. `receipt-verifier`
   - validates Cashu/blind-signed interaction proofs
3. `zk-verifier`
   - verifies membership proof, time proof, nullifier derivation constraints
4. `review-relay-gateway`
   - admission control for proof-valid reviews only
5. `nullifier-store`
   - rejects duplicate nullifier for same `(subject_id, epoch)`

## Suggested Build Sequence

1. Stand up WoT cohort + Merkle root pipeline.
2. Integrate Semaphore/NullReview membership proof path.
3. Add receipt proof validation (Cashu/blind-signature token).
4. Add TimeBlind proof and enforce window policies.
5. Add nullifier dedupe and epoch scoping.
6. Ship prototype review UI and verifier badges.

## Prototype Success Criteria

1. 100% of displayed reviews include valid ZK membership proof.
2. 100% of displayed reviews include valid interaction proof.
3. 100% of displayed reviews satisfy time-window privacy rule.
4. 0 duplicate reviews accepted for same nullifier scope.
5. No individual review published when `k < k_min`.

## Open Decisions for Team Review

1. Proving stack choice for prototype:
   - Semaphore default circuits vs custom circuit composition
2. `k_min` final value:
   - 50 baseline vs 100 for stricter anonymity
3. Epoch size:
   - weekly vs monthly
4. Prover location:
   - local client proving vs delegated proving service in prototype
5. Initial vertical:
   - beauty product reviews vs local business services

## Recommended Immediate Next Step

Turn this V3 into a technical spec with:

1. exact proof inputs/outputs
2. event schema for review + proof bundle
3. verification policy table (accept/reject reasons)
4. milestone plan for a 2-3 week prototype sprint
