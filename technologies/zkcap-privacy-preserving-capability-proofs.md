# zkCap — Technical Implementation

## ZK Primitives
- EZKL (Halo2 circuits from ONNX models) for proving model inference on benchmark dataset
- Merkle commitment to benchmark test set

## NIPs Involved
- NIP-89 (capability advertising with ZK proof attachments)
- NIP-90 (DVM kind for "capability verification" service)
- NIP-58 (ZK-verified capability badges)

## Architecture
Benchmark oracle publishes committed test set (Merkle root) as NOSTR event. DVM runs inference locally, uses EZKL to generate Halo2 proof. Proof (~85 KB) published referencing benchmark commitment and DVM's NIP-89 profile.

## Build Breakdown
| Phase | Time |
|-------|------|
| Benchmark oracle setup and test set commitment | 1.5h |
| Model export to ONNX and EZKL circuit generation | 3h |
| Proof generation pipeline | 2h |
| NOSTR event format for capability proofs | 1h |
| NIP-89 profile integration | 1.5h |
| Verification in browser via EZKL WASM verifier | 2h |
| Demo | 1h |

## Complexity: 12 hours
