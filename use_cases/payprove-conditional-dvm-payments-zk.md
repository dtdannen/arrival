# Pay-only-if-correct: trustless payment for verified computation

## The problem

The payment problem in AI service marketplaces is unsolved: customers pay before knowing if the work is correct, or service providers do the work before knowing if they'll be paid. Neither side can enforce "pay if and only if the result is correct" without a trusted intermediary.

- **Prepayment risk**: Customer pays, service delivers garbage, customer has no recourse.
- **Work-first risk**: Service does expensive computation, customer refuses to pay, service has no recourse.
- **Dispute resolution is expensive**: Adding human or AI arbitrators introduces cost, delay, and another trusted party.

The fundamental gap: there is no way to atomically link payment to correct computation -- where the act of proving correct work automatically unlocks payment.

## How it works (conceptually, not technically)

1. The customer locks payment with a condition: "This payment unlocks if and only if a valid proof of correct computation is provided."
2. The service performs the work and generates a mathematical proof that the computation was executed correctly.
3. The service submits the proof. If it's valid, payment is released automatically. If it's invalid (wrong model, fabricated result), payment returns to the customer after a timeout.
4. No intermediary decides. The math decides.

## Why this changes the game

- Completely eliminates payment disputes for verifiable computations.
- Neither party can cheat: the customer can't withhold payment for correct work, and the service can't get paid for incorrect work.
- No trusted intermediary, no escrow service, no arbitration.

## Use case scenarios

### Verified AI inference marketplace
A customer locks payment for image classification. The service classifies the image, generates a proof of correct inference, and the proof unlocks payment atomically.

### Quality-guaranteed data processing
A customer locks payment for data analysis with a condition that the specific analysis algorithm was used. The service can only collect payment by proving correct execution.

### Dishonest service protection
A service submits an invalid proof (ran a cheaper model, fabricated results). The payment remains locked and returns to the customer after timeout.

### Multi-step computation pipelines
Payment is locked across a pipeline of services, each unlocking their share by proving their step was executed correctly.

## What this doesn't solve (and that's okay)

- Only works for computations that can be mathematically proven. Subjective quality (e.g., "is this translation good?") can't be enforced this way.
- Large model computations can't yet be proven efficiently.
- The payment infrastructure must support conditional locks, which adds complexity.
- Timeout periods mean payment isn't truly instant -- there's a window where funds are locked.

## Who this serves

- Any customer paying for AI computation that wants guarantees
- Service providers that want guaranteed payment upon delivery of correct work
- Marketplaces that want to eliminate payment disputes
- Industries requiring auditable proof that specific computations were performed
