# Interaction Receipt Specification

## Purpose

This document specifies the interaction receipt system: what a receipt proves, how receipts are issued, how they bind to subjects and reviewers, and the privacy properties they provide.

The interaction receipt is the mechanism for MVP goal #3: "Proof of real interaction." A valid receipt proves that the reviewer interacted with the reviewed subject (purchased a product, used a service, visited a location) without revealing the reviewer's identity to the issuer, verifier, or public.

## Mechanism: Blind Signatures

Receipts use blind signatures. The reviewer blinds a secret value before sending it to the issuer for signing. The issuer signs the blinded value without seeing the original. The reviewer unblinds the signature, producing a valid signature over their secret that the issuer cannot link back to the specific signing request.

This provides the core privacy property: the issuer knows that *someone* interacted (they signed a blinding request), but cannot determine which unblinded receipt belongs to which interaction.

## Issuer

The issuer is the business or service provider (or their point-of-sale / payment system). Each issuer:

1. Registers with the system and receives an issuer identity
2. Maintains signing keysets scoped per `subject_id`
3. Rotates keysets on a fixed schedule for temporal binding (see Keyset Rotation below)

The verifier maintains an accepted issuer registry. Only receipts signed by accepted issuers are valid.

## Issuance Flow

1. Reviewer completes an interaction with the subject (purchase, service, visit).
2. Reviewer's client generates a random secret `r`.
3. Client computes blinded value `B = Blind(r)`.
4. Client sends `B` to the issuer's receipt endpoint.
5. Issuer signs with the active keyset for this `subject_id`: `S_blind = Sign(sk, B)`.
6. Client unblinds the signature: `S = Unblind(S_blind)`.
7. Client stores the receipt: `(r, S, subject_id, keyset_id)`.

The issuer does not learn `r` or `S`. The issuer only sees `B` (blinded) and `S_blind` (signature over blinded value).

## Binding Rules

### Subject Binding

Issuer signing keys are scoped per `subject_id`. A receipt signed by the keyset for subject A does not verify against subject B's keyset. The verifier rejects receipts where the `subject_id` in the proof bundle does not match the keyset's subject scope.

### Reviewer Binding

Only the reviewer knows the secret `r`. To use the receipt in a proof, the reviewer must present `(r, S)`. This is soft binding: the receipt is technically transferable if `r` is shared, but the one-receipt-one-review rule (below) limits the incentive to transfer.

### One-Receipt-One-Review

Each receipt can be used for exactly one review submission. At admission, the gateway computes `receipt_hash = Hash(r)` and checks it against a spent-receipts table. If `receipt_hash` exists, the submission is rejected with `invalid_interaction_proof`. If not, `receipt_hash` is stored as spent.

This is enforced server-side. The client cannot circumvent it.

## Keyset Rotation and Temporal Binding

Issuers rotate signing keysets on a fixed schedule (e.g., daily). Each keyset has a `keyset_id` that maps to a validity period `[keyset_start, keyset_end]`.

The keyset used to sign a receipt implicitly encodes when the interaction occurred. The verifier looks up the keyset's validity period and uses it as the interaction's time bound. This provides the `issuance_timestamp` range that the time-window proof circuit needs as private witness (see `11-time-window-policy.md`).

### Keyset rotation rules

1. Keyset validity periods must not overlap (deterministic temporal assignment)
2. Keyset granularity must be finer than the smallest time window (e.g., daily keysets for weekly windows)
3. The verifier maintains a registry of `keyset_id → (subject_id, keyset_start, keyset_end, public_key)`
4. Expired keysets remain in the registry for verification of previously-issued receipts

### Temporal binding flow

1. At issuance, the issuer uses the currently active keyset for the `subject_id`
2. The receipt carries `keyset_id` as metadata
3. At verification, the verifier looks up `keyset_id` to determine the interaction's time period
4. The verifier confirms the keyset's time period falls within the claimed `time_window_id`'s bounds
5. The reviewer uses the keyset's midpoint (or any timestamp within the keyset period) as the private `interaction_timestamp` witness in the time-window circuit

## Verification

At admission, the gateway performs these checks as part of `verify_interaction(bundle)`:

1. `keyset_id` maps to a known, accepted issuer for the claimed `subject_id`
2. `Verify(pk, r, S)` succeeds (valid blind signature)
3. `receipt_hash = Hash(r)` is not in the spent-receipts table
4. The keyset's validity period falls within the claimed time window's bounds
5. Store `receipt_hash` in spent-receipts table

## Privacy Properties

1. **Issuer unlinkability**: The issuer cannot link an unblinded receipt `(r, S)` to the blinded signing request `B` they processed. They know an interaction occurred but not which review it produced.
2. **Verifier unlinkability**: The verifier learns that a valid receipt exists for the subject but not which specific interaction event produced it (within the keyset's time period).
3. **No identity leakage**: The receipt does not contain or reveal the reviewer's persistent identity, WoT position, or Nostr keys.
4. **Temporal privacy**: The exact interaction timestamp is not revealed. Only the keyset period (coarse time bound) is known to the verifier, and the time-window proof further abstracts this into the declared window.

## Trust Boundaries

1. **The reviewer trusts** that the issuer's signing system is not compromised (issuer key security).
2. **The reviewer trusts** that the blinding scheme is correct (client-side crypto).
3. **The verifier trusts** the accepted issuer registry (issuer governance).
4. **The issuer is not trusted** to protect reviewer privacy — the blind signature scheme removes this trust requirement.
5. **Nobody trusts** the client for receipt validity — the server verifies the signature and checks the spent table.

## Residual Risks

1. **Issuer collusion**: An issuer could issue receipts to non-customers (fake interactions). Mitigated by issuer governance and reputation.
2. **Receipt farming**: An attacker could interact many times to accumulate receipts. Mitigated by one-receipt-one-review and economic cost of real interactions.
3. **Keyset compromise**: If an issuer's signing key is compromised, fake receipts can be generated. Mitigated by keyset rotation limiting the blast radius to one time period.
4. **Timing correlation at issuance**: If the issuer logs blinding request timestamps and few interactions occur, the issuer might narrow linkability. Mitigated by keyset granularity being coarser than individual interaction timing.

## Open Items (to close before build lock)

1. Specific blind signature scheme (RSA blind signatures, BDH-based, etc.)
2. Accepted issuer registry governance (who can register as an issuer, how are they vetted)
3. Keyset rotation schedule (daily recommended, but depends on interaction volume patterns)
4. Receipt expiration policy (how long after issuance a receipt remains usable)

## Test Requirements

1. Valid receipt with known keyset: accepted
2. Receipt with unknown `keyset_id`: rejected
3. Receipt with `keyset_id` for wrong `subject_id`: rejected
4. Invalid blind signature: rejected
5. Spent receipt (duplicate `receipt_hash`): rejected
6. Keyset period outside claimed time window: rejected
7. Issuer cannot link blinded request to unblinded receipt (unlinkability property test)
8. Receipt does not contain reviewer identity material
