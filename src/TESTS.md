# Arrival MVP — Test Specifications (TDD)

Write these tests first. Every test must pass before the corresponding feature is considered complete.

## How to Use This File

Each test has a unique ID (`T-XXX`), a description, inputs/setup, and expected result. Tests are grouped by component/concern. Implement tests before writing production code (TDD red-green-refactor cycle).

Priority order matches the build sequence in `README.md`:
1. Identity & keys
2. WoT ingestion & cohort roots
3. Receipt pipeline
4. Proof generation
5. Verification pipeline & gateway
6. Review lifecycle & feed
7. Privacy & security hardening
8. End-to-end integration

---

## 1. Identity Client

### T-100: Derive one-time posting key from persistent identity
- **Setup**: Persistent Nostr identity keypair
- **Action**: Derive a one-time Ed25519 posting key
- **Expected**: Posting key is valid Ed25519, distinct from persistent key, deterministic derivation is reproducible

### T-101: Posting key signs review payload
- **Setup**: One-time posting key, canonical review body
- **Action**: Sign the canonical serialization of the review body
- **Expected**: Valid Ed25519 signature that verifies against the posting key

### T-102: Persistent key never appears in submission
- **Setup**: Generate a full review submission
- **Action**: Inspect all fields of `review_submission_v1`
- **Expected**: Persistent Nostr pubkey does not appear in any field

---

## 2. WoT Indexer (Nostr Ingestion)

### T-200: Ingest valid kind 3 event
- **Setup**: Valid kind 3 event with Schnorr signature, known pubkey, contact list
- **Action**: Ingest event
- **Expected**: Author's follow list stored; graph contains the expected edges

### T-201: Reject invalid Schnorr signature
- **Setup**: Kind 3 event with corrupted signature
- **Action**: Attempt ingestion
- **Expected**: Event discarded silently; graph unchanged

### T-202: Reject non-kind-3 events
- **Setup**: Valid kind 1 (text note) event
- **Action**: Attempt ingestion
- **Expected**: Event ignored; graph unchanged

### T-203: Replaceable event semantics — newer replaces older
- **Setup**: Two kind 3 events from same author; event A (`created_at=100`), event B (`created_at=200`)
- **Action**: Ingest A, then B
- **Expected**: Only B's contact list is retained for the author

### T-204: Replaceable event semantics — older does not replace newer
- **Setup**: Two kind 3 events from same author; event A (`created_at=200`), event B (`created_at=100`)
- **Action**: Ingest A, then B
- **Expected**: A's contact list is retained (B ignored)

### T-205: Tie-break on same `created_at` — lowest event `id` wins
- **Setup**: Two kind 3 events from same author with identical `created_at`; event A (`id="aaa..."`), event B (`id="bbb..."`)
- **Action**: Ingest both in any order
- **Expected**: Event A retained (lexicographically lower `id`)

### T-206: Union-then-replace across relays
- **Setup**: Relay 1 returns event A (`created_at=100`); Relay 2 returns event B (`created_at=200`) for same author
- **Action**: Query both relays, union responses, apply replace semantics
- **Expected**: Event B retained (higher `created_at`)

### T-207: Deterministic `graph_snapshot_hash`
- **Setup**: Same set of kind 3 events, ingested in different orders
- **Action**: Compute `graph_snapshot_hash` for each ingestion order
- **Expected**: Identical hash regardless of ingestion order

### T-208: `graph_snapshot_hash` changes when graph changes
- **Setup**: Compute hash for graph G1; add a new follow edge to produce G2
- **Action**: Compute hash for G2
- **Expected**: Hash differs from G1's hash

### T-209: Malformed event handling
- **Setup**: Event with missing required fields, invalid JSON, empty contact list
- **Action**: Attempt ingestion for each
- **Expected**: All malformed events discarded; no crash, no partial state

---

## 3. Cohort Root Publisher

### T-300: Build Merkle tree per distance tier
- **Setup**: Follow graph with known d<=1, d<=2, d<=3 sets for a subject
- **Action**: Build cohort Merkle trees
- **Expected**: Three separate roots; each tree contains exactly the members at that distance tier; `k_size` matches member count for each tier

### T-301: Root metadata includes required fields
- **Setup**: Published cohort root
- **Action**: Inspect metadata
- **Expected**: Contains `root_hash`, `k_size`, `distance_bucket`, `graph_snapshot_hash`, `valid_from`, `valid_to`

### T-302: Root not rebuilt when graph unchanged
- **Setup**: Ingest same events twice (no graph change)
- **Action**: Check if root rebuild triggered
- **Expected**: No rebuild; existing root reused

### T-303: Root rebuilt when graph changes
- **Setup**: Ingest events, build root; then ingest new event that changes graph
- **Action**: Trigger refresh
- **Expected**: New root built with updated `graph_snapshot_hash`

