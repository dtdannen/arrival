# Arrival MVP — Test-Driven Development Guide

## What is TDD?

Test-Driven Development follows a simple loop:

1. **Red** — Write a failing test that describes what you want to build
2. **Green** — Write the minimum code to make the test pass
3. **Refactor** — Clean up without changing behavior (tests still pass)

Repeat. Every feature starts with a test.

## Project Structure

```
tests/
  helpers/         Shared fixtures, DB setup, crypto helpers
  unit/            Fast tests, no DB, mocked where needed (10s timeout)
  circuit/         Circom/Semaphore circuit tests (120s timeout)
  integration/     Real DB via testcontainers (30s timeout)
  e2e/             Full system tests (120s timeout)
  performance/     Benchmark files (.bench.ts) (120s timeout)
  reliability/     Restart/failure resilience tests (30s timeout)
```

## Running Tests

```bash
# Run all tests
npm test

# Run only unit tests (fastest, start here)
npm run test:unit

# Run specific layers
npm run test:circuit
npm run test:integration
npm run test:e2e
npm run test:reliability

# Run benchmarks
npm run test:perf

# Watch mode (re-runs on file change) — great for TDD
npm run test:watch          # unit tests only
npm run test:watch:all      # all tests

# Run a single test file
npx vitest run tests/unit/proof-engine/nullifier.test.ts

# Run tests matching a pattern
npx vitest run -t "T-800"
```

## Understanding `it.todo()`

Every test starts as a **todo** — a named placeholder:

```typescript
it.todo('T-800: Nullifier deterministic for same identity + scope')
```

When you run the suite, todos show as **skipped** (not failed). They're your roadmap.

To implement a test, replace `it.todo(...)` with `it(...)` and add a test body:

```typescript
it('T-800: Nullifier deterministic for same identity + scope', () => {
  const secret = BigInt('0x1234')
  const scope = poseidonHash(DOMAIN_TAG, subjectId, epochId)
  const nullifier1 = poseidonHash(secret, scope)
  const nullifier2 = poseidonHash(secret, scope)
  expect(nullifier1).toBe(nullifier2)
})
```

Now when you run the suite, this test is **red** (fails, because the production code doesn't exist yet). Write the production code, and it turns **green**.

## Golden Path — What to Build First

This is the recommended order. Each group builds on the previous one:

| Order | Component | Tests | Why First |
|-------|-----------|-------|-----------|
| 1 | Nullifier (proof-engine) | T-800–T-805 | Pure Poseidon hashing, zero deps |
| 2 | Identity client | T-100–T-102 | Pure Ed25519 key derivation |
| 3 | WoT indexer | T-200–T-209 | Nostr event processing, in-memory |
| 4 | Cohort roots | T-300–T-304 | Merkle tree construction |
| 5 | Receipt issuer/verifier | T-400–T-506 | RSABSSA blind signing |
| 6 | Time-window circuit | T-600–T-605 | Circom circuit tests |
| 7 | Membership proof | T-700–T-702 | Semaphore v4 integration |
| 8 | Gateway steps | T-900–T-997 | Verification pipeline, one step at a time |
| 9 | Lifecycle + windows | T-1000–T-1106 | Batch release, adaptive windows |
| 10 | Integration + adversarial | T-1200–T-1704 | DB-backed tests |
| 11 | E2E | T-2100–T-2105 | Full happy path last |

## Tips

- **Start with unit tests.** They're fast and have no dependencies.
- **One test at a time.** Don't implement three tests then write code — do one red-green-refactor cycle at a time.
- **Use watch mode.** `npm run test:watch` re-runs on save, giving instant feedback.
- **Read the test ID.** Every test references a spec in `TESTS.md` (e.g., T-800). Check the spec for exact inputs and expected outputs.
- **Helpers are stubs.** The `tests/helpers/` files have factory functions that throw `Not implemented`. Fill them in as you need them.

## Test IDs

Every test has a unique ID (T-100, T-200, etc.) that maps to `src/TESTS.md`. The ID tells you:
- Which component it belongs to
- What spec section defines it
- Where it fits in the build sequence

## Adding New Tests

If you discover a case not covered by the 152 existing tests:
1. Add it to `TESTS.md` with the next available ID in its section
2. Add the `it.todo()` stub in the appropriate test file
3. Follow the red-green-refactor cycle to implement it
