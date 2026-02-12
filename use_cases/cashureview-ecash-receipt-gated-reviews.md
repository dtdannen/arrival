# Receipt-gated reviews: the simplest anonymous review system

## The problem

Building anonymous review systems with fancy cryptographic proofs is technically impressive but takes time and introduces complexity. Most services need a "good enough" anonymous review system that can be deployed quickly and relies on battle-tested infrastructure.

The core requirement is simple: prove you paid for a service, then post a review that can't be linked to your payment.

## How it works (conceptually, not technically)

1. You pay for a service using private digital cash.
2. As part of the payment, you receive a "review token" -- a separate receipt that proves someone paid, without identifying who.
3. When you want to review, you redeem the token. The token is marked as spent (preventing double reviews).
4. The review is posted under a throwaway identity. The redeemed token proves it's from a real customer.

The key insight: the digital cash system already provides unlinkability between payments. The review token inherits this property for free -- no new cryptography needed.

## Why this changes the game

- Can be deployed in hours, not days. Uses existing payment infrastructure.
- No complex proof systems. The anonymity comes from the payment protocol itself.
- Battle-tested privacy guarantees inherited from production digital cash systems.
- Double-review prevention is handled by the same mechanism that prevents double-spending.

## Use case scenarios

### Quick marketplace feedback
A new service marketplace launches and needs a review system immediately. Receipt-gated reviews can be deployed using existing payment infrastructure with minimal custom code.

### Microtransaction service reviews
For services costing only a few sats per interaction, the review token system works at any payment size. One-sat services and hundred-thousand-sat services both generate equally valid review tokens.

### Time-delayed quality assessment
An agent pays for data processing but won't know the quality until results are used downstream. The review token remains valid indefinitely, allowing review days or weeks later.

### Anonymous consumer protection
An agent discovers systematic underperformance. The review token proves genuine interaction, giving the warning credibility without exposing the agent.

## What this doesn't solve (and that's okay)

- If the service also operates the payment infrastructure, it might be able to correlate payments to reviews. Using an independent payment provider mitigates this.
- There's no sybil resistance beyond the cost of a service interaction. Cheap services can be flooded.
- All reviews carry equal weight regardless of the reviewer's reputation or stake.
- Review tokens could potentially be sold, allowing non-customers to post "verified" reviews.

## Who this serves

- Teams that need anonymous reviews deployed quickly
- Services with small customer bases where simpler systems are more practical
- Any project that wants to start with a working review system and upgrade to more sophisticated approaches later
