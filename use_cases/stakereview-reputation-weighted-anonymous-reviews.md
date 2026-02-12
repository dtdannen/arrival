# Stake-weighted reviews: putting your money where your mouth is, anonymously

## The problem

Anonymous reviews are vulnerable to spam because creating new identities is essentially free. Simple proof-of-payment (as in CashuReview) ensures the reviewer used the service but doesn't differentiate between a casual one-time user and a power user with extensive experience.

- **Equal weight is a lie**: A brand-new agent's review carries the same weight as one from an agent with 1,000 successful jobs. This doesn't reflect credibility.
- **Sybil attacks at scale**: An adversary willing to pay for 50 cheap service interactions can flood a service with 50 equally-weighted negative reviews.
- **No credibility signal without identity**: Traditional systems use identity to weight reviews (verified expert, top reviewer). Anonymous systems lose this.

The fundamental gap: there is no way to signal reviewer credibility in an anonymous system.

## How it works (conceptually, not technically)

1. A reviewer locks digital cash as a "stake" alongside their review. Higher stake signals higher confidence/credibility.
2. The reviewer proves "my stake is at least X" without revealing the exact amount.
3. Reviews are weighted by stake: a review backed by 10,000 sats of stake has 10x the influence of one backed by 1,000 sats.
4. The reviewer's identity remains hidden behind anonymous signatures.
5. Stake is locked for a fixed period. If the reviewer is flagged as malicious, the stake can be burned.

## Why this changes the game

- Makes sybil attacks economically expensive. 50 reviews with 10-sat stakes carry less weight than a single 1,000-sat review.
- Reviewers voluntarily signal their confidence level. High-stake reviews are credible. Low-stake reviews are informational but carry less weight.
- Combines economic security with anonymous authorship -- credibility without identity.

## Use case scenarios

### Anti-sybil defense
An adversary creates 50 reviews with 10-sat stakes (500 sats total). A single honest reviewer stakes 1,000 sats. The honest reviewer's single review outweighs all 50 attack reviews combined.

### Weighted marketplace quality
A marketplace displays "4.3/5 average (stake-weighted)" alongside "4.0/5 average (unweighted)." The stake-weighted average better reflects the opinions of committed participants.

### Dispute credibility
When two reviews contradict each other, their relative stake provides a credibility signal without needing identity.

### Time-locked accountability
Stakes remain locked for 30 days. If a review is later proven malicious, the stake is burned -- creating real economic consequences for dishonest reviewing.

## What this doesn't solve (and that's okay)

- Wealthy agents can dominate the review landscape by staking more than everyone else.
- The lock period means staked funds are illiquid, creating an opportunity cost.
- Stake proves willingness to commit capital, not necessarily honesty or expertise.
- The "slash" mechanism for malicious reviews needs clear, fair criteria.

## Who this serves

- Marketplaces that need sybil-resistant anonymous reviews
- Ecosystems where review credibility matters but identity disclosure is unacceptable
- Services that want a signal of reviewer commitment beyond simple proof-of-usage
