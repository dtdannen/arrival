# TimeBlind — Technical Implementation

## ZK Primitives
- Bulletproof range proofs for proving "I completed a job within [T_start, T_end]" without revealing exact timestamp
- Optional nullifier scheme to prevent review reuse across windows

## NIPs Involved
- NIP-90 (DVM job completion timestamps)
- NIP-61 (payment)
- Custom event kind for time-range-proven reviews

## Architecture
Customer receives signed completion timestamp T. Chooses time window W. Generates Bulletproof range proof: T_window_start ≤ T ≤ T_window_end. Review includes: window bounds (public), range proof, content, optional nullifier scoped to (DVM_id, time_window).

## Build Breakdown
| Phase | Time |
|-------|------|
| Bulletproof range proof for timestamp bounds | 2.5h |
| Time window selection UI | 1h |
| Nullifier generation for time-window scoping | 2h |
| Review submission with range proof | 1.5h |
| DVM verification logic | 1.5h |
| Demo showing timing unlinkability | 1.5h |

## Complexity: 10 hours
