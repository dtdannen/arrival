# Arrival — Project State

**Last updated**: 2026-03-03
**Current phase**: Steps 0-4 complete — ready for Steps 5+
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

## Up Next

- [ ] Step 5: Review Feed and UI
- [ ] Step 6: Security and Privacy Hardening
- [ ] Step 7: MVP Demo and Readiness

## Notes

- 162 tests pass on main. Baseline maintained through all steps.
- poseidonHash is still a SHA-256 stub — replace with circomlibjs before circuit integration.
- In-memory stores need PostgreSQL backing before production.
