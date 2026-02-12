# BBS+ signatures: selective disclosure credentials

## What it is

BBS+ is a signature scheme that lets an issuer sign a set of attributes (a "credential") and the holder can later selectively reveal *some* attributes while proving the hidden ones exist and were signed -- all without revealing them. The issuer cannot track when or how the credential is used.

Think of it as a driver's license where you can prove you're over 21 without showing your name, address, or license number -- and the DMV can't track where you used it.

## How it applies to this review system

BBS+ is the most powerful option for **structured proof-of-interaction credentials**. Where blind signatures prove "the business signed *something*," BBS+ proves "the business signed *these specific attributes*, and here are the ones I'm choosing to reveal."

### Example: restaurant credential

A restaurant issues a BBS+ credential with attributes:
- `business_id`: "bobs-burger-bar"
- `date`: "2026-01-15"
- `service_type`: "dine-in"
- `price_range`: "$30-50"
- `party_size`: "2"
- `customer_commitment`: (a blinded value linking to the customer)

When reviewing, the customer reveals only:
- `business_id`: "bobs-burger-bar"
- `date`: "2026-01-15" (or just "January 2026" using a range proof)

And proves in zero knowledge that the other attributes exist and were signed. The reader knows: "A real dine-in customer of Bob's Burger Bar in January 2026 wrote this review." The restaurant cannot determine which customer from that period.

### Example: beauty product credential

A brand issues a credential with:
- `product_id`: "vitamin-c-serum-30ml"
- `batch_number`: "B2026-0142"
- `purchase_channel`: "sephora"
- `authenticity`: "verified-genuine"

The reviewer reveals `product_id` and `authenticity`, hiding everything else. The review proves: "This person bought the genuine product." Counterfeits can't generate valid credentials.

## Why BBS+ vs. plain blind signatures

| Capability | Blind signatures | BBS+ |
|---|---|---|
| Proves business signed something | Yes | Yes |
| Unlinkable to specific customer | Yes | Yes |
| Encodes structured attributes | No | Yes |
| Selective disclosure of attributes | No | Yes |
| Proves hidden attributes exist | No | Yes |
| Credential reuse for multiple proofs | No (single-use) | Yes |

BBS+ is strictly more powerful. The trade-off is complexity.

## Practical maturity

BBS+ is on the path to standardization and has production-quality implementations:

- **IETF standardization**: `draft-irtf-cfrg-bbs-signatures` is actively progressing through the IRTF Crypto Forum Research Group.
- **ISO standardization**: ISO/IEC 24843 (Anonymous Digital Credentials).
- **EU adoption**: Being evaluated for the EU Digital Identity Wallet (eIDAS 2.0). Serious institutional backing.
- **Hyperledger AnonCreds v2**: Transitioning from older CL signatures to BBS+ as the default. Production-grade Rust implementation.

### Libraries

- `@mattrglobal/bbs-signatures` (JavaScript/WASM, built on Rust) -- from MATTR, a leading verifiable credentials company
- `bbs` Rust crate
- Hyperledger `anoncreds-v2-rs` (Rust)
- Multiple Go implementations

## The curve problem

BBS+ requires **pairing-friendly elliptic curves**, specifically BLS12-381. Nostr uses **secp256k1**. These are different curves. This means:

- Users would need a BLS12-381 key pair *in addition to* their Nostr key pair for BBS+ credential operations.
- The Nostr key pair remains the primary identity. The BLS12-381 key pair is derived or linked for credential-specific operations.
- This adds key management complexity but is solvable (derive the BLS key deterministically from the Nostr private key).

This is the main practical friction point. Everything else about BBS+ is a clean fit.

## Trade-offs

- **Separate curve**: Requires BLS12-381 keys, not natively compatible with Nostr's secp256k1. Adds complexity.
- **More complex than blind signatures**: The business needs to understand the attribute schema and issue structured credentials. More integration work than "sign this blinded value."
- **Verification cost**: BBS+ verification involves pairing operations, which are computationally more expensive than standard signature verification. Still fast (milliseconds on modern hardware) but heavier than Schnorr verification.
- **Credential revocation**: If a business needs to revoke a credential (e.g., a refunded transaction), this requires an additional revocation mechanism (accumulator-based revocation is the standard approach).
- **Long-term investment**: BBS+ is the technically superior solution for structured proof-of-interaction, but it's also the most complex to implement. Blind signatures or Cashu tokens may be the right starting point, with BBS+ as the upgrade path when structured credentials become necessary.