### T-304: Expired root is not active
- **Setup**: Root with `valid_to` in the past
- **Action**: Query active roots for subject
- **Expected**: Expired root not returned

---

## 4. Receipt Issuer

### T-400: Blind signing endpoint — happy path
- **Setup**: Valid blinded value `B`, active keyset for subject
- **Action**: `POST` to blind signing endpoint
- **Expected**: Returns `S_blind`; unblinding produces valid RSA signature `S` over `r`

### T-401: End-to-end receipt flow
- **Setup**: Client generates `r`, computes `B = Blind(r)`
- **Action**: Send `B` to issuer, receive `S_blind`, unblind to get `S`
- **Expected**: `Verify(pk, r, S)` succeeds

### T-402: Keyset scoped to subject
- **Setup**: Keyset for subject A
- **Action**: Attempt to verify receipt against subject B's keyset
- **Expected**: Verification fails

### T-403: Keyset rotation produces new keys
- **Setup**: Trigger keyset rotation
- **Action**: Compare new keyset to old
- **Expected**: Different `keyset_id`, different public key; old keyset remains in registry

### T-404: Keyset validity periods do not overlap
- **Setup**: Multiple keysets for same subject
- **Action**: Check all `[keyset_start, keyset_end]` intervals
- **Expected**: No overlapping periods

### T-405: Expired keyset still valid for verification
- **Setup**: Receipt signed with now-expired keyset
- **Action**: Verify receipt
- **Expected**: Verification succeeds (expired keysets remain in registry)

### T-406: Issuer does not learn `r`
- **Setup**: Capture all data the issuer receives during signing
- **Action**: Inspect issuer-side data
- **Expected**: Only `B` (blinded value) visible to issuer; `r` never transmitted

### T-407: Issuer cannot link `S_blind` to unblinded `(r, S)`
- **Setup**: Multiple receipts issued in batch
- **Action**: Attempt to match `S_blind` values to final `(r, S)` pairs
- **Expected**: No deterministic linkage possible (unlinkability property)

---

## 5. Receipt Verifier

### T-500: Valid receipt accepted
- **Setup**: Valid `(r, S, keyset_id)` for known subject
- **Action**: `verify_interaction(bundle)`
- **Expected**: Passes all checks

### T-501: Unknown `keyset_id` rejected
- **Setup**: Receipt with `keyset_id` not in registry
- **Action**: Verify
- **Expected**: Rejected with `invalid_interaction_proof`

### T-502: Wrong `subject_id` for keyset rejected
- **Setup**: Receipt with `keyset_id` registered for different subject
- **Action**: Verify
- **Expected**: Rejected with `invalid_interaction_proof`

### T-503: Invalid RSA signature rejected
- **Setup**: Receipt with tampered `S`
- **Action**: Verify
- **Expected**: Rejected with `invalid_interaction_proof`

### T-504: Spent receipt rejected (duplicate `receipt_hash`)
- **Setup**: Receipt already used in prior submission
- **Action**: Submit again
- **Expected**: Rejected with `invalid_interaction_proof`

### T-505: Keyset period outside claimed time window rejected
- **Setup**: Receipt from keyset period [Jan 1-7], claimed `window_start`/`window_end` = [Feb 1-28]
- **Action**: Verify
- **Expected**: Rejected with `invalid_timeblind_proof`

### T-506: Receipt does not contain reviewer identity
- **Setup**: Inspect all fields of the interaction proof
- **Action**: Check for persistent identity, Nostr keys, WoT position
- **Expected**: None present

---

## 6. Time-Window Circuit (Circom)

### T-600: Valid timestamp within window — proof accepted
- **Setup**: `interaction_timestamp = 150`, `window_start = 100`, `window_end = 200`
- **Action**: Generate and verify proof
- **Expected**: Proof valid

### T-601: Timestamp before `window_start` — proof rejected
- **Setup**: `interaction_timestamp = 50`, `window_start = 100`, `window_end = 200`
- **Action**: Generate proof
- **Expected**: Circuit unsatisfied; no valid proof producible

### T-602: Timestamp after `window_end` — proof rejected
- **Setup**: `interaction_timestamp = 250`, `window_start = 100`, `window_end = 200`
- **Action**: Generate proof
- **Expected**: Circuit unsatisfied; no valid proof producible

### T-603: Timestamp at exact `window_start` boundary — accepted
- **Setup**: `interaction_timestamp = window_start`
- **Action**: Generate and verify proof
- **Expected**: Proof valid (LessEqThan is inclusive)

### T-604: Timestamp at exact `window_end` boundary — accepted
- **Setup**: `interaction_timestamp = window_end`
- **Action**: Generate and verify proof
- **Expected**: Proof valid (LessEqThan is inclusive)

