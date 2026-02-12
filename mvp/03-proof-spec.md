# Proof Specification (MVP)

## Required Proof Statements

Each review submission must satisfy all four statements:

1. `Membership`
   - "I know a secret corresponding to a commitment included in the active WoT cohort root for this subject."
2. `Interaction`
   - "I possess a valid interaction receipt issued for this subject by an accepted issuer."
3. `TimeBlind`
   - "My interaction happened within an allowed time window."
4. `Uniqueness`
   - "My scoped nullifier for `(subject_id, epoch_id)` is unique."

## Public Inputs

1. `subject_id`
2. `epoch_id`
3. `cohort_root_hash`
4. `time_window_id` (week/month bucket)
5. `nullifier_hash`
6. `proof_version`

## Private Inputs (Witness)

1. Identity secret material for cohort membership path
2. Merkle path to cohort root
3. Receipt secret/token and issuer witness data
4. Interaction timestamp witness
5. Secret material used in nullifier derivation

## Nullifier Construction

`nullifier_hash = H(identity_secret, subject_id, epoch_id, domain_tag)`

Requirements:

1. Deterministic within context
2. Unlinkable across subjects/epochs
3. Collision-resistant under chosen hash function

## TimeBlind Policy

1. Allowed windows: weekly or monthly
2. Exact timestamp is never a public field
3. Reject narrow windows below policy minimum

## Admission Policy (Pseudocode)

```text
if !validate_schema(bundle): reject("invalid_schema")
if !root_active(subject_id, cohort_root_hash): reject("inactive_root")
if cohort_size(cohort_root_hash) < k_min: reject("insufficient_anonymity_set")
if !verify_membership(bundle): reject("invalid_membership_proof")
if !verify_interaction(bundle): reject("invalid_interaction_proof")
if !verify_timeblind(bundle): reject("invalid_timeblind_proof")
if nullifier_exists(subject_id, epoch_id, nullifier_hash): reject("duplicate_nullifier")
store_nullifier(subject_id, epoch_id, nullifier_hash)
accept()
```

## Versioning Rules

1. `proof_version` must be explicit in every submission
2. Verifier supports a bounded set of active versions
3. Circuit/proof upgrades require:
   - new version id
   - migration window
   - published changelog

## Test Cases

1. Valid bundle accepted
2. Invalid membership rejected
3. Invalid receipt rejected
4. Invalid time-window rejected
5. Duplicate nullifier rejected
6. Below-threshold cohort rejected
