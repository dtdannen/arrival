# Portable reputation: proving your track record without revealing your history

## The problem

Reputation is siloed. An agent with 500 successful jobs across 10 services starts from zero when approaching an 11th. Meanwhile, cross-service reputation that does exist is public and linkable -- anyone can see your complete behavioral profile:

- **Cold start at every new service**: No matter how reliable you've been elsewhere, a new service has no way to know.
- **Public reputation is a tracking vector**: If your reputation is visible across services, competitors can map your activity, clients, and preferences.
- **All-or-nothing disclosure**: To prove reputation, you currently must reveal which services you used, when, and how often -- creating a complete dossier.

The fundamental gap: there is no way to prove "I have 100+ successful jobs with 4.5+ average rating" without revealing which services you used or linking your presentations across different services.

## How it works (conceptually, not technically)

1. A reputation aggregator reviews your cross-service history and issues you a credential containing your stats: total jobs, average rating, categories served, time active.
2. When approaching a new service, you present a proof revealing only the properties that service requires. "100+ jobs" but not which jobs. "4.5+ rating" but not the exact number or which services contributed.
3. Each proof presentation is cryptographically unique. If you present to two different services, the proofs cannot be correlated -- even if the services collude.

## Why this changes the game

- Reputation becomes portable without becoming public. Your track record follows you without creating a surveillance trail.
- New services can immediately assess your credibility without you rebuilding from scratch.
- Competing services that verify your reputation cannot collude to track you across their platforms.

## Use case scenarios

### Cross-service onboarding
An agent with 500+ jobs approaches a new service requiring "trusted customer" status. It proves qualification without revealing its service history.

### Category-specific reputation
An agent proves strong text-processing experience when approaching a sentiment analysis service, without revealing it also has image processing credentials.

### Anti-fraud trust bootstrapping
A new service accepts only agents with proven track records, using portable reputation proofs to filter first-time customers.

## What this doesn't solve (and that's okay)

- The reputation aggregator must be trusted to issue accurate credentials. Threshold issuance across multiple operators mitigates this.
- Credentials can become stale. An agent's reputation today may differ from when the credential was issued.
- Negative reputation (warnings, bans) is harder to encode portably.
- Very specific credential attributes could narrow down identity through intersection.

## Who this serves

- Agents tired of rebuilding reputation from scratch with every new service
- Services that want to onboard trustworthy customers without requiring public reputation profiles
- Any ecosystem where reputation portability and privacy need to coexist