### T-605: Constraint count matches spec
- **Setup**: Compiled time-window circuit
- **Action**: Count constraints
- **Expected**: ~68 constraints (2x `LessEqThan(32)` using `Num2Bits(33)`)

---

## 7. Membership Proof (Semaphore v4)

### T-700: Valid membership proof against active root
- **Setup**: Identity committed to Merkle tree; root published as active
- **Action**: Generate Semaphore v4 proof; verify against root
- **Expected**: Proof valid

### T-701: Membership proof against wrong root fails
- **Setup**: Proof generated for root A; verify against root B
- **Action**: Verify
- **Expected**: Proof invalid

### T-702: Non-member cannot produce valid proof
- **Setup**: Identity not in Merkle tree
- **Action**: Attempt proof generation
- **Expected**: Cannot produce valid proof

---

## 8. Nullifier

### T-800: Nullifier deterministic for same identity + scope
- **Setup**: Same `identity_secret`, same `scope = Poseidon(domain_tag, subject_id, epoch_id)`
- **Action**: Compute nullifier twice
- **Expected**: Identical `nullifier_hash` both times

### T-801: Nullifier differs across subjects
- **Setup**: Same identity, different `subject_id` values
- **Action**: Compute nullifiers
- **Expected**: Different `nullifier_hash` values

### T-802: Nullifier differs across epochs
- **Setup**: Same identity, same subject, different `epoch_id`
- **Action**: Compute nullifiers
- **Expected**: Different `nullifier_hash` values

### T-803: Scope derivation matches spec
- **Setup**: Known `domain_tag`, `subject_id`, `epoch_id`
- **Action**: Compute `scope = Poseidon(domain_tag, subject_id, epoch_id)`
- **Expected**: Matches reference computation

### T-804: `epoch_id` derivation matches spec
- **Setup**: Known `subject_id`, `time_window_id`
- **Action**: Compute `epoch_id = hash(subject_id || time_window_id)`
- **Expected**: Matches reference computation

### T-805: Verifier recomputes scope and confirms match
- **Setup**: Proof with `scope` as public input
- **Action**: Verifier independently computes scope from known public values
- **Expected**: Computed scope matches proof's public input

---

## 9. Verification Pipeline (Review Gateway)

Each step in the pipeline has positive and negative tests. The pipeline is ordered cheapest-first; each step maps to exactly one reject code.

### Step 1: Signature Verification

#### T-900: Valid Ed25519 signature passes
- **Setup**: Correctly signed submission
- **Action**: Step 1 check
- **Expected**: Pass

#### T-901: Invalid signature rejected
- **Setup**: Submission with corrupted signature
- **Action**: Step 1 check
- **Expected**: Reject with `invalid_signature`

#### T-902: Signature over wrong payload rejected
- **Setup**: Signature is valid for different body content
- **Action**: Step 1 check
- **Expected**: Reject with `invalid_signature`

### Step 2: Schema Validation

#### T-910: Valid schema passes
- **Setup**: Well-formed `proof_bundle` with all required fields
- **Action**: Step 2 check
- **Expected**: Pass

#### T-911: Missing required field rejected
- **Setup**: `proof_bundle` missing `nullifier_hash`
- **Action**: Step 2 check
- **Expected**: Reject with `invalid_schema`

#### T-912: Extra unexpected fields tolerated or rejected (per policy)
- **Setup**: `proof_bundle` with unknown extra field
- **Action**: Step 2 check
- **Expected**: Behavior matches chosen schema validation policy (strict or permissive)

### Step 3: Proof Version

#### T-920: Supported proof version passes
- **Setup**: `proof_version` in the set of active versions
- **Action**: Step 3 check
- **Expected**: Pass

#### T-921: Unsupported proof version rejected
- **Setup**: `proof_version = "v999"`
- **Action**: Step 3 check
- **Expected**: Reject with `unsupported_proof_version`

#### T-922: `proof_version` checked before bundle unpacking
- **Setup**: Unsupported version + malformed bundle
- **Action**: Submit
- **Expected**: Reject with `unsupported_proof_version` (not `invalid_schema`)

### Step 4: Epoch Context

#### T-930: Matching epoch passes
- **Setup**: Proof `epoch_id` matches server-derived `epoch_id`
- **Action**: Step 4 check
- **Expected**: Pass

#### T-931: Mismatched epoch rejected
- **Setup**: Proof `epoch_id` differs from server-derived value
- **Action**: Step 4 check
- **Expected**: Reject with `invalid_epoch_context`

#### T-932: Server derives epoch authoritatively
- **Setup**: Submission with no client `epoch_id` field at top level
- **Action**: Gateway derives `epoch_id = hash(subject_id || time_window_id)` from policy context
- **Expected**: Derived epoch used for all downstream checks

### Step 5: Root Verification

#### T-940: Active root passes
- **Setup**: `cohort_root_hash` matches an active root for the subject
- **Action**: Step 5 check
- **Expected**: Pass

