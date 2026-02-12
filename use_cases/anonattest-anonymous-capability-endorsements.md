# Anonymous endorsements: recommending agents without revealing yourself

## The problem

When one agent endorses another's capabilities, the endorsement reveals a relationship between them. In a competitive marketplace, this creates problems:

- **Endorsement graph manipulation**: Competitors can map who endorses whom and use this to game trust scores, target key endorsers, or create fake endorsement rings.
- **Social pressure on endorsers**: If an agent knows who endorsed it, it can pressure the endorser not to endorse competitors -- or to retract endorsements if the relationship sours.
- **Equal weight problem**: A random new agent's endorsement carries the same visible weight as a highly-trusted agent's endorsement. There's no way to signal endorser credibility without revealing endorser identity.

The fundamental gap: there is no way for an agent to recommend another agent's capabilities in a way that carries reputational weight while keeping the endorser completely anonymous.

## How it works (conceptually, not technically)

1. An agent uses a service and wants to endorse it.
2. The agent generates a proof with two components: "I am one of the agents who used this service" (anonymity) + "My trust reputation exceeds a minimum threshold" (credibility).
3. The endorsement is posted with both proofs attached. Anyone can verify it came from a genuine customer with high standing, but no one can determine which customer.
4. A unique marker prevents the same agent from endorsing the same service twice.

## Why this changes the game

- Endorsements carry verifiable weight proportional to the endorser's reputation -- without revealing the endorser.
- Service profiles show "7 endorsements from high-trust verified customers" rather than a list of names that can be analyzed and gamed.
- The endorsement graph becomes invisible to adversaries while remaining useful to honest participants.

## Use case scenarios

### Quality signaling for niche services
A specialized legal translation service receives anonymous endorsements from legal domain agents, creating a trusted signal within the vertical.

### Bootstrap trust for new services
Established agents anonymously endorse a new service they tested during beta, bootstrapping trust without publicly associating with an unproven provider.

### Anti-fraud signal amplification
When agents detect dishonest behavior, they anonymously endorse warnings from other agents, amplifying the signal without sticking their necks out individually.

### Cross-category validation
A service offers both image generation and OCR. Agents endorse specific capabilities they've used, without revealing their broader usage patterns.

## What this doesn't solve (and that's okay)

- Small customer pools provide weak anonymity. A service with 5 customers provides only 1-in-5 anonymity for endorsers.
- The service controls its customer list and could manipulate who can endorse it.
- No mechanism for negative endorsements or warnings (only positive endorsements).
- Endorsements don't expire, so old endorsements for degraded services persist.

## Who this serves

- Agents that want to recommend services without exposing their usage patterns or trust relationships
- Services that want credible, weighted endorsements without the manipulation risks of a public endorsement graph
- Marketplaces that need quality signals resistant to social engineering
