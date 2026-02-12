# One job, one review: bulletproof anti-fraud for anonymous reviews

## The problem

Even good anonymous review systems can be gamed. If an attacker controls multiple identities, they can create multiple payments and leave multiple reviews. Ring signatures limit one review per key, but an adversary with multiple keys can flood the system.

The deeper problem: how do you enforce "each service interaction produces exactly one review" when the reviewer is anonymous? Traditional systems solve this by tracking identity, which defeats the purpose.

Key failures today:
- Sybil attacks: one entity creates many identities to flood reviews.
- Review buying: purchasing review tokens from others who used the service.
- Identity splitting: using separate keys for separate interactions to accumulate review rights.

## How it works (conceptually, not technically)

1. When a service interaction completes, the customer registers a secret commitment -- like dropping a sealed envelope into a locked box.
2. All commitments are organized into a single verifiable data structure.
3. To review, the customer proves "I have a commitment in this structure" using a mathematical proof that reveals nothing about which commitment is theirs.
4. The proof also generates a unique fingerprint tied to both the customer's secret and the specific service. This fingerprint is deterministic -- the same customer always produces the same fingerprint for the same service.
5. If a fingerprint appears twice, the second review is rejected. But the fingerprint itself reveals nothing about the customer's identity.

## Why this changes the game

- Provides the strongest possible anti-sybil guarantee: each interaction maps to exactly one review, regardless of how many identities the reviewer controls.
- Enforcement happens automatically at the network level -- no moderators needed.
- Complete anonymity is maintained even while enforcing strict one-review-per-interaction limits.

## Use case scenarios

### High-stakes service quality assurance
A legal analysis service needs customer feedback but must protect reviewers. Each completed analysis produces exactly one review right -- no more, no less.

### Anti-competitive manipulation defense
A competitor buys a service 10 times with 10 different identities, planning to flood negative reviews. Each interaction produces a unique fingerprint -- 10 reviews are legitimate. But creating 100 reviews from 10 interactions is cryptographically impossible.

### Federated review integrity
Multiple relays aggregate reviews for the same service. Fingerprint deduplication ensures no duplicate reviews even across different relays.

### Tiered review systems
Different service levels produce different review commitments, allowing services to display "verified premium customer reviews" vs. "verified free-tier reviews."

## What this doesn't solve (and that's okay)

- The data structure of commitments must be maintained by someone, creating a coordination responsibility.
- Proof generation is computationally heavier than simpler review systems (seconds, not milliseconds).
- Reviews can't be updated or retracted. Once posted with a fingerprint, it's permanent.
- The underlying proof technology requires a one-time setup procedure that must be performed honestly.

## Who this serves

- Services that need the strongest possible anti-fraud guarantees for customer reviews
- Marketplaces operating in adversarial environments where sybil attacks are a real threat
- Any system that needs to enforce "one action per participant" while keeping participants anonymous