#### T-941: Unknown root rejected
- **Setup**: `cohort_root_hash` not in roots table
- **Action**: Step 5 check
- **Expected**: Reject with `inactive_root`

#### T-942: Expired root rejected
- **Setup**: `cohort_root_hash` exists but `valid_to` is in the past
- **Action**: Step 5 check
- **Expected**: Reject with `inactive_root`

### Step 6: k_min Threshold

#### T-950: Cohort above k_min passes
- **Setup**: Root with `k_size = 75`, `k_min = 50`
- **Action**: Step 6 check
- **Expected**: Pass

#### T-951: Cohort below k_min hard-rejected
- **Setup**: Root with `k_size = 30`, `k_min = 50`
- **Action**: Step 6 check
- **Expected**: Reject with `insufficient_anonymity_set`

#### T-952: k_size read from server, not client
- **Setup**: Client submits bundle claiming large cohort; server root has `k_size < k_min`
- **Action**: Step 6 check
- **Expected**: Reject with `insufficient_anonymity_set` (server-side k_size used)

#### T-953: Below-k_min never admitted or held
- **Setup**: Submission that would pass all other checks but `k_size < k_min`
- **Action**: Full pipeline
- **Expected**: Reject (not admitted/held/deferred)

### Step 7: Membership Proof

#### T-960: Valid ZK membership proof passes
- **Setup**: Valid Semaphore v4 proof against active root
- **Action**: Step 7 check
- **Expected**: Pass

#### T-961: Invalid membership proof rejected
- **Setup**: Corrupted or forged membership proof
- **Action**: Step 7 check
- **Expected**: Reject with `invalid_membership_proof`

### Step 8: Interaction Receipt

#### T-970: Valid interaction proof passes
- **Setup**: Valid `(r, S, keyset_id)` for correct subject
- **Action**: Step 8 check
- **Expected**: Pass

#### T-971: Invalid interaction proof rejected
- **Setup**: Invalid RSA signature, wrong keyset, spent receipt
- **Action**: Step 8 check
- **Expected**: Reject with `invalid_interaction_proof`

### Step 9: Time-Window Proof

#### T-980: Valid timeblind proof passes
- **Setup**: Valid ZK time-window proof; `window_start`/`window_end` match server-authoritative bounds
- **Action**: Step 9 check
- **Expected**: Pass

#### T-981: Invalid timeblind proof rejected
- **Setup**: Corrupted time-window proof
- **Action**: Step 9 check
- **Expected**: Reject with `invalid_timeblind_proof`

#### T-982: Window bounds mismatch rejected
- **Setup**: Client-submitted `window_start`/`window_end` differ from server's authoritative bounds for `time_window_id`
- **Action**: Step 9 check
- **Expected**: Reject with `invalid_timeblind_proof`

### Step 10: Nullifier Uniqueness

#### T-990: Unique nullifier passes
- **Setup**: `nullifier_hash` not in nullifiers table for `(subject_id, epoch_id)`
- **Action**: Step 10 check
- **Expected**: Pass; nullifier stored

#### T-991: Duplicate nullifier rejected
- **Setup**: `nullifier_hash` already exists for `(subject_id, epoch_id)`
- **Action**: Step 10 check
- **Expected**: Reject with `duplicate_nullifier`

#### T-992: Same nullifier in different epoch passes
- **Setup**: Same `nullifier_hash`, different `epoch_id` (should not happen with correct construction, but test store isolation)
- **Action**: Step 10 check
- **Expected**: Pass (nullifier uniqueness is scoped to `(subject_id, epoch_id)`)

### Pipeline Order Tests

#### T-995: Cheapest checks run first
- **Setup**: Submission that fails both signature (step 1) and membership proof (step 7)
- **Action**: Submit
- **Expected**: Reject with `invalid_signature` (step 1 runs before step 7)

#### T-996: Each step has exactly one reject code
- **Setup**: Full set of reject codes
- **Action**: Map each verification step to its reject code
- **Expected**: 1:1 mapping, 10 steps, 10 codes

#### T-997: Rejected submission does not consume nullifier
- **Setup**: Submission that fails at step 8 (interaction proof)
- **Action**: Submit, then submit a corrected version with same nullifier
- **Expected**: Corrected version accepted (nullifier was not consumed by the rejection)

---

## 10. Review Lifecycle

### T-1000: Admitted review not visible in feed
- **Setup**: Successfully admitted review (`status = admitted`)
- **Action**: `GET /v1/subjects/{subject_id}/reviews`
- **Expected**: Review not in response

### T-1001: Gateway returns `admitted` with `held_reason`
- **Setup**: Valid submission during open window
- **Action**: `POST /v1/reviews/submit`
- **Expected**: `status: "admitted"`, `held_reason` present (e.g., `"window_open"`)

