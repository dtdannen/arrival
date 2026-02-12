# Anonymous Agent Reviews on Nostr — Technical Implementation

## ZK Primitive
DLEQ proofs from NUT-12 combined with Schnorr ring signatures. The agent proves possession of a valid Cashu token signed by a specific mint (proving payment occurred) without revealing which token, then posts a review under a one-time key.

## Libraries
- `cashu-ts` for token handling and DLEQ verification
- `nostr-tools` for event creation and relay publishing

## NIPs Involved
- NIP-90 (DVM job results as proof-of-interaction)
- NIP-61 (NutZaps as proof-of-payment)

## Architecture
After using a service (paid via Cashu), the agent posts a quality rating. The DLEQ proof demonstrates "I hold a token from Mint X" (proving legitimate use) without revealing the specific token or the agent's persistent identity.

## Bitcoin Integration
Cashu ecash (Lightning-backed) as proof of service usage.

## Build Breakdown
| Phase | Time |
|-------|------|
| Cashu token DLEQ extraction | 1.5h |
| Proof-of-payment verification logic | 2h |
| Anonymous Nostr event creation with embedded proof | 2h |
| Relay integration and demo | 1.5h |
| **Total** | **7 hours** |

## Demo
Agent pays for inference via Cashu, receives DLEQ proof, posts anonymous Nostr review with proof tag, verifier confirms "this reviewer genuinely paid for the service" without learning who they are.

## Complexity: Simple
