# Nostr follow graph: the web of trust

## What it is

Every Nostr user publishes a follow list (NIP-02) -- a signed list of public keys they follow. This creates a public, verifiable, directed graph of trust relationships. Unlike Facebook friends (bidirectional, private) or Twitter followers (unidirectional but platform-owned), Nostr follow lists are:

- **Signed by the user**: Cryptographically verifiable, can't be forged
- **Public**: Anyone can read anyone's follow list from relays
- **Portable**: Not locked to any platform or app
- **Directional**: "I follow you" is a deliberate trust signal. It doesn't require reciprocation.

This follow graph *is* the web of trust. No additional infrastructure needed.

## Why this matters for the review system

The follow graph solves the core filtering problem: **how do you know which reviewers to trust?**

Today, review platforms try to solve this with algorithms, verified purchase badges, and fraud detection. All of these are arms races that the platforms are losing. The follow graph takes a fundamentally different approach: instead of trying to determine if a reviewer is trustworthy in the abstract, it asks **"is this reviewer connected to me through people I've chosen to trust?"**

### Degrees of connection

The follow graph naturally creates trust tiers:

- **1st degree**: People you directly follow. You chose to trust their judgment. A review from them is like getting a personal recommendation.
- **2nd degree**: People followed by people you follow. You don't know them directly, but someone you trust trusted them. Still a strong signal.
- **3rd degree**: Three hops away. Weaker signal, but still within a social fabric that has some accountability. Useful for broader coverage.
- **4th degree+**: Diminishing returns, but potentially useful in niche communities or sparse geographic areas.

The user controls the depth. Want tight, high-trust filtering? Show only 1st and 2nd degree. Want broader coverage? Expand to 3rd or 4th.

### Why a follow graph beats a friend graph

A follow graph is *more informative* than a mutual-friend graph because following is intentional and asymmetric:

- You follow a local food blogger because you trust their restaurant taste. They don't need to follow you back. That directional trust signal is preserved.
- On Facebook, you're "friends" with your high school classmate, your boss, and your mom. That relationship tells you nothing about whose restaurant opinions you value.
- The follow graph can encode different *kinds* of trust. You might follow someone specifically for beauty product expertise. The graph doesn't capture this natively, but the pattern of who follows whom within a community does.

## How it works in practice

1. Users publish follow lists to Nostr relays (this already happens -- it's how Nostr works today).
2. When a user wants to see reviews for a product or business, the system traverses the follow graph outward from the user's public key.
3. At each hop, it collects public keys and checks if any of them have published reviews for the target.
4. Reviews are displayed with their trust distance: "1st degree", "2nd degree", etc.
5. The user never needs to "add friends" or "join a network" -- their existing Nostr follow list is the input.

### Graph traversal at scale

A typical Nostr user follows 100-500 accounts. At 2 degrees, that's potentially 10,000-250,000 unique keys. At 3 degrees, millions. This creates challenges:

- **Fetching follow lists**: Need to query relays for follow lists at each hop. This is parallelizable but adds latency.
- **Caching**: Follow lists change slowly. Caching with periodic refresh is practical.
- **Pruning**: Not every path is equal. A user might weight paths through certain follows higher than others. This is a UX/algorithm design question, not a cryptographic one.

## Existing tools and data

- **Follow lists are already public**: Every Nostr client publishes and reads them. The data exists today.
- **Web of Trust scoring**: Projects like `nostr-wtf` and `coracle.social` already compute WoT scores from follow graphs.
- **NIP-02**: The formal specification for follow lists (kind 3 events).
- **Relay infrastructure**: Follow lists are among the most replicated events on the Nostr network.

## Trade-offs

- **Follow ≠ endorse**: Following someone on Nostr might mean "I want to read their posts" not "I trust their product reviews." The follow graph is a proxy for trust, not a direct measurement. Over time, review-specific trust signals could supplement this (e.g., "I trust this person's reviews" as a distinct action).
- **Graph manipulation**: Someone could follow thousands of accounts to insert themselves into many trust paths. Defenses: weight paths by graph distance, penalize nodes with abnormally high follow counts, or require bidirectional follows for stronger trust signals.
- **Cold start**: A new user with no follow list has no trust network. They need to follow people before the system is useful. This is a feature, not a bug -- it forces intentional curation -- but it does create an onboarding challenge.
- **Privacy of social graph**: Follow lists are public on Nostr. This means your social graph is visible. For the review system, this is necessary (the graph must be traversable). But it does reveal who you associate with, even if your reviews are anonymous.
- **Computation cost**: Deep graph traversal is expensive. 3+ degrees across a large network requires significant computation. This can be mitigated with precomputation, caching, and bounded traversal strategies.
