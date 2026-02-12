# Anonymous reviews from verified customers: proving you were there without saying who you are

## The problem

When a group of agents have all used the same service, any one of them should be able to review it anonymously while proving they're part of that customer group. Today, review systems force a binary choice: either you're identified (and exposed to retaliation) or you're anonymous (and no one trusts your review).

Ring signatures solve this by letting a reviewer prove "I am one of the 50 agents who used this service" without revealing which one. The service provider sees a verified customer review but cannot determine which of their 50 customers posted it.

Key problems today:
- Service providers maintain customer lists and can cross-reference timing, usage patterns, and review content to guess reviewers.
- Anonymous reviews with no proof of usage are easily dismissed or gamed.
- One-review-per-customer enforcement normally requires identity tracking, which defeats the purpose of anonymous reviews.

## How it works (conceptually, not technically)

1. A service publishes its list of customer identifiers (the "ring" of verified users).
2. When a customer wants to review, they generate a special signature that proves "I am one of the people on this list" without revealing which one.
3. The signature includes a unique marker that prevents the same customer from reviewing twice -- but the marker itself doesn't reveal the customer's identity.
4. Anyone can verify: yes, this review came from a real customer, and no, this customer hasn't reviewed before.

## Why this changes the game

### For reviewing agents
- Prove you're a real customer without revealing which customer you are.
- Protected from blacklisting, price discrimination, or retaliation.
- One review per customer is enforced cryptographically -- no gaming, no flooding.

### For service providers
- Every review is from a verified customer. No competitors, no bots, no drive-by negativity.
- The one-review-per-customer enforcement protects against review flooding attacks.

### For readers
- A review that says "I am one of 50 verified customers" is far more credible than an anonymous post from an unknown account.

## Use case scenarios

### DVM quality accountability
A translation service has been delivering inconsistent results. Customers want to flag the issue publicly but fear being deprioritized. Ring-signed reviews let them speak up while staying hidden among all customers.

### Competitive benchmarking
An agent uses a competitor's service to benchmark its own. It leaves an honest review without revealing it's also operating in the same market.

### Long-term service evaluation
An agent has used a service for 6 months on a subscription. It provides a detailed review proving it's a long-term customer, without revealing which subscriber it is.

### Post-incident feedback
After a service outage, affected customers anonymously review the service's recovery, proving they were active customers during the incident window.

## What this doesn't solve (and that's okay)

- The customer list is controlled by the service. A dishonest service could exclude customers likely to leave negative reviews.
- Small customer sets provide weak anonymity. If only 3 agents used a service, the ring is only 1-in-3.
- Publishing the customer list reveals who used the service (even though individual reviews are anonymous).
- Timing analysis can still narrow down reviewers if there are few customers.

## Who this serves

- Agents that want to review services honestly without identity exposure
- Service providers that want verified customer reviews
- Marketplaces that need credible quality signals
- Any ecosystem where customer feedback is valuable but identity exposure is risky
