# Arrival — Multi-Agent Process

## Coordination Model

**Tmux lanes.** One meta-agent (strategic pane), multiple worker agents in parallel panes.

### Roles

| Role | Pane | Responsibility |
|------|------|---------------|
| **Meta-agent** | Pane 0 | Strategic oversight, prompt drafting, state management. Never writes production code directly. |
| **Research agent** | Spawned as needed | Explores spec, investigates libraries, checks consistency. Read-only. |
| **Coding agent** | Worker panes | Writes production code against spec and tests. Narrow scope, clear boundaries. |
| **Human (Dustin)** | All panes | Relays between agents, approves decisions, resolves ambiguity. |

### Agent Types

- **Coding agents**: `general-purpose` subagent type. Full tool access. Gets narrow scope with explicit file boundaries.
- **Research agents**: `Explore` subagent type. Read-only. Gets broad exploration scope with structured reporting.
- **Planning agents**: `Plan` subagent type. Read-only. Gets full problem space, produces implementation plan.
- **Guardian agent**: `arrival-guardian` custom agent (`.claude/agents/arrival-guardian.md`). Read-only. Reviews work against design principles, objectives, and non-negotiable requirements. Produces compliance report.

## Feedback Loops

1. **Worker → File system**: Workers write outputs to known paths. Production code to `src/`, test results to stdout.
2. **Worker → Human**: Worker reports completion or blockers in chat. Human relays key findings to meta-agent.
3. **Meta-agent → Worker**: Meta-agent drafts prompts. Human pastes them into worker panes.
4. **State file**: `planning/STATE.md` is the single source of truth for project status. Updated by meta-agent after each step completes.

## Prompt Flow

### Research agents
```
You are researching [topic] for the Arrival project.
Read CLAUDE.md for project context.
Investigate: [specific questions]
Report: [structured output format]
Do not write code. Research only.
```

### Coding agents
```
You are implementing [component] for the Arrival project.
Read CLAUDE.md for project context.
Read the spec: [specific spec files]
Read the tests: [specific test files]

Your scope:
- Create/modify files in: src/[component]/
- Do NOT modify: [boundaries]

Acceptance criteria:
- [specific deliverables]
- All existing tests continue to pass
- New production code matches spec behavior

When done, run: npm test (from src/)
```

## Review Gate: Guardian Agent

After each implementation step is complete, before merging to main:

1. **Run the guardian**: The `arrival-guardian` agent reviews the diff against `mvp/README.md` principles
2. **Verdict determines merge**: APPROVE = merge. BLOCK = fix issues first. APPROVE WITH WARNINGS = discuss, then merge or fix.
3. **What it checks**:
   - Privacy & Anonymity (BLOCKING): timestamp leakage, log safety, k_min enforcement, batch release, anonymity set
   - Client Trust (BLOCKING): server-authoritative values, no client trust for policy enforcement
   - Spec Compliance (BLOCKING): reject codes, pipeline order, nullifier construction, canonical spec ownership
   - Decentralization (WARNING): centralization lock-in, abstraction opportunities
   - Quality (WARNING): error handling, production readiness, shortcuts

This is not optional. Every step gets a guardian review.

## Git Workflow

1. Each implementation step gets a feature branch: `step-N-description`
2. Workers commit to the feature branch
3. Guardian agent reviews before merge to main
4. Meta-agent approves merge after guardian passes
5. Never force-push. Never amend published commits.

## Session Lifecycle

### Starting a session
1. Read `planning/STATE.md` for current state
2. Read `CLAUDE.md` for project agreements
3. Check `git status` and `git log --oneline -5`
4. Resume from where state file says we are

### During a session
1. Meta-agent updates STATE.md as steps complete
2. Workers commit frequently with descriptive messages
3. If context grows large, checkpoint to STATE.md before compaction

### Ending a session
1. All in-progress work committed (even if incomplete — use WIP commits)
2. STATE.md updated with: what's done, what's in progress, what's next
3. Any open questions recorded in STATE.md

