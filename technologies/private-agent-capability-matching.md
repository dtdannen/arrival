# Private Agent Capability Matching — Technical Implementation

## ZK Primitive
ECDH-based Private Set Intersection (PSI). Each agent encrypts its capability set with its own key, sends encrypted sets to the other, who double-encrypts. Comparison of double-encrypted sets reveals only the intersection.

## Libraries
- OpenMined/PSI (`pip install openmined-psi`, supports Python/JS/Go with WASM)
- `nostr-tools` for discovery and negotiation

## NIPs Involved
- NIP-89 (agent capability advertising)
- NIP-90 (DVM job routing)

## Architecture
Agent A specializes in "image classification, OCR, translation, summarization." Agent B offers "translation, code review, summarization, data cleaning." They discover the overlap (translation, summarization) without either learning the other's full offering.

## Bitcoin Integration
Lightning payment for matched task routing; Nostr for agent discovery via NIP-89 handler events.

## Build Breakdown
| Phase | Time |
|-------|------|
| PSI protocol integration | 3h |
| Nostr agent discovery via NIP-89 | 2h |
| Capability set encoding | 1.5h |
| Negotiation protocol | 2h |
| Demo with multiple agents | 1.5h |
| **Total** | **10 hours** |

## Demo
Three agent terminals discovering pairwise capability overlaps, forming routing partnerships, and handling a task request routed to the best-matched agent.

## Complexity: Medium
