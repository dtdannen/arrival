# NullReview — Technical Implementation

## ZK Primitives
- Poseidon-hash Merkle tree membership proofs with deterministic nullifiers (Semaphore pattern)
- PLUME nullifier scheme for secp256k1 compatibility

## NIPs Involved
- NIP-90 (DVM interactions)
- NIP-61 (payment proofs)
- Custom event kind for nullifier-gated reviews

## Architecture
DVM adds customer identity commitments (hash of secret + pubkey) to Merkle tree stored as NOSTR event. Customer generates ZK proof of membership with deterministic nullifier. Relays maintain nullifier set per DVM and reject duplicates.

## Build Breakdown
| Phase | Time |
|-------|------|
| Circom circuit for Merkle membership + nullifier generation | 3h |
| Merkle tree management on NOSTR events | 2h |
| PLUME nullifier integration for secp256k1 | 2h |
| Proof generation and verification flow | 2h |
| Relay-side nullifier deduplication plugin for strfry | 2h |
| Demo client | 1h |

## Complexity: 12 hours