### T-1002: Gateway never returns `published` synchronously
- **Setup**: Any valid submission
- **Action**: `POST /v1/reviews/submit`
- **Expected**: `status` is `"admitted"` or `"rejected"`, never `"published"`

### T-1003: Batch release transitions all held reviews
- **Setup**: Multiple admitted reviews for `(subject_id, time_window_id)`; window now closed; `t_min` met
- **Action**: Trigger batch release
- **Expected**: All reviews transition to `published` simultaneously

### T-1004: Batch release does not occur while window is open
- **Setup**: Admitted reviews; window still open
- **Action**: Attempt batch release
- **Expected**: No reviews published; status remains `admitted`

### T-1005: Batch release blocked when `t_min` not met
- **Setup**: Window closed; only 10 receipts issued (`t_min = 20`)
- **Action**: Attempt batch release
- **Expected**: Reviews remain `admitted`; not published

### T-1006: Published reviews in randomized order
- **Setup**: 20 reviews batch-released
- **Action**: Query feed multiple times; compare order
- **Expected**: Order is not submission order (randomized within batch)

### T-1007: Window merge for undersized windows
- **Setup**: Reviews held in weekly window that never met `t_min`
- **Action**: System merges into biweekly window
- **Expected**: Reviews now belong to the larger window; published when merged window meets `t_min`

### T-1008: Rejected submission does not consume nullifier
- **Setup**: Submission rejected at any pipeline step
- **Action**: Check nullifiers table
- **Expected**: No nullifier stored; reviewer can resubmit corrected proof

---

## 11. Adaptive Time Windows

### T-1100: Weekly window for high-volume subject
- **Setup**: Subject with 100+ receipts/week
- **Action**: Query cohort root endpoint
- **Expected**: `time_window_policy = "weekly"`

### T-1101: Biweekly window for medium-volume subject
- **Setup**: Subject with 20-99 receipts/week
- **Action**: Query cohort root endpoint
- **Expected**: `time_window_policy = "biweekly"`

### T-1102: Monthly window for moderate-volume subject
- **Setup**: Subject with 20+ receipts/month (but < 20/week)
- **Action**: Query cohort root endpoint
- **Expected**: `time_window_policy = "monthly"`

### T-1103: Quarterly window for low-volume subject
- **Setup**: Subject with < 20 receipts/month
- **Action**: Query cohort root endpoint
- **Expected**: `time_window_policy = "quarterly"` or suppressed with warning

### T-1104: All reviewers for a subject use same `time_window_id`
- **Setup**: Two reviewers for same subject in same period
- **Action**: Both query cohort root endpoint
- **Expected**: Same `time_window_id`, `window_start`, `window_end`

### T-1105: `receipt_volume_bucket` is coarse
- **Setup**: Subject with exactly 55 receipts
- **Action**: Query cohort root endpoint
- **Expected**: `receipt_volume_bucket = "medium"` (not exact count)

### T-1106: Volume bucket mapping
- **Setup**: Subjects with varying receipt volumes
- **Action**: Query cohort root endpoint for each
- **Expected**: `low` (< 20), `medium` (20-99), `high` (100+)

---

## 12. API Endpoints

### `GET /v1/subjects/{subject_id}/cohort-root`

#### T-1200: Returns all required fields
- **Setup**: Subject with active cohort
- **Action**: `GET /v1/subjects/{subject_id}/cohort-root`
- **Expected**: Response contains `distance_roots[]`, `epoch_id`, `time_window_id`, `time_window_policy`, `window_start`, `window_end`, `receipt_volume_bucket`, `k_min`, `t_min`

#### T-1201: `distance_roots` contains per-tier data
- **Setup**: Subject with d<=1, d<=2, d<=3 cohorts
- **Action**: Inspect `distance_roots` array
- **Expected**: Each entry has `distance_bucket`, `root_hash`, `k_size`

#### T-1202: `epoch_id` is server-authoritative
- **Setup**: Known subject and time window
- **Action**: Verify `epoch_id = hash(subject_id || time_window_id)`
- **Expected**: Matches expected derivation

### `POST /v1/reviews/submit`

#### T-1210: Valid submission returns admitted
- **Setup**: Complete valid `review_submission_v1`
- **Action**: Submit
- **Expected**: `status: "admitted"`, `held_reason` present, `verified_flags` all true

#### T-1211: Rejected submission returns reject code
- **Setup**: Submission with invalid signature
- **Action**: Submit
- **Expected**: `status: "rejected"`, `reject_code: "invalid_signature"`, `reject_detail` present

#### T-1212: `verified_flags` reflect individual checks
- **Setup**: Valid submission
- **Action**: Inspect `verified_flags`
- **Expected**: `membership_verified`, `interaction_verified`, `timeblind_verified`, `nullifier_unique`, `k_threshold_met` all true

