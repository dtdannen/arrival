# Review App Plan V4: ZK-First Prototype + Trust Model

## Objective

Define a prototype plan for the consumer/local-business lane that prioritizes:

1. High anonymity
2. WoT-based trust filtering
3. Verified interaction proofs
4. Explicit user trust boundaries

V4 keeps the V3 ZK-first direction and adds concrete trust analysis for local vs remote proving.

## Product Direction

Consumer / local-business review app.

## Core Architecture (ZK-First)

1. `Nostr keys` for persistent identity and WoT participation
2. `Nostr WoT` for trust-graph cohort construction
3. `Semaphore/NullReview` style membership proof + nullifier
4. `Cashu/blind-signature` interaction receipt proof
5. `TimeBlind` proof (time-window, no exact timestamp)
6. `k-anonymity` publication gate

## Hard Requirements

1. `TimeBlind` is mandatory.
2. `k_min` is mandatory (default 50; configurable).
3. One-review-per-subject-per-epoch via nullifier.
4. No direct signing of reviews with persistent identity key.
5. No individual review publication when `k < k_min`.

## Local Proving vs Remote Proving (Who Users Must Trust)

### Local proving (default)

User device generates proof locally.

Users must trust:

1. Circuit/protocol correctness
2. Trusted setup artifact integrity (if Groth16/Semaphore path)
3. Their local app/device environment

Users do **not** need to trust a prover service with private witness data.

### Remote proving (optional fallback)

Prover service receives witness data and generates proof.

Users must trust:

1. All local-proving assumptions, plus
2. Prover operator not to log/leak witness data
3. Prover operator not to correlate IP/timing metadata
4. Prover operator availability/censorship behavior

Conclusion: remote proving adds privacy and censorship trust assumptions even if proof verification remains cryptographic.

## Open Source + Reproducible Build Impact

### Helps significantly

1. Verifiability that distributed binaries match reviewed source
2. Auditable client behavior (key handling, proof generation, leakage risks)
3. Auditable circuits/verifiers and policy gates (`k_min`, nullifier scope)
4. Independent third-party security review and forkability

### Does not fully solve

1. Trusted setup compromise risk (if setup-based proving used)
2. Network metadata leakage (IP, timing, traffic patterns)
3. Remote prover operator privacy/censorship trust
4. Endpoint compromise on user devices

## Why Remote Proving Might Still Be Needed

1. Proof generation can be slow/heavy on mobile/low-end devices
2. Browser memory/CPU limits for larger circuits
3. UX fallback when local proving fails
4. Early prototype operability before mobile proving optimizations

Policy position: `local-first`, `remote-optional`, explicit user consent and trust warning.

## Residual Risk #4 Mitigation Plan

1. Use audited ceremony artifacts and independently verify setup transcripts.
2. Pin `circuit_hash` and `verifying_key_hash` in clients and verifiers.
3. Version circuits and require explicit migration approvals.
4. Run cross-verifier checks and negative proof tests in CI.
5. Local proving as default; remote only fallback.
6. For remote prover:
   - no account requirement
   - minimal/no persistent logs
   - short-lived worker jobs
   - strict retention windows
   - metadata minimization
7. Enforce delayed/bucketed publish windows to reduce timing linkage.
8. Keep `k_min` gate and suppress/defer low-anonymity submissions.
9. Plan migration path toward no-trusted-setup proving systems when practical.

## Prototype Scope

### In scope

1. WoT cohort builder + Merkle root publication
2. ZK membership proof + nullifier verification
3. Interaction receipt proof verification
4. TimeBlind proof verification
5. Nullifier dedupe store
6. Review UI with badges:
   - verified interaction
   - WoT-qualified
   - anonymity set size

### Out of scope

1. Ring signatures
2. Stake-weighted economics
3. Homomorphic encryption aggregation
4. ZK aggregate-audit layer
5. Cross-service portable reputation credentials

## Verification Policy Defaults

1. `k_min = 50` (raise to 100 for stricter deployments)
2. `epoch = weekly` (subject + week bucket)
3. TimeBlind windows: weekly/monthly only
4. Reject if:
   - invalid membership proof
   - invalid interaction proof
   - invalid time proof
   - duplicate nullifier in epoch scope
   - anonymity set below threshold

## Recommended Deployment Stance

1. Ship prototype with local proving default.
2. Offer remote proving as opt-in fallback with explicit trust disclosure.
3. Publish reproducible build docs and artifact verification instructions from day one.
4. Treat trust-model documentation as part of the product, not just internal engineering notes.

## Immediate Next Steps

1. Freeze proving stack choice (Semaphore default vs custom circuit composition).
2. Finalize trust policy text shown to users for remote proving fallback.
3. Define event schema for proof bundle + policy outcomes.
4. Build a 2-3 week prototype sprint plan with local proving as primary path.
