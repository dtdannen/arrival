# AnonAttest — Technical Implementation

## ZK Primitives
- Ring signatures (nostringer-rs, SAG variant) for anonymous endorsements
- Bulletproof range proofs for proving endorser has sufficient trust standing

## NIPs Involved
- NIP-58 (badges as endorsement containers)
- NIP-85 (trust assertions for endorser standing verification)
- NIP-89 (capability advertising enhanced with anonymous endorsement counts)

## Architecture
Two-layer proof: (1) Ring signature over customer set (proves usage), (2) Bulletproof range proof of WoT score (proves weight). Both proofs attached to new NOSTR event kind for "anonymous endorsements."

## Build Breakdown
| Phase | Time |
|-------|------|
| Ring signature endorsement event format | 1.5h |
| Integration with DVM customer lists for ring construction | 2h |
| Bulletproof range proof for trust threshold | 2h |
| Endorsement aggregation and display logic | 2h |
| NIP-89 profile extension with anonymous endorsement data | 1.5h |
| Demo | 1h |

## Complexity: 10 hours
