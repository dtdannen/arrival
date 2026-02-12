# CrossDVM — Technical Implementation

## ZK Primitives
- BBS+ selective disclosure signatures for multi-DVM reputation data
- Merkle tree membership proofs for proving service usage without revealing which service
- Bulletproof range proofs for aggregate statistics

## NIPs Involved
- NIP-90 (DVM jobs)
- NIP-58 (badges as credential containers)
- NIP-85 (trust assertions)
- Custom event kind for cross-service reputation proofs

## Architecture
Reputation aggregator issues BBS+ credentials with attributes: total_jobs, unique_dvms, average_rating, service_categories, earliest_job_date. Threshold issuance (t-of-n). Agent presents selective disclosure proof revealing only requested attributes. Each presentation unlinkable due to BBS+ randomization.

## Build Breakdown
| Phase | Time |
|-------|------|
| BBS+ credential schema for reputation attributes | 1.5h |
| Threshold credential issuance from multiple aggregators | 2.5h |
| Selective disclosure proof generation | 3h |
| Bulletproof range proofs for numerical thresholds | 2h |
| DVM verification and onboarding flow | 2h |
| Demo with credential presentations to multiple services | 1h |

## Complexity: 12 hours
