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
4. `time_window_id` (identifies the window period)
5. `window_start` (unix timestamp, beginning of window)
6. `window_end` (unix timestamp, end of window)
7. `scope` (derived: `Poseidon(domain_tag, subject_id, epoch_id)`)
8. `nullifier_hash`
9. `proof_version`

## Private Inputs (Witness)

1. Identity secret material for cohort membership path
2. Merkle path to cohort root
3. Receipt secret/token and issuer witness data
4. Interaction timestamp witness

## Nullifier Construction

Uses Semaphore v4's native two-input nullifier directly:

```
nullifier = Poseidon(identity_secret, scope)
```

Application context is packed into a single `scope` value:

```
scope = Poseidon(domain_tag, subject_id, epoch_id)
```

Where:

- `domain_tag`: fixed application constant identifying this protocol (e.g., `Poseidon("arrival-review-v1")`)
- `subject_id`: the reviewed entity key, encoded as a BN254 scalar field element
- `epoch_id`: the epoch identifier, derived per `02-architecture.md`

The verifier independently computes `scope` from known public values and confirms it matches the proof's public input before accepting the proof.

This uses Semaphore v4's existing circuit and Groth16 trusted setup ceremony unmodified. No custom nullifier circuit is needed.

Requirements:

1. Deterministic within context (guaranteed by Poseidon determinism and fixed input encoding)
2. Unlinkable across subjects/epochs (different scope per context)
3. Collision-resistant (inherited from Poseidon over BN254 scalar field)

## TimeBlind Policy

1. Allowed windows: weekly, biweekly, monthly, or quarterly (see `11-time-window-policy.md` for adaptive sizing rules)
2. Exact timestamp is never a public field
3. Reject narrow windows below policy minimum

## Admission Policy (Pseudocode)

```text
if !validate_schema(bundle): reject("invalid_schema")
if !supported_proof_version(proof_version): reject("unsupported_proof_version")
if !root_active(subject_id, cohort_root_hash): reject("inactive_root")
if server_k_size(cohort_root_hash) < k_min: reject("insufficient_anonymity_set")
# k_size is always read from the server-side roots table, never from client input
if !verify_membership(bundle): reject("invalid_membership_proof")
if !verify_interaction(bundle): reject("invalid_interaction_proof")
if !window_bounds_match(time_window_id, window_start, window_end): reject("invalid_timeblind_proof")
# verifier looks up authoritative window bounds for time_window_id and confirms
# client-submitted window_start/window_end match exactly
if !verify_timeblind(bundle): reject("invalid_timeblind_proof")
if nullifier_exists(subject_id, epoch_id, nullifier_hash): reject("duplicate_nullifier")
store_nullifier(subject_id, epoch_id, nullifier_hash)
admit()
# admit() stores the review with status "admitted" (held).
# Admission is not publication. Publication happens at batch release
# when the time window closes and t_min is met. See 11-time-window-policy.md.
```

## Versioning Rules

1. `proof_version` is a top-level submission field and must be explicit in every submission
2. Verifier must validate `proof_version` before unpacking `proof_bundle`
3. Verifier supports a bounded set of active versions
4. Circuit/proof upgrades require:
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
