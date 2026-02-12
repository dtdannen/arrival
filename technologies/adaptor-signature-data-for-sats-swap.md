# Adaptor Signature Data-for-Sats Swap — Technical Implementation

## ZK Primitive
Schnorr adaptor signatures. Agent A (data seller) creates a partial signature on a payment transaction locked to secret t; Agent B (buyer) can only claim payment by revealing t, which simultaneously unlocks the encrypted data.

## Libraries
- `musig2` Rust crate (supports adaptor signatures)
- `secp256k1-zkp` for low-level operations
- `rust-bitcoin` for transaction handling

## Architecture
Agent A encrypts the data with key derived from t, publishes adaptor signature. B verifies the adaptor, signs and broadcasts. A extracts B's contribution to complete payment, simultaneously revealing t, which B uses to decrypt.

## Bitcoin Integration
Native on-chain or Lightning payment with adaptor signatures.

## Build Breakdown
| Phase | Time |
|-------|------|
| Adaptor signature generation | 3h |
| Encrypted data bundle | 1.5h |
| Atomic swap protocol | 2.5h |
| End-to-end demo | 2h |
| **Total** | **9 hours** |

## Demo
Two terminal agents negotiating, Agent A posting adaptor-locked data, Agent B paying, both receiving their side atomically.

## Complexity: Simple
