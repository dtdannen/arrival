# Arrival — Project State

**Last updated**: 2026-03-08
**Current phase**: Steps 0-7 complete — MVP architecturally complete
**Active branch**: `main`

## Completed

- [x] Step 0: Infrastructure setup (merged)
- [x] Step 1: WoT Cohort Pipeline (merged)
- [x] Step 2: Receipt Pipeline (merged)
- [x] Step 3: Proof Engine (merged)
  - [x] Time window policy (adaptive windows from volume metrics)
  - [x] Nullifier construction (Poseidon-based scope + nullifier)
  - [x] Volume bucketing (coarse, privacy-safe)
- [x] Step 4: Review Gateway + Nullifier Store (merged)
  - [x] 10-step verification pipeline with injected verifiers
  - [x] admitSubmission orchestrator
  - [x] InMemoryNullifierStore
- [x] Step 5: Review Feed and UI (merged)
  - [x] FeedStore with query filters (max_distance, verified_only, time_window_id)
  - [x] Batch release (Fisher-Yates, idempotent, window+t_min guards)
  - [x] Verification endpoint (proof metadata, no timestamps)
  - [x] Pre-submission disclosure (smallest tier meeting k_min)
  - [x] ProverClient (local/remote, trust warning enforcement)
  - [x] Feed/verification/cohort-root/submit formatters
- [x] Step 6: Security and Privacy Hardening (merged)
  - [x] SafeLogger with allowlisted fields (review-gateway/logger.ts)
  - [x] Artifact pinning verification (review-gateway/artifact-pinning.ts)
- [x] Step 7: MVP Demo and Readiness
  - [x] SafeLogger wired into admitSubmission pipeline
  - [x] Artifact pinning wired into gateway startup (verifyGatewayArtifacts)
  - [x] Demo runbook (planning/DEMO-RUNBOOK.md)
  - [x] Readiness report (planning/READINESS-REPORT.md)
  - [x] Performance benchmarks deferred (stubs exist, need compiled circuits)

## Production Readiness — Next Steps

1. Author and compile Circom circuits (Semaphore v4 membership + TimeBlind)
2. Replace poseidonHash stub with circomlibjs Poseidon
3. Replace in-memory stores with PostgreSQL (`docker compose`)
4. Add HTTP API layer (Express/Fastify)
5. Build browser proving UI with snarkjs WASM
6. Run performance benchmarks with real circuits
7. Connect Nostr relay transport

## Notes

- 162 tests pass on main. Baseline maintained through all steps.
- poseidonHash is still a SHA-256 stub — replace with circomlibjs before circuit integration.
- In-memory stores need PostgreSQL backing before production.
- Performance bench files remain as todo stubs — real baselines require compiled circuits.
