# Event and API Spec (MVP Draft)

## Core Event: `review_submission_v1`

## Body

1. `review_id` (uuid)
2. `subject_id` (string)
3. `content` (text or content reference)
4. `posting_pubkey` (one-time key)
5. `signature` (Ed25519 signature by `posting_pubkey` over canonical serialization of all other body fields)
6. `proof_bundle` (object)
7. `created_at` (unix ts; internal ingestion timestamp, not a public timing signal)
8. `proof_version` (string)

`proof_version` is intentionally top-level (not nested inside `proof_bundle`) so the gateway can version-gate before interpreting bundle internals.
`epoch_id` is not a top-level client field. The gateway derives authoritative `epoch_id` from policy context and rejects submissions whose proof public input `epoch_id` does not match (`invalid_epoch_context`).

## `proof_bundle` fields

1. `cohort_root_hash`
2. `membership_proof`
3. `interaction_proof`
4. `timeblind_proof`
5. `time_window_id`
6. `window_start` (unix timestamp)
7. `window_end` (unix timestamp)
8. `nullifier_hash`

`proof_bundle` must not contain `proof_version`; version selection is done at the top-level request schema.

## Verification Result Object

1. `status` (`"rejected"` | `"admitted"`)
2. `reject_code` (nullable string, present when rejected)
3. `reject_detail` (nullable string, present when rejected)
4. `held_reason` (nullable string, present when admitted; e.g. `"window_open"`, `"t_min_not_met"`)
5. `verified_flags`:
   - `membership_verified`
   - `interaction_verified`
   - `timeblind_verified`
   - `nullifier_unique`
   - `k_threshold_met`

The gateway never returns `"published"` synchronously. Publication happens at batch release (see `11-time-window-policy.md`). `"admitted"` means all proof checks passed and the review is held for batch release.

## API Endpoints

## `GET /v1/subjects/{subject_id}/cohort-root`

Returns:

1. `distance_roots` — array of `{ distance_bucket, root_hash, k_size }` for each tier (`d<=1`, `d<=2`, `d<=3`)
2. `epoch_id` (string, server-authoritative epoch for current submission context)
3. `time_window_id` (string, current active window)
4. `time_window_policy` (string: `"weekly"` | `"biweekly"` | `"monthly"` | `"quarterly"`)
5. `window_start` (unix timestamp)
6. `window_end` (unix timestamp)
7. `receipt_volume_bucket` (string: `"low"` | `"medium"` | `"high"` — coarse to avoid leaking exact sales data)
8. `k_min` (int)
9. `t_min` (int)

The client selects the closest (smallest) distance tier where `k_size >= k_min`. If no tier meets `k_min`, the review cannot be submitted. The client uses `epoch_id`, `window_start`, `window_end`, and `time_window_id` to construct proofs, but these are read-only policy values; the gateway recomputes authoritative context and hard-rejects below-`k_min` or invalid-epoch submissions.

## `POST /v1/reviews/submit`

Input:

1. `review_submission_v1`

Output:

1. verification result object

## `GET /v1/subjects/{subject_id}/reviews`

Filters:

1. `verified_only=true|false`
2. `max_distance=1|2|3` — filters on the `distance_bucket` stored at admission time, not computed per reader
3. `time_window_id`

Returns:

1. published reviews only (status = `published`; admitted-but-held reviews are not visible)
2. verification badges

## `GET /v1/reviews/{review_id}/verification`

Returns:

1. proof metadata and verification status for transparency/debug UX

## Reject Code Canon

1. `invalid_signature`
2. `invalid_schema`
3. `inactive_root`
4. `insufficient_anonymity_set`
5. `invalid_membership_proof`
6. `invalid_interaction_proof`
7. `invalid_timeblind_proof`
8. `duplicate_nullifier`
9. `unsupported_proof_version`
10. `invalid_epoch_context`
