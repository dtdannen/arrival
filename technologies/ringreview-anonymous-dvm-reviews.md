# RingReview — Technical Implementation

## ZK Primitives
- bLSAG ring signatures (nostringer-rs) for anonymous authorship with linkable key images as nullifiers
- Cashu blind signatures for anonymous proof-of-payment

## NIPs Involved
- NIP-90 (DVM job results as proof-of-interaction)
- NIP-61 (NutZaps as proof-of-payment)
- New custom event kind for ring-signed reviews extending NIP-58

## Architecture
DVM maintains public customer pubkey list from NIP-90 events. Reviewer constructs ring from customer set, produces bLSAG signature. Key image scoped to DVM pubkey ensures one review per customer.

## Build Breakdown
| Phase | Time |
|-------|------|
| Ring signature integration with nostringer-rs WASM | 2h |
| Custom NOSTR event kind for ring-signed reviews | 1h |
| DVM customer set extraction from NIP-90 events | 2h |
| Review submission and verification flow | 2h |
| Simple web client displaying verified anonymous reviews | 2h |
| Demo preparation | 1h |

## Complexity: 10 hours