### `GET /v1/subjects/{subject_id}/reviews`

#### T-1220: Returns only published reviews
- **Setup**: Mix of admitted and published reviews for subject
- **Action**: Query feed
- **Expected**: Only `status = published` reviews returned

#### T-1221: Filter by `max_distance`
- **Setup**: Reviews at d<=1, d<=2, d<=3
- **Action**: Query with `max_distance=1`
- **Expected**: Only d<=1 reviews returned

#### T-1222: Filter by `verified_only`
- **Setup**: Reviews with and without full verification
- **Action**: Query with `verified_only=true`
- **Expected**: Only fully verified reviews returned

#### T-1223: No `created_at` in response
- **Setup**: Published reviews
- **Action**: Inspect all response fields
- **Expected**: No `created_at` field present; only `time_window_id` as timing signal

#### T-1224: Per-review fields match spec
- **Setup**: Published review
- **Action**: Inspect response
- **Expected**: Contains `review_id`, `subject_id`, `content`, `time_window_id`, `distance_bucket`, `verification_badges`

### `GET /v1/reviews/{review_id}/verification`

#### T-1230: Returns proof metadata
- **Setup**: Published review
- **Action**: Query verification endpoint
- **Expected**: Proof metadata and verification status returned

#### T-1231: No exact timestamps in verification response
- **Setup**: Published review
- **Action**: Inspect response
- **Expected**: No `created_at`; `time_window_id` only

---

## 13. Privacy Protection

### T-1300: `created_at` never in any API response
- **Setup**: Make requests to all endpoints: cohort-root, submit, reviews feed, verification
- **Action**: Inspect all response bodies
- **Expected**: `created_at` field absent from every response

### T-1301: Published reviews contain no receipt data
- **Setup**: Published review
- **Action**: Inspect all public-facing fields
- **Expected**: No `r`, `S`, `Hash(r)`, or `keyset_id` in published data

### T-1302: Logs do not store witness material
- **Setup**: Submit a review; inspect server logs
- **Action**: Search logs for private witness data (identity secret, Merkle path, receipt secret, interaction timestamp)
- **Expected**: None found

### T-1303: Logs do not contain stable user identifiers
- **Setup**: Submit reviews from different identities; inspect logs
- **Action**: Search logs for persistent Nostr pubkeys, IP-to-identity mappings
- **Expected**: None found in admission-path logs

### T-1304: Batch release randomizes order
- **Setup**: Submit reviews in known order (A, B, C, D, E)
- **Action**: Trigger batch release; read feed
- **Expected**: Order differs from submission order

### T-1305: UI never shows exact interaction timestamp
- **Setup**: Render review in web-ui
- **Action**: Inspect all displayed fields
- **Expected**: Only `time_window_id` shown; no exact date/time of interaction

### T-1306: Remote prover fallback shows trust warning
- **Setup**: User opts in to remote proving
- **Action**: Check UI before proof generation
- **Expected**: Explicit trust warning displayed before any witness data leaves device

---

## 14. Adversarial / Security

### T-1400: Replay attack — same payload resubmitted
- **Setup**: Valid submission admitted
- **Action**: Replay exact same payload
- **Expected**: Rejected with `duplicate_nullifier`

### T-1401: Proof bundle field tampering
- **Setup**: Valid proof bundle; tamper with one field (e.g., flip bit in `membership_proof`)
- **Action**: Submit
- **Expected**: Rejected at the corresponding verification step

### T-1402: Receipt substitution — wrong receipt for subject
- **Setup**: Valid receipt for subject A; submit for subject B
- **Action**: Submit
- **Expected**: Rejected with `invalid_interaction_proof` (keyset subject mismatch)

### T-1403: Root mismatch — proof built for stale root
- **Setup**: Proof built against root that has since expired
- **Action**: Submit
- **Expected**: Rejected with `inactive_root`

### T-1404: Timestamp narrowing below policy minimum
- **Setup**: Client submits with `window_start = window_end` (zero-width window)
- **Action**: Submit
- **Expected**: Rejected with `invalid_timeblind_proof` (bounds don't match server's authoritative window)

### T-1405: Forged membership proof
- **Setup**: Fabricated Groth16 proof (not generated by Semaphore circuit)
- **Action**: Submit
- **Expected**: Rejected with `invalid_membership_proof`

