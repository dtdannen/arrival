# MVP Consistency and Test Alignment Audit

Date: 2026-02-13

## Scope
This note answers:
1. Are `src/` tests aligned with `mvp/README.md` goals/non-negotiables?
2. Are `mvp/` files internally consistent?
3. What should we do about issues #3-#6 from the prior review?

## Short Answer
- Test intent is mostly aligned with MVP goals and non-negotiables.
- `mvp/` still has a few meaningful cross-file inconsistencies that should be patched before implementation.
- For item #3 (helpers): these are not new protocol requirements; they are foundational test harness work required to execute existing tests.

## A) Test Alignment With `mvp/README.md`

### What is aligned
- `k_min` hard reject is explicitly covered: `src/TESTS.md:389`, `src/TESTS.md:399`.
- Server-authoritative `epoch_id` is covered: `src/TESTS.md:360`.
- One-review-per-subject-per-epoch nullifier behavior is covered: `src/TESTS.md:432`, `src/TESTS.md:437`.
- No public exact timestamps is covered: `src/TESTS.md:622`, `src/TESTS.md:648`.
- Lifecycle (`admitted` held -> `published` batch) is covered: `src/TESTS.md:484`, `src/TESTS.md:499`, `src/TESTS.md:607`.

### Alignment gaps/drift to fix
- `proof_version` gate order mismatch between tests and proof pseudocode:
  - Test expects version check before bundle/schema unpack (`src/TESTS.md:343`).
  - Pseudocode currently checks schema before version (`mvp/03-proof-spec.md:76`, `mvp/03-proof-spec.md:77`).
- Test metadata is stale:
  - `src/TESTS.md` says total 152 (`src/TESTS.md:959`), but current suite has 160 todos.

## B) MVP Internal Consistency Issues (Worth Fixing)

### 1) Feed visibility state conflict (major)
- `mvp/02-architecture.md:27` says `review-feed-api` serves admitted reviews.
- `mvp/09-event-and-api-spec.md:86` says feed returns published-only reviews.
- Submission flow in architecture already says admitted is held and not visible (`mvp/02-architecture.md:90`).

Recommendation:
- Keep `published-only` as canonical behavior.
- Patch only the component bullet in `mvp/02-architecture.md` from "serves admitted reviews" to "serves published reviews".

Why:
- Matches time-window privacy/batch release design in `mvp/11-time-window-policy.md:93` and `mvp/11-time-window-policy.md:99`.
- Matches API contract and existing tests (`src/TESTS.md:607`).

### 2) `proof_version` check order conflict (major)
- `mvp/03-proof-spec.md` pseudocode: schema before version (`mvp/03-proof-spec.md:76` -> `mvp/03-proof-spec.md:77`).
- Same file's versioning rules require checking version before bundle unpack (`mvp/03-proof-spec.md:101`).
- Tests expect version-first behavior (`src/TESTS.md:343`).

Recommendation:
- Adopt version-first order as canonical:
  1. validate top-level envelope (including `proof_version` presence/type)
  2. check supported version
  3. then parse/validate versioned bundle schema
- Update `mvp/03-proof-spec.md` pseudocode and `mvp/02-architecture.md` pipeline step descriptions to reflect this.

Why:
- Prevents ambiguous reject paths when unknown versions carry incompatible bundle shapes.
- Keeps migration/version negotiation clean.

### 3) Epoch operational default conflict (medium)
- Unified adaptive rule exists: `epoch_id = hash(subject_id || time_window_id)` in `mvp/02-architecture.md:38` and `mvp/11-time-window-policy.md:132`.
- But Operational Defaults still says `Epoch size: weekly` in `mvp/02-architecture.md:130`.

Recommendation:
- Replace `Epoch size: weekly` with text like:
  - `Epoch scope follows adaptive time_window policy (weekly/biweekly/monthly/quarterly).`

Why:
- Removes contradiction without changing the actual design.

### 4) Optional cleanup: stack naming drift (low)
- `mvp/README.md` core stack names `nostr-keys` and `nostr-web-of-trust` (`mvp/README.md:61`, `mvp/README.md:62`).
- Implementation docs point to `nostr-tools` (`mvp/04-implementation-plan.md:18`).

Recommendation:
- Either standardize on concrete libs, or mark `mvp/README.md` entries as conceptual module labels.

## C) Direct Responses to Questions 3-6

### Q3) "These are new tests we need to write then?"
- Mostly no. This is primarily helper/harness implementation so existing tests can actually run.
- Specifically:
  - `src/tests/helpers/db.ts:23` and `src/tests/helpers/db.ts:32` must be implemented for DB-backed suites.
  - `src/tests/helpers/crypto.ts:14` and related functions must be implemented for deterministic crypto fixtures.
  - `src/tests/helpers/fixtures.ts:14` and related factories must be implemented so test files can be converted from `it.todo` to `it(...)`.

Suggested order:
1. `crypto.ts` deterministic helpers
2. `fixtures.ts` minimal valid objects
3. `db.ts` container + reset utilities
4. convert high-value gateway tests first (`T-920`/`T-922`, `T-950`-`T-953`, `T-1220`)

### Q4) Feed conflict resolution proposal
- Canonical decision: feed serves `published` only.
- Make `mvp/09-event-and-api-spec.md` and `mvp/11-time-window-policy.md` authoritative, and patch the single conflicting line in `mvp/02-architecture.md:27`.

### Q5) `proof_version` ordering proposal
- Canonical decision: version gate must happen before proof-bundle schema validation/unpacking.
- Update pseudocode and pipeline wording accordingly.
- Keep reject canon unchanged; just enforce deterministic precedence (`unsupported_proof_version` before `invalid_schema` for unknown versions).

### Q6) Epoch weekly wording proposal
- Replace stale "weekly" default with adaptive wording tied to `time_window_policy`.
- Do not keep both statements; only one should remain to avoid policy confusion.

## D) Resume Checklist
When work resumes, do these in order:
1. Patch `mvp/02-architecture.md` for feed wording and epoch defaults.
2. Patch `mvp/03-proof-spec.md` pipeline order for `proof_version`.
3. If needed, patch `mvp/02-architecture.md` step ordering to match #2.
4. Update `src/TESTS.md` summary total from 152 -> 160.
5. Implement `src/tests/helpers/{crypto,fixtures,db}.ts` so todo tests can be converted to executable tests.

## Source References Used
- `mvp/README.md`
- `mvp/02-architecture.md`
- `mvp/03-proof-spec.md`
- `mvp/09-event-and-api-spec.md`
- `mvp/11-time-window-policy.md`
- `mvp/04-implementation-plan.md`
- `src/TESTS.md`
- `src/tests/helpers/db.ts`
- `src/tests/helpers/crypto.ts`
- `src/tests/helpers/fixtures.ts`
