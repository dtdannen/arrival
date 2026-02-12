# AgentShield — Technical Implementation

## ZK Primitives
- BBS+ signatures for selective disclosure of agent properties
- TEE attestation (simulated or via AWS Nitro) wrapped in ZK proofs for hardware claims
- Bulletproof range proofs for numerical property thresholds

## NIPs Involved
- NIP-89 (capability profiles enhanced with ZK property proofs)
- NIP-58 (property badges with ZK verification)
- NIP-98 (HTTP auth extended with selective disclosure)

## Architecture
Trusted verifier (or threshold set) issues BBS+ signed credential with all verified attributes. Agent constructs selective disclosure proof revealing only requested properties. Bulletproof range proofs for numerical thresholds. TEE attestation hash included as credential attribute.

## Build Breakdown
| Phase | Time |
|-------|------|
| Agent property credential schema | 1h |
| BBS+ credential issuance flow | 2h |
| Selective disclosure proof generation | 2.5h |
| Bulletproof range proofs for numerical thresholds | 2h |
| NIP-89 profile with ZK property proofs | 1.5h |
| Verification in browser client | 1.5h |
| Demo | 0.5h |

## Complexity: 11 hours
