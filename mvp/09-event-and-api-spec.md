# Event and API Spec (MVP Draft)

## Core Event: `review_submission_v1`

## Body

1. `review_id` (uuid)
2. `subject_id` (string)
3. `epoch_id` (string)
4. `content` (text or content reference)
5. `posting_pubkey` (one-time key)
6. `proof_bundle` (object)
7. `created_at` (unix ts)
8. `proof_version` (string)

## `proof_bundle` fields

1. `cohort_root_hash`
2. `cohort_size`
3. `membership_proof`
4. `interaction_proof`
5. `timeblind_proof`
6. `time_window_id`
7. `nullifier_hash`

## Verification Result Object

1. `accepted` (bool)
2. `reject_code` (nullable string)
3. `reject_detail` (nullable string)
4. `verified_flags`:
   - `membership_verified`
   - `interaction_verified`
   - `timeblind_verified`
   - `nullifier_unique`
   - `k_threshold_met`

## API Endpoints

## `GET /v1/subjects/{subject_id}/cohort-root`

Returns:

1. active root hash
2. cohort size
3. validity window
4. proof policy metadata (`k_min`, allowed windows)

## `POST /v1/reviews/submit`

Input:

1. `review_submission_v1`

Output:

1. verification result object

## `GET /v1/subjects/{subject_id}/reviews`

Filters:

1. `verified_only=true|false`
2. `max_distance=1|2|3`
3. `time_window_id`

Returns:

1. admitted reviews
2. verification badges

## `GET /v1/reviews/{review_id}/verification`

Returns:

1. proof metadata and verification status for transparency/debug UX

## Reject Code Canon

1. `invalid_schema`
2. `inactive_root`
3. `insufficient_anonymity_set`
4. `invalid_membership_proof`
5. `invalid_interaction_proof`
6. `invalid_timeblind_proof`
7. `duplicate_nullifier`
8. `unsupported_proof_version`
