# AuditReview — Technical Implementation

## ZK Primitives
- zk-SNARKs (Groth16 or Plonk) for proving correct aggregation computation
- Merkle tree commitments to review set with ZK membership proofs
- Optional STARKs for transparency (no trusted setup)

## NIPs Involved
- NIP-90 (DVM services)
- Custom event kinds for: committed review sets, ZK aggregation proofs, fraud challenges

## Architecture
DVM maintains Merkle tree of review hash commitments published as NOSTR event. Generates zk-SNARK proof of correct arithmetic over all leaves. Proof published as NOSTR event. Verifiers check proof against Merkle root. Reviewers verify inclusion via Merkle paths. Missing reviews trigger fraud proofs.

## Build Breakdown
| Phase | Time |
|-------|------|
| Merkle tree commitment structure for reviews | 1.5h |
| Circom circuit for arithmetic aggregation verification | 3.5h |
| Groth16 proof generation and verification | 2h |
| Fraud proof mechanism (reviewer-submitted challenges) | 2h |
| NOSTR event flow for commitments, proofs, and challenges | 2h |
| Demo with honest and dishonest aggregator scenarios | 1h |

## Complexity: 12 hours
