# Arrival — Project State

**Last updated**: 2026-03-03
**Current phase**: Steps 3+4 implemented — awaiting guardian review
**Active branch**: `step-3-4-proof-gateway`

## Completed

- [x] Step 0: Infrastructure setup (merged to main)
- [x] Step 1: WoT Cohort Pipeline (merged to main)
- [x] Step 2: Receipt Pipeline (merged to main)
- [x] Step 3: Proof Engine (implemented, pending review)
  - [x] `proof-engine/index.ts` — determineWindowPolicy, computeTimeWindowId, volume bucketing
  - [x] `proof-engine/index.ts` — fieldElement, computeScope, computeNullifier
- [x] Step 4: Review Gateway + Nullifier Store (implemented, pending review)
  - [x] `review-gateway/index.ts` — 10-step verification pipeline + admitSubmission
  - [x] `nullifier-store/index.ts` — InMemoryNullifierStore

## Up Next

- [ ] Guardian review for Steps 3+4, then merge to main
- [ ] Step 5: Review Feed and UI
- [ ] Step 6: Security and Privacy Hardening
- [ ] Step 7: MVP Demo and Readiness

## Notes

- 162 tests pass after Steps 3+4 implementation. Baseline maintained.
- poseidonHash in shared/crypto.ts is still a SHA-256 stub — acceptable for now since tests are self-consistent.
- In-memory stores (NullifierStore, RootRegistry, etc.) need PostgreSQL backing eventually.
