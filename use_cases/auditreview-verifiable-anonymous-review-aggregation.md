# Auditable aggregation: proving ratings are honest without revealing individual reviews

## The problem

Even the best anonymous review systems have a trust problem at the aggregation layer: someone computes the average rating from individual reviews, and you have to trust they did it honestly.

- **Selective suppression**: A service could hide negative reviews before computing the aggregate, inflating its score.
- **Phantom reviews**: An aggregator could add fake positive reviews that were never submitted.
- **Undetectable manipulation**: With encrypted or anonymous individual reviews, how can anyone verify the published aggregate is correct?

The fundamental gap: there is no way for an outside observer to verify that a published aggregate rating was computed correctly from the actual set of submitted reviews, without seeing the individual reviews themselves.

## How it works (conceptually, not technically)

1. All submitted reviews are organized into a verifiable data structure (a cryptographic commitment). The commitment is published publicly.
2. When the aggregator computes the average, it also generates a mathematical proof: "I correctly computed the average of all reviews in this committed set, and the result is 4.1."
3. Anyone can verify the proof against the published commitment. If the proof checks out, the aggregate is guaranteed to be correct.
4. Individual reviewers can check that their review is included in the committed set. If it's missing, they can publish a "fraud proof" -- publicly demonstrating the aggregator cheated.

## Why this changes the game

- Aggregators cannot manipulate ratings without getting caught. Every computation is provably correct.
- Reviewers can verify their reviews weren't suppressed, without revealing their identity.
- The system creates public accountability for honest aggregation without compromising individual privacy.

## Use case scenarios

### Honest DVM ratings
A DVM publishes "4.8/5 from 100 reviews" with a proof of correct computation. Any skeptic can verify the proof. Any reviewer can verify their review was included.

### Fraud detection
A DVM tries to publish an inflated average by excluding low ratings. The excluded reviewers notice their reviews are missing from the commitment and publish fraud proofs, destroying the DVM's credibility.

### Cross-platform rating integrity
Multiple platforms display the same service's ratings. The provable computation ensures all platforms show the same honest aggregate.

### Regulatory compliance
A regulated industry requires honest customer satisfaction metrics. The mathematical proof provides stronger assurance than any audit.

## What this doesn't solve (and that's okay)

- The proof verifies correct computation, not honest individual reviews. If reviewers themselves are dishonest, the aggregate reflects that.
- Proof generation has computational overhead -- more expensive than simply averaging numbers.
- The aggregator still controls when to publish updates. It could delay unfavorable aggregates.
- Complex operations (variance, percentiles) require more sophisticated proofs.

## Who this serves

- Marketplaces that want provably honest rating systems
- Consumers who distrust platform-computed ratings
- Regulators who need auditable customer feedback metrics
- Any system where aggregation integrity must be publicly verifiable
