# CashuReview — Technical Implementation

## ZK Primitives
- Cashu blind signatures (David Wagner variant) provide inherent unlinkability
- P2PK spending conditions serve as proof-of-payment receipts
- Optional DLEQ proofs for offline token validity verification

## NIPs Involved
- NIP-61 (NutZaps)
- NIP-90 (DVM jobs)
- NIP-60 (Cashu wallet state on NOSTR)

## Architecture
DVM operates a Cashu mint (or partners with one). Payment flow issues "review tokens." Agent creates throwaway NOSTR key, publishes review with token proof, token marked as spent. Blind signature ensures unlinkability.

## Build Breakdown
| Phase | Time |
|-------|------|
| Cashu mint integration with review token issuance | 2h |
| DVM payment flow modification to include review tokens | 2h |
| Review submission with token redemption | 1.5h |
| Token double-spend prevention | 1h |
| Web client for browsing anonymous reviews | 1.5h |

## Complexity: 8 hours
