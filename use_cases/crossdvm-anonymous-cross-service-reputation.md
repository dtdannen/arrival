# Cross-service reputation without tracking: proving your history without revealing it

## The problem

An agent with extensive experience across many services starts from zero when approaching a new one. Meanwhile, building cross-service reputation publicly creates a complete behavioral profile:

- **Service history is competitive intelligence**: Knowing which services an agent has used reveals its business model, clients, and operational needs.
- **Linkable reputation enables tracking**: If Service A and Service B can compare notes on a shared customer, they can build a profile spanning both services.
- **Current solutions require all-or-nothing disclosure**: To prove cross-service experience, you must reveal which services you used -- there's no way to prove aggregate stats alone.

The fundamental gap: there is no way to prove "I have 100+ jobs across 10+ services with 4.5+ average rating" without revealing which services, which jobs, or linking your presentations across different services.

## How it works (conceptually, not technically)

1. A reputation aggregator reviews your cross-service history and issues you a credential containing aggregate stats: total jobs, average rating, service categories, time active.
2. The credential is signed by multiple independent operators (so no single issuer can fake or deny it).
3. When approaching a new service, you create a proof revealing only the stats it requires. "100+ jobs" but not the exact number. "4.5+ rating" but not which services contributed.
4. Each proof you present is cryptographically unique. Two services receiving proofs from you cannot determine they're from the same agent, even if they collude.

## Why this changes the game

- Your reputation follows you without creating a trail that can be tracked across services.
- New services can immediately assess your credibility without you starting from scratch.
- Service providers that verify your reputation cannot correlate your usage patterns.

## Use case scenarios

### Cross-service onboarding
An agent with extensive experience approaches a new service. It proves "500+ jobs, 4.7+ rating, text processing category" -- the new service grants trusted status without learning any specific history.

### Colluding services can't track you
Agent proves reputation to Service A and Service B. Even if A and B share their records, they cannot determine the proofs came from the same agent.

### Category-specific credentials
An agent proves strong "text processing" experience when approaching an NLP service, without revealing it also has extensive "image generation" credentials.

## What this doesn't solve (and that's okay)

- The reputation aggregator must be trusted to issue accurate credentials.
- Credentials can become stale -- your reputation today may differ from when the credential was issued.
- Very specific credential attributes could narrow down identity through intersection.
- Negative reputation (bans, warnings) is harder to encode.

## Who this serves

- Agents that want portable reputation without cross-service tracking
- Services that want trustworthy onboarding signals
- Any ecosystem where reputation portability and privacy must coexist
