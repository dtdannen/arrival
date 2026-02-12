# Trust Model and Risk Mitigation

## Trust Boundaries

## 1) Local proving mode

Users trust:

1. Open-source client correctness
2. Circuit/protocol correctness
3. Trusted setup integrity (Semaphore v4's Groth16 ceremony, 400+ participants)
4. Their own device security

Users do not need to trust a remote prover with witness data.

## 2) Remote proving mode (fallback)

Users additionally trust:

1. Prover operator data handling
2. Prover operator not to correlate metadata
3. Prover operator availability and non-censorship

Remote proving is therefore a privacy/censorship tradeoff, not a free optimization.

## Residual Risks

1. Trusted setup compromise (mitigated by Semaphore v4's multi-participant ceremony; risk is non-zero but accepted)
2. Timing/network metadata leakage
3. Small anonymity sets in sparse cohorts
4. WoT graph manipulation or poisoning
5. Endpoint compromise on user device

## Mitigation Controls

1. Keep local proving as default
2. Enforce `k_min` and suppress low-anonymity publication
3. Enforce delayed/bucketed publish windows
4. Pin `circuit_hash` and `verifying_key_hash`
5. Version proof formats and require explicit migrations
6. Add negative-proof and tamper tests in CI
7. Minimize logs and retention in all services
8. Keep remote proving opt-in with explicit warning text
9. Publish reproducible build instructions and artifact checksums

## Open Source and Reproducible Builds

Benefits:

1. Users can verify binaries match source
2. Security reviewers can audit privacy assumptions
3. Harder to hide silent policy regressions

Limitations:

1. Does not remove trusted setup risk by itself
2. Does not stop network metadata leakage by itself
3. Does not eliminate trust in remote prover operators

## Security Regression Checklist

1. Reject code stability preserved
2. Proof artifact pinning still enforced
3. `k_min` policy unchanged unless explicitly versioned
4. Nullifier scope unchanged unless migration approved
5. Logging policy unchanged unless security review approved
