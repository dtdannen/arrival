# RISC Zero Evaluation for This MVP

## Question

Can we use RISC Zero in the MVP, and should it replace the current Semaphore/NullReview-style ZK plan?

## Short Answer

1. Yes, we can use RISC Zero in this project.
2. No, it should not replace the MVP core proof path right now.
3. Best use in MVP timeframe: optional/secondary role, not primary anonymity pipeline.

## What RISC Zero Provides

1. A zkVM for proving execution of Rust programs (`risc0-zkvm`).
2. Multiple receipt/proof modes (`composite`, `succinct`, `groth16`).
3. Local proving options (CPU and CUDA acceleration).
4. Remote proving services (Boundless/Bonsai ecosystem).

## Why It Is Attractive

1. General-purpose proving model (less circuit-specific engineering).
2. Good fit for verifiable computation use cases.
3. Potential path away from circuit DSL-heavy workflows in some areas.

## Why It Is Not Ideal as MVP Core (for this product)

1. Your MVP priority is anonymity + WoT membership + time privacy policy enforcement.
2. Semaphore/NullReview gives direct primitives for membership proofs + nullifiers that map tightly to your requirements.
3. RISC Zero local proving is still operationally heavier than a narrow, purpose-built circuit path for this use case.
4. RISC Zero docs explicitly note proving can be expensive and that remote proving is recommended for many workloads, which adds trust/privacy tradeoffs you are trying to minimize.
5. You still need policy and privacy controls (`k_min`, time bucketing, delayed publish) regardless of proving backend.

## Recommended Position for MVP

1. Keep MVP core on Semaphore/NullReview + TimeBlind + receipt proofs.
2. Keep local proving as default and remote as optional fallback.
3. Track RISC Zero as a post-MVP candidate for:
   - verifiable aggregation services
   - audit computation proofs
   - specialized computation-heavy modules where zkVM flexibility is valuable

## Decision

`MVP Decision: Defer RISC Zero as primary proving stack. Re-evaluate after MVP once baseline privacy/anonymity guarantees are stable.`

## Re-Evaluation Triggers

1. Need to prove more complex logic than current circuit path supports cleanly
2. Need one proving framework across multiple app modules
3. Local proving performance targets not met with current stack
4. Team decides remote proving trust model is acceptable for specific workflows

## Sources (Primary)

1. RISC Zero docs index: https://dev.risczero.com/api/zkvm/
2. Proving options (local vs remote): https://dev.risczero.com/api/generating-proofs/proving-options
3. Local proving docs: https://dev.risczero.com/api/generating-proofs/local-proving
4. Security model and trusted setup notes: https://dev.risczero.com/api/security-model
5. GitHub repository/readme: https://github.com/risc0/risc0
6. Crate docs (`risc0-zkvm`): https://docs.rs/risc0-zkvm/latest/risc0_zkvm/
