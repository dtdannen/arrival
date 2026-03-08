# Arrival MVP — Demo Runbook

**Purpose**: Walk through the complete review lifecycle to demonstrate all MVP gates from `01-scope-and-success.md`.

## Prerequisites

- Node.js 18+
- Docker (for PostgreSQL — `docker compose up -d`)
- All 162 tests passing (`npx vitest run`)

## Demo Scenario

### 1. Create Identity and WoT Membership

```typescript
import { ingestFollowList, buildFollowGraph, getFollowersAtDistance } from '../src/wot-indexer/index.js'
import { buildCohortTree, CohortRootRegistry } from '../src/cohort-root-publisher/index.js'

// Ingest kind 3 follow lists from Nostr relays
const store = createEventStore()
ingestFollowList(store, anchorEvent)   // anchor user
ingestFollowList(store, reviewerEvent) // reviewer follows anchor

// Build WoT graph and verify membership
const graph = buildFollowGraph(store)
const d1 = getFollowersAtDistance(graph, anchorPubkey, 1) // d<=1 cohort

// Publish cohort Merkle root
const registry = new CohortRootRegistry()
const tree = buildCohortTree(d1)
registry.publish(subjectId, tree.root, tree.depth, d1.length)
// Verify: k_size >= k_min (50)
```

### 2. Receive Interaction Receipt

```typescript
import { createKeypair, blindSign, finalize } from '../src/receipt-issuer/index.js'
import { verifyReceipt } from '../src/receipt-verifier/index.js'

// Issuer creates RSA keypair for subject
const keypair = createKeypair(subjectId)

// Reviewer blinds a random message, issuer signs, reviewer finalizes
const { blinded, blindingFactor } = blind(keypair.publicKey, message)
const blindSig = blindSign(keypair.privateKey, blinded)
const receipt = finalize(keypair.publicKey, blindSig, blindingFactor, message)

// Verify: receipt is valid RSA signature, unlinkable to signing session
verifyReceipt(receipt.r, receipt.S, keypair.publicKey)
```

### 3. Generate Proof Bundle Locally

```typescript
import { createProverClient } from '../src/web-ui/index.js'
import { constructNullifier, assignTimeWindow } from '../src/proof-engine/index.js'

// Time window assignment (adaptive: weekly/biweekly/monthly/quarterly)
const window = assignTimeWindow(subjectId, volumeMetrics)

// Nullifier: one review per subject per epoch
const nullifier = constructNullifier(subjectId, window.time_window_id, identitySecret)

// Local proving (privacy decision — witness stays on device)
const prover = createProverClient({ mode: 'local' })
const proofResult = prover.generateProof(witness)
// Verify: witnessSentRemotely === false
```

### 4. Submit Review

```typescript
import { admitSubmission } from '../src/review-gateway/index.js'

const result = admitSubmission(submission, pipelineContext)
// Verify: result.status === 'admitted'
// Verify: all verified_flags are true
// Verify: logger captured only safe fields (no witness material)
```

### 5. Verify Feed Display

```typescript
import { FeedStore } from '../src/review-feed-api/index.js'

// Batch release (not synchronous — privacy protection)
const { released } = feedStore.batchRelease(subjectId, windowId, true, true)

// Query published reviews
const reviews = feedStore.query({ subject_id: subjectId })

// Verify each published review shows:
// - WoT-qualified badge (membership_verified)
// - Interaction-verified badge (interaction_verified)
// - Anonymity-set badge (k_threshold_met)
// Verify: no created_at, no epoch_id, no proof_bundle in response
```

### 6. Attempt Duplicate Submission

```typescript
// Re-submit same review (same nullifier)
const duplicate = admitSubmission(sameSubmission, pipelineContext)
// Verify: duplicate.status === 'rejected'
// Verify: duplicate.reject_code === 'duplicate_nullifier'
```

## Verification Checklist

| MVP KPI | How to verify |
|---------|--------------|
| 100% published reviews pass all proof checks | All verified_flags true on admitted reviews |
| 0 duplicate nullifiers accepted | Step 6 above: duplicate rejected |
| 100% reviews below k_min rejected | Submit with k_size < 50 → `insufficient_anonymity_set` |
| Red-team replay rejected | Re-submit identical payload → `duplicate_nullifier` |

## Running the Full Test Suite as Demo

```bash
npx vitest run
# 162 tests across 59 files — covers all demo scenarios programmatically
```

Key test files that map to demo steps:
- `tests/e2e/happy-path.test.ts` — T-2100: full lifecycle
- `tests/e2e/pre-submission-disclosure.test.ts` — T-2104: anonymity disclosure
- `tests/unit/review-lifecycle/admission.test.ts` — T-1000 to T-1002
- `tests/unit/review-lifecycle/batch-release.test.ts` — T-1003 to T-1009
- `tests/unit/privacy/log-safety.test.ts` — T-1302, T-1303
- `tests/unit/security/regression-checklist.test.ts` — T-2000 to T-2004
