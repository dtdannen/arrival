# Arrival — Project State

**Last updated**: 2026-03-03
**Current phase**: Steps 1+2 complete — ready for Steps 3+4
**Active branch**: `main`

## Completed

- [x] Spec frozen (12 documents in `mvp/`)
- [x] Test suite written (162 tests, 59 files, all passing)
- [x] Tech stack locked (TypeScript, Circom, Semaphore v4, snarkjs, nostr-tools, PostgreSQL)
- [x] Test helpers implemented (`crypto.ts`, `db.ts`, `fixtures.ts`, `types.ts`)
- [x] Process defined (`planning/PROCESS.md`)
- [x] Agent instructions written (`CLAUDE.md`)
- [x] Guardian agent created (`.claude/agents/arrival-guardian.md`)
- [x] All 10 unnamed decisions resolved and recorded
- [x] Step 0: Infrastructure setup (merged to main)
- [x] Step 1: WoT Cohort Pipeline (merged to main)
  - [x] `wot-indexer/index.ts` — NIP-01 compliant Schnorr verification, EventStore with replaceable semantics
  - [x] `cohort-root-publisher/index.ts` — Merkle tree per distance tier, RootRegistry, rebuild policy
- [x] Step 2: Receipt Pipeline (merged to main)
  - [x] `receipt-issuer/index.ts` — RSABSSA blind signing (RFC 9474) + KeysetRegistry with overlap detection
  - [x] `receipt-verifier/index.ts` — verifyReceipt, checkReceiptSpent, checkKeysetWindowBounds
- [x] NIP-01 Schnorr fix — production and test code both use correct hex-string approach (no double-hash)

## Up Next

- [ ] Step 3: Proof Engine (`proof-engine` — client-side ZK proof bundle generation)
  - Time window policy (determineWindowPolicy, computeTimeWindowId, volume bucketing)
  - Nullifier construction (computeScope, computeNullifier, fieldElement)
  - Proof bundle packaging
- [ ] Step 4: Review Gateway (`review-gateway` — 10-step verification pipeline)
  - 10-step pipeline ordered cheapest-first
  - Nullifier dedup store
  - Reject reason mapping

## Active Lanes

| Lane | Agent | Task | Status |
|------|-------|------|--------|
| — | — | — | No lanes active |

## Open Questions

None.

## Notes

- 162 tests pass on main after Steps 1+2 merge. Baseline maintained.
- Guardian identified NIP-01 double-hash bug — fixed in both production and test code.
- Guardian identified missing blind signing — added full RSABSSA integration.
- Steps 3 and 4 can potentially parallelize (proof-engine is client-side, gateway is server-side).
- Step 3 has 12 tests across 2 files (time-window-policy: 6, nullifier: 6).
- Step 4 tests span multiple gateway step files.