### T-1406: Modified `cohort_root_hash` in bundle
- **Setup**: Valid proof but `cohort_root_hash` changed to different value
- **Action**: Submit
- **Expected**: Rejected (either `inactive_root` if fake root, or `invalid_membership_proof` if proof doesn't match)

### T-1407: Concurrent duplicate nullifier race condition
- **Setup**: Two identical submissions sent simultaneously
- **Action**: Submit both in parallel
- **Expected**: Exactly one admitted, one rejected with `duplicate_nullifier`; no double-admission

### T-1408: Issuer collusion — receipt for non-customer
- **Setup**: Issuer creates receipt without real interaction
- **Action**: Submit with colluded receipt
- **Expected**: Passes verification (this is a known residual risk; test confirms system behavior; mitigation is governance)

---

## 15. Nullifier Store

### T-1500: Store nullifier on admission
- **Setup**: Valid submission admitted
- **Action**: Query nullifiers table
- **Expected**: Row exists with `subject_id`, `epoch_id`, `nullifier_hash`, `first_seen_at`

### T-1501: No nullifier stored on rejection
- **Setup**: Submission rejected at any step
- **Action**: Query nullifiers table
- **Expected**: No row for this `nullifier_hash`

### T-1502: Nullifier scoped to `(subject_id, epoch_id)`
- **Setup**: Same `nullifier_hash`, different `(subject_id, epoch_id)` pairs
- **Action**: Store and query
- **Expected**: Each pair treated independently

### T-1503: Nullifier integrity survives gateway restart
- **Setup**: Admit a review (nullifier stored); restart gateway
- **Action**: Replay submission
- **Expected**: Rejected with `duplicate_nullifier` (state persisted in PostgreSQL)

---

## 16. Spent Receipts Store

### T-1600: `receipt_hash` stored on admission
- **Setup**: Valid submission admitted
- **Action**: Query spent_receipts table
- **Expected**: Row with `receipt_hash = Hash(r)`, `subject_id`, `spent_at`

### T-1601: Spent receipt blocks reuse in any epoch
- **Setup**: Receipt spent in epoch E1; attempt use in epoch E2
- **Action**: Submit
- **Expected**: Rejected with `invalid_interaction_proof` (spent-receipts table is epoch-independent)

### T-1602: Different receipts with same subject accepted
- **Setup**: Two different receipts (different `r` values) for same subject
- **Action**: Submit both
- **Expected**: Both admitted (different `receipt_hash` values)

---

## 17. Storage Model

### T-1700: `roots` table schema
- **Setup**: Database migration
- **Action**: Inspect table
- **Expected**: Columns: `root_id`, `subject_id`, `root_hash`, `k_size`, `distance_bucket`, `graph_snapshot_hash`, `valid_from`, `valid_to`

### T-1701: `reviews` table schema
- **Setup**: Database migration
- **Action**: Inspect table
- **Expected**: Columns: `review_id`, `subject_id`, `epoch_id`, `content_ref`, `proof_ref`, `distance_bucket`, `status`, `time_window_id`, `created_at`

### T-1702: `nullifiers` table schema
- **Setup**: Database migration
- **Action**: Inspect table
- **Expected**: Columns: `subject_id`, `epoch_id`, `nullifier_hash`, `first_seen_at`

### T-1703: `spent_receipts` table schema
- **Setup**: Database migration
- **Action**: Inspect table
- **Expected**: Columns: `receipt_hash`, `subject_id`, `spent_at`

### T-1704: `issuer_registry` table schema
- **Setup**: Database migration
- **Action**: Inspect table
- **Expected**: Columns: `keyset_id`, `subject_id`, `keyset_start`, `keyset_end`, `public_key`, `issuer_id`

---

## 18. Performance

### T-1800: Submit latency p50 < target
- **Setup**: Baseline valid submissions
- **Action**: Measure end-to-end latency for 100 submissions
- **Expected**: p50 within acceptable threshold (define during Step 0)

### T-1801: Submit latency p95 < target
- **Setup**: Same as T-1800
- **Action**: Measure p95
- **Expected**: Within acceptable threshold

### T-1802: Verification throughput under concurrent load
- **Setup**: 50 concurrent submissions
- **Action**: Measure gateway throughput
- **Expected**: No deadlocks, no dropped submissions, acceptable throughput

### T-1803: Nullifier store lookup latency
- **Setup**: Table with 100k+ entries
- **Action**: Query for existence of a nullifier
- **Expected**: Latency within acceptable threshold

### T-1804: Local proving time (browser WASM)
- **Setup**: snarkjs WASM build in target browser
- **Action**: Generate full proof bundle
- **Expected**: Acceptable time on target hardware (define during Step 0)

---

## 19. Reliability

### T-1900: Gateway restart preserves nullifier integrity
- **Setup**: Admit reviews; restart gateway process
- **Action**: Attempt replay of admitted submission
- **Expected**: Rejected with `duplicate_nullifier`

### T-1901: Root refresh does not admit proofs against expired roots
- **Setup**: Proof built against root R1; R1 expires; R2 published
- **Action**: Submit proof against R1
- **Expected**: Rejected with `inactive_root`

### T-1902: Partial service failure returns deterministic error
- **Setup**: Kill nullifier store; submit review
- **Action**: Observe gateway response
- **Expected**: Deterministic error state (not silent admission or data corruption)

### T-1903: Batch release is idempotent
- **Setup**: Trigger batch release for same window twice
- **Action**: Second trigger
- **Expected**: No duplicate publications; already-published reviews unaffected

---

## 20. Security Regression Checklist

These tests guard against regressions in security-critical behavior.

### T-2000: Reject code set is stable
- **Setup**: Compare current reject codes against spec
- **Action**: Verify 10 codes match the Reject Code Canon
- **Expected**: Exact match; no additions, removals, or renaming without versioned migration

### T-2001: Proof artifact pinning enforced
- **Setup**: Compare deployed `circuit_hash` and `verifying_key_hash` against pinned values
- **Action**: Verify match
- **Expected**: Exact match; deployment blocked if mismatch

### T-2002: `k_min` policy unchanged
- **Setup**: Check runtime `k_min` value
- **Action**: Compare against spec default (50)
- **Expected**: Matches unless explicitly versioned change

### T-2003: Nullifier scope unchanged
- **Setup**: Verify scope derivation logic
- **Action**: Compute `scope = Poseidon(domain_tag, subject_id, epoch_id)` with known inputs
- **Expected**: Matches reference; any change requires migration

### T-2004: Logging policy unchanged
- **Setup**: Review log output configuration
- **Action**: Verify no witness material, no stable identifiers in logs
- **Expected**: Passes; any change requires security review

---

## 21. End-to-End Integration

### T-2100: Full happy path — submission to publication
- **Steps**:
  1. Create identity, derive posting key
  2. Ingest WoT graph, build cohort roots
  3. Obtain interaction receipt via blind signing
  4. Query cohort root endpoint for subject context
  5. Generate full proof bundle (membership + interaction + timeblind + nullifier)
  6. Submit review
  7. Verify `admitted` response
  8. Close time window, trigger batch release
  9. Query feed, verify review is published
- **Expected**: Review appears in feed with correct `time_window_id`, `distance_bucket`, `verification_badges`

### T-2101: Full rejection path — invalid membership
- **Steps**: Same as T-2100, but identity is not in the cohort tree
- **Expected**: Rejected at step 7 with `invalid_membership_proof`; nullifier not consumed; reviewer can fix and retry

### T-2102: Full rejection path — spent receipt
- **Steps**: Two submissions using same receipt
- **Expected**: First admitted; second rejected with `invalid_interaction_proof`

### T-2103: Cross-epoch re-review
- **Steps**:
  1. Submit and get admitted in epoch E1
  2. New time window opens (epoch E2)
  3. Obtain new receipt from new interaction
  4. Submit for same subject in epoch E2
- **Expected**: Second submission admitted (different epoch, different receipt)

### T-2104: Pre-submission disclosure accuracy
- **Steps**:
  1. Query cohort root endpoint
  2. Display disclosure to user (window size, anonymity set, t_min status)
  3. Compare displayed values to API response
- **Expected**: All disclosed values match API response exactly

### T-2105: Multi-subject isolation
- **Steps**: Same identity submits reviews for subjects A and B
- **Expected**: Different nullifiers, independent admission, no cross-subject data leakage

---

## Test Count Summary

| Section | Tests |
|---------|-------|
| 1. Identity Client | 3 |
| 2. WoT Indexer | 10 |
| 3. Cohort Root Publisher | 5 |
| 4. Receipt Issuer | 8 |
| 5. Receipt Verifier | 7 |
| 6. Time-Window Circuit | 6 |
| 7. Membership Proof | 3 |
| 8. Nullifier | 6 |
| 9. Verification Pipeline | 28 |
| 10. Review Lifecycle | 9 |
| 11. Adaptive Time Windows | 7 |
| 12. API Endpoints | 12 |
| 13. Privacy Protection | 7 |
| 14. Adversarial / Security | 9 |
| 15. Nullifier Store | 4 |
| 16. Spent Receipts Store | 3 |
| 17. Storage Model | 5 |
| 18. Performance | 5 |
| 19. Reliability | 4 |
| 20. Security Regression | 5 |
| 21. End-to-End Integration | 6 |
| **Total** | **152** |

## Spec References

All tests derive from frozen spec in `mvp/`:
- `mvp/03-proof-spec.md` — proof statements, admission pseudocode, test cases
- `mvp/09-event-and-api-spec.md` — API contracts, schemas, reject codes
- `mvp/10-test-plan.md` — functional, policy, adversarial, privacy, performance, reliability categories
- `mvp/11-time-window-policy.md` — time-window circuit, adaptive windows, batch release
- `mvp/12-receipt-spec.md` — receipt lifecycle, RSABSSA, issuer binding
- `mvp/02-architecture.md` — components, verification pipeline, Nostr ingestion rules
- `mvp/06-trust-model-and-risk-mitigation.md` — trust boundaries, security regression checklist