## Build Sequence

Following `mvp/04-implementation-plan.md`:

| Step | Component | Branch | Dependencies |
|------|-----------|--------|-------------|
| 0 | Lock decisions + infra | `step-0-infra` | None (mostly done, need PG setup) |
| 1 | WoT cohort pipeline | `step-1-wot-cohort` | Step 0 |
| 2 | Receipt pipeline | `step-2-receipts` | Step 0 |
| 3 | Proof generation | `step-3-proof-engine` | Steps 1, 2 |
| 4 | Review gateway | `step-4-review-gateway` | Steps 1, 2, 3 |
| 5 | Feed + UI | `step-5-feed-ui` | Step 4 |
| 6 | Security hardening | `step-6-hardening` | Step 5 |
| 7 | MVP demo | `step-7-demo` | Step 6 |

Steps 1 and 2 are independent — they can run in parallel lanes.

### Parallel Merge Strategy

Step 0 creates the shared foundation on main before any branches diverge:
- `src/shared/types.ts`, `src/shared/crypto.ts`, `src/shared/constants.ts`
- All 10 component directories (empty `index.ts` files)
- Docker compose + migrations
- Updated test helpers to import from `src/shared/`

After Step 0 merges to main:
- Step 1 branches from main → only touches `src/wot-indexer/` and `src/cohort-root-publisher/`
- Step 2 branches from main → only touches `src/receipt-issuer/` and `src/receipt-verifier/`
- Neither branch modifies `src/shared/` — shared changes go through main first
- Merge order: Step 1 first (arbitrary), Step 2 rebases onto updated main

### Stub Replacement Schedule

Each step replaces the stubs it owns. No step is complete with `throw new Error('Not implemented')` in scope.

| Stub | Replaced In |
|------|------------|
| `setupTestDatabase` / `resetTables` | Step 0 |
| `makeKind3Event` | Step 1 |
| `deterministicRSAKeypair` / `makeBlindedValue` | Step 2 |
| `poseidonHash` / `deterministicIdentity` | Step 3 |

## Decisions Log

| Decision | Choice | Date |
|----------|--------|------|
| Orchestration model | Multi-agent tmux lanes | 2026-03-01 |
| Build sequence | Follow implementation plan (Steps 0-7) | 2026-03-01 |
| Code organization | src/modules per component | 2026-03-01 |
| Git workflow | Feature branches per step | 2026-03-01 |
| Database | PostgreSQL from day one (docker compose) | 2026-03-01 |
| Test strategy | Keep inline test implementations as reference; write production modules separately | 2026-03-01 |
| Guardian agent | Mandatory review gate before every merge; blocks on privacy/trust/spec violations | 2026-03-01 |
| Shared code ownership | Production owns types/crypto in `src/shared/`; tests import from production | 2026-03-01 |
| RSABSSA library | `@cloudflare/blindrsa-ts` (only RFC 9474 compliant TS library) | 2026-03-01 |
| Nostr library | `nostr-tools` is canonical; README Core Stack entries are role descriptions, not package names | 2026-03-01 |
| Canonical serialization | JSON.stringify with sorted keys, exclude `signature`, UTF-8 encode | 2026-03-01 |
| epoch_id separator | Literal `"\\|\\|"` two-char separator: `sha256(subject_id + "\\|\\|" + time_window_id)` | 2026-03-01 |
| Parallel merge strategy | Step 0 on main first; branches only touch own components; shared changes through main | 2026-03-01 |
| Stub replacement | Each step replaces stubs it owns; no step complete with unimplemented stubs | 2026-03-01 |
| Proving artifacts | Circom source in `circuits/`, builds in `circuits/build/` (gitignored), Semaphore v4 from npm | 2026-03-01 |
| Docker topology | PG container only; Node services run locally against containerized PG | 2026-03-01 |
