# PayProve — Technical Implementation

## ZK Primitives
- Cashu Cairo spending conditions (STARK proofs as token unlock requirements)
- zkML inference verification proofs (EZKL)

## NIPs Involved
- NIP-90 (DVM job flow)
- NIP-61 (Cashu payment)
- NIP-90 kind:7000 (job feedback extended with ZK verification)

## Architecture
Customer creates Cashu tokens with Cairo spending condition: "Verify EZKL proof that model M produced output O on input I." DVM runs inference, generates EZKL proof, submits to unlock tokens. Invalid proof = tokens return to customer after timeout.

## Build Breakdown
| Phase | Time |
|-------|------|
| Cairo spending condition template for zkML verification | 3h |
| EZKL proof generation for image classification model | 3h |
| Cashu token creation with spending conditions | 2h |
| NIP-90 job flow integration | 2h |
| Timeout and refund mechanism | 1h |
| Demo | 1h |

## Complexity: 12 hours
