# TrustVeil — Technical Implementation

## ZK Primitives
- Merkle tree membership proofs (Poseidon hash) for proving inclusion in trusted set
- Bulletproof range proofs (native secp256k1) for proving score exceeds threshold T

## NIPs Involved
- NIP-85 (Trusted Assertions as input data)
- NIP-90 (WoT DVM for score computation)
- NIP-42 (relay AUTH extended with ZK proofs)

## Architecture
Vertex (or WoT DVM) publishes signed Merkle tree of qualifying pubkeys as NOSTR event. Agent obtains Merkle proof and generates ZK proof of membership + score threshold. Proof submitted via NIP-42 AUTH.

## Build Breakdown
| Phase | Time |
|-------|------|
| Merkle tree construction from NIP-85 trust data | 2h |
| Bulletproof range proof for score threshold | 2h |
| Merkle membership circuit | 3h |
| NIP-42 AUTH extension for ZK proof submission | 2h |
| Relay verification plugin (strfry writePolicy) | 1h |
| Demo | 1h |

## Complexity: 11 hours
