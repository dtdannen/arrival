# MVP Architecture

## Components

1. `identity-client`
   - manages persistent identity for WoT participation
   - derives one-time review posting keys
2. `wot-indexer`
   - ingests follow graph data
   - computes subject-relevant cohorts
3. `cohort-root-publisher`
   - builds cohort Merkle trees per distance tier (`d<=1`, `d<=2`, `d<=3`) for each subject
   - publishes roots and metadata including distance bucket and cohort size per tier
4. `receipt-issuer` / `receipt-verifier`
   - issues and validates blind-signed interaction receipts (see `12-receipt-spec.md`)
   - issuer maintains per-subject keysets with temporal rotation
5. `proof-engine`
   - generates membership/time/nullifier proof bundle
   - local-first, optional remote fallback
6. `review-gateway`
   - verifies full proof bundle
   - applies admission policy
7. `nullifier-store`
   - tracks used nullifiers by context
8. `review-feed-api`
   - serves admitted reviews with verification metadata
9. `web-ui`
   - submission flow
   - verified review browsing and filtering

## Subject Context Model

`subject_id` is the reviewed entity key (business, product, location profile).

`epoch` defaults to weekly bucket:

`epoch_id = hash(subject_id || iso_week)`

`epoch_id` is server-authoritative. The gateway derives `epoch_id` from policy and context, and rejects submissions whose proof public input does not match the derived value.

## End-to-End Submission Flow

1. User selects subject and writes review text/media.
2. Client fetches latest cohort root metadata for subject, including authoritative epoch context.
3. Client attaches interaction receipt witness.
4. Client receives system-assigned time window from cohort-root endpoint and constructs time-window witness (see `11-time-window-policy.md`).
5. Client generates proof bundle:
   - membership proof
   - interaction proof
   - time-window proof
   - scoped nullifier
6. Client submits review with one-time posting key and proof bundle (no top-level client epoch override).
7. Gateway verifies bundle and checks nullifier uniqueness.
8. If admitted, review is stored with status `admitted` (held). Nullifier is consumed. Review is not yet visible in the feed.
9. If rejected, response includes deterministic reject code. Nullifier is not consumed.
10. At window close, batch release job checks `t_min` and publishes all held reviews for the window simultaneously in randomized order (status → `published`). See `11-time-window-policy.md` for batch release rules.

## Verification Pipeline

Steps are ordered cheapest-first. Each step maps to exactly one reject code (see `09-event-and-api-spec.md` Reject Code Canon). The canonical pseudocode is in `03-proof-spec.md`.

1. Verify `signature` against `posting_pubkey` over canonical body serialization. → `invalid_signature`
2. Validate proof bundle schema. → `invalid_schema`
3. Validate `proof_version` is supported. → `unsupported_proof_version`
4. Derive authoritative `epoch_id` from `subject_id` and epoch policy context; reject if proof public input mismatches. → `invalid_epoch_context`
5. Verify subject root exists and is active. → `inactive_root`
6. Enforce `k_min` threshold from root metadata; below-threshold submissions are hard-rejected (not deferred). → `insufficient_anonymity_set`
7. Verify WoT membership proof against active root. → `invalid_membership_proof`
8. Verify interaction receipt signature/proof. → `invalid_interaction_proof`
9. Verify time-window bounds match and time-window proof. → `invalid_timeblind_proof`
10. Check nullifier uniqueness in `(subject_id, epoch_id)` using the authoritative derived `epoch_id`. → `duplicate_nullifier`
11. Admit (held for batch release) or reject.

## Storage Model (MVP)

1. `roots` table
   - `root_id`, `subject_id`, `root_hash`, `k_size`, `distance_bucket`, `valid_from`, `valid_to`
   - one row per `(subject_id, distance_bucket)` per validity period
2. `reviews` table
   - `review_id`, `subject_id`, `epoch_id`, `content_ref`, `proof_ref`, `distance_bucket`, `status`, `time_window_id`, `created_at`
   - `status`: `admitted` (held, not visible) or `published` (batch-released, visible in feed)
   - `distance_bucket` is derived at admission from the root used in the membership proof
   - `time_window_id` links the review to its batch release window
3. `nullifiers` table
   - `subject_id`, `epoch_id`, `nullifier_hash`, `first_seen_at`
4. `receipts` table (optional cache)
   - `receipt_id`, `issuer_id`, `status`, `verified_at`

## Operational Defaults

1. Root refresh: daily or on significant WoT graph changes
2. Epoch size: weekly
3. Review publish delay: bucketed to reduce timing linkage
4. Logs: privacy-minimized by default
