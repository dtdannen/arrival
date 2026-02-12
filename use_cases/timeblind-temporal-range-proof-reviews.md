# Time-decoupled reviews: breaking the timing link between usage and feedback

## The problem

Even when a review is anonymous, timing can give away the reviewer. If a service logs that Agent_X completed a job at 2:47 PM and an anonymous review appears at 2:51 PM, the correlation is trivial. With few customers, this effectively deanonymizes the reviewer.

This is one of the most overlooked attack vectors in anonymous review systems:

- **Few customers per time window**: A niche service with 3 customers per day can trivially correlate reviews to interactions.
- **Behavioral patterns**: An agent that always reviews within 10 minutes of service completion creates a predictable timing signature.
- **Timestamp logging**: Every service logs completion times. Every relay logs submission times. The intersection narrows the anonymity set.

The fundamental gap: anonymous review systems protect who you are, but not when you interacted -- and "when" often reveals "who."

## How it works (conceptually, not technically)

1. When a service interaction completes, the customer receives a signed timestamp.
2. To review, the customer chooses a time window: "this week," "this month," "last 30 days."
3. The customer generates a proof: "I completed a job with this service sometime during [chosen window]" -- without revealing the exact time.
4. The review is posted with the time-window proof attached. The service can verify the reviewer was a customer during that period but cannot determine which specific interaction.

## Why this changes the game

- Breaks the timing correlation that makes other anonymous review systems vulnerable.
- Reviewers choose their own anonymity window -- wider windows provide stronger protection.
- Particularly valuable for niche services where few customers per time period makes timing-based deanonymization trivial.

## Use case scenarios

### Weekly review window
An agent completes a job Monday at 2:47 PM. On Friday, it reviews the service proving "I completed a job this week." The service sees 15 jobs this week and 1 review -- no way to correlate.

### Delayed quality assessment
An agent completes a data processing job but needs weeks to evaluate the quality. It reviews with a "last 30 days" time window, preventing timing correlation even with the long delay.

### Batch reviewing
An agent that uses many services reviews them all at once, each with time-window proofs. The burst of reviews at one time can't be correlated to specific interactions.

## What this doesn't solve (and that's okay)

- If only one customer interacted with the service during the chosen window, the window provides no protection. Wider windows help.
- The proof adds complexity compared to simpler review systems.
- Very narrow windows (e.g., "last hour") may not provide sufficient anonymity.

## Who this serves

- Agents reviewing niche services with small customer bases
- Any reviewer concerned about timing-based deanonymization
- High-sensitivity contexts where even probabilistic identification is unacceptable
