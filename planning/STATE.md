# Arrival — Project State

**Last updated**: 2026-03-01
**Current phase**: Step 0 — Infrastructure Setup
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

## In Progress

- [ ] Step 0: Infrastructure setup
  - [ ] Extract `src/shared/types.ts` from test helpers (canonical types)
  - [ ] Extract `src/shared/crypto.ts` from test helpers (canonical crypto)
  - [ ] Create `src/shared/constants.ts` (k_min, t_min, reject codes, domain_tag)
  - [ ] Create 10 component directories with empty `index.ts`
  - [ ] PostgreSQL `docker-compose.yml` (PG container only)
  - [ ] Database schema migrations (5 tables: roots, reviews, nullifiers, spent_receipts, issuer_registry)
  - [ ] Wire up testcontainers in `src/tests/helpers/db.ts`
  - [ ] Update test helpers to import from `src/shared/`
  - [ ] Install `@cloudflare/blindrsa-ts`
  - [ ] Create `circuits/` directory with gitignore for build artifacts
  - [ ] Verify all 162 tests still pass after restructure

## Up Next

- [ ] Step 1: WoT Cohort Pipeline (`wot-indexer` + `cohort-root-publisher`) — Lane 1
- [ ] Step 2: Receipt Pipeline (`receipt-issuer` + `receipt-verifier`) — Lane 2 (parallel with Step 1)

## Active Lanes

| Lane | Agent | Task | Status |
|------|-------|------|--------|
| — | — | — | No lanes active yet |

## Open Questions

None. All 10 previously unnamed decisions are resolved. See `planning/PROCESS.md` Decisions Log.

## Notes

- 162 tests pass as of genesis. This is the baseline. Never let it regress.
- Test inline implementations are reference code — don't move or modify them.
- Steps 1 and 2 are the first parallelization opportunity (independent components).
- RSABSSA library: `@cloudflare/blindrsa-ts` — only viable RFC 9474 TS implementation.
