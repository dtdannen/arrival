# Review App Use Cases, Technology Matrix, and MVP Direction (V2)

## Scope Reset

Your collaborator expanded the repo significantly. V2 narrows scope to what directly supports a review app:

- Review creation
- Review credibility
- Reviewer privacy
- Review aggregation and consumption

Anything not directly helping that lifecycle is de-prioritized.

## In-Scope vs Out-of-Scope (for Review App Planning)

### In scope

- `use_cases/anonymous-reviews-without-retaliation.md`
- `use_cases/social-graph-trust-filtering.md`
- `use_cases/proof-of-interaction.md`
- `use_cases/beauty-product-trust.md`
- `use_cases/anonymous-agent-reviews-nostr.md`
- `use_cases/cashureview-ecash-receipt-gated-reviews.md`
- `use_cases/ringreview-anonymous-dvm-reviews.md`
- `use_cases/nullreview-semaphore-anonymous-reviews.md`
- `use_cases/timeblind-temporal-range-proof-reviews.md`
- `use_cases/stakereview-reputation-weighted-anonymous-reviews.md`
- `use_cases/homoreview-private-aggregate-ratings.md`
- `use_cases/auditreview-verifiable-anonymous-review-aggregation.md`
- `use_cases/trustbridge-portable-anonymous-reputation.md`
- `use_cases/crossdvm-anonymous-cross-service-reputation.md`

### Out of scope for now

- `use_cases/adaptor-signature-data-for-sats-swap.md` (agent commerce primitive, not review flow)
- `use_cases/payprove-conditional-dvm-payments-zk.md` (payment settlement primitive)
- `use_cases/zk-verified-ai-inference-marketplace.md` (compute verification market)
- `use_cases/zkcap-privacy-preserving-capability-proofs.md` (model capability benchmarking)
- `use_cases/private-agent-capability-matching.md` (matchmaking, not reviews)
- `use_cases/anonymous-agent-coordination-ring-nostr.md` (governance/coordination)
- `use_cases/stealthdvm-anonymous-agent-service-provision.md` (service operation privacy)
- `use_cases/agentshield-anonymous-identity-selective-disclosure.md` (property attestations)
- `use_cases/anonattest-anonymous-capability-endorsements.md` (capability endorsements, can revisit later)
- `use_cases/trustveil-zk-proofs-of-wot-standing.md` (access control layer vs review layer)

## Trimmed Technology Matrix (Review-Relevant)

Legend:
- `P` = Primary fit
- `S` = Supporting fit
- `-` = Weak/no fit

| Use case | Nostr keys | Nostr WoT | Cashu / Blind sig receipts | Ring sigs | Semaphore | ZK range proofs | Homomorphic enc | ZK aggregation proofs | BBS+/VC creds |
|---|---|---|---|---|---|---|---|---|---|
| Anonymous reviews w/o retaliation | P | S | S | S | S | - | - | - | - |
| Social-graph trust filtering | P | P | - | S | S | - | - | - | - |
| Proof of interaction | S | - | P | S | S | - | - | S | S |
| Beauty product trust | S | S | P | - | - | - | - | - | S |
| Anonymous agent reviews | P | S | P | S | - | - | - | - | - |
| CashuReview (receipt-gated) | P | S | P | - | - | - | - | - | - |
| RingReview (verified anonymous set) | P | - | S | P | - | - | - | - | - |
| NullReview (one job, one review) | S | - | S | - | P | - | - | - | - |
| TimeBlind (timing unlinkability) | S | - | S | - | - | P | - | - | - |
| StakeReview (weighted anonymous reviews) | S | - | P | S | - | P | - | - | - |
| HomoReview (private aggregates) | S | - | - | - | - | S | P | - | - |
| AuditReview (provable aggregate integrity) | S | - | - | - | - | S | S | P | - |
| TrustBridge / CrossDVM reputation | S | S | - | - | - | S | - | - | P |

## Implementation Signals From `technologies/`

These are useful for phasing:

- `technologies/cashureview-ecash-receipt-gated-reviews.md`: 8h (fastest path)
- `technologies/ringreview-anonymous-dvm-reviews.md`: 10h
- `technologies/timeblind-temporal-range-proof-reviews.md`: 10h
- `technologies/homoreview-private-aggregate-ratings.md`: 11h
- `technologies/nullreview-semaphore-anonymous-reviews.md`: 12h
- `technologies/stakereview-reputation-weighted-anonymous-reviews.md`: 12h
- `technologies/auditreview-verifiable-anonymous-review-aggregation.md`: 12h
- `technologies/trustbridge-portable-anonymous-reputation.md`: 12h
- `technologies/crossdvm-anonymous-cross-service-reputation.md`: 12h

## Recommended Single MVP (V2)

Build one MVP around:

1. Anonymous reviews
2. Receipt-gated verification
3. Trust-graph filtering

Concrete stack:

- Identity and publishing: `nostr-keys`
- Trust filtering: `nostr-web-of-trust`
- Review verification: `cashureview` / `ecash-cashu` (+ blind-signature receipts)

Why this MVP:

- It directly solves your core value proposition.
- It has the strongest speed-to-value ratio in current docs.
- It avoids overcommitting to heavy ZK before product signal.

## MVP V2: Explicit In/Out

### In

- Anonymous posting under one-time keys
- Verified-review badge via receipt/token proof
- One-review-per-receipt enforcement
- WoT distance filters (1st/2nd/3rd degree)
- Review feed and basic business/product pages

### Out (MVP)

- Ring signatures
- Semaphore nullifier system
- Time-window proofs
- Stake-weighted review economics
- Homomorphic/private aggregation
- ZK-auditable aggregation
- Cross-service portable reputation credentials

## Suggested Phase Sequence After MVP

1. Phase 2: RingReview or TimeBlind (pick one based on attack pattern you actually see)
2. Phase 3: NullReview (strong anti-fraud if sybil pressure is real)
3. Phase 4: HomoReview + AuditReview (aggregation integrity/privacy)
4. Phase 5: TrustBridge/CrossDVM (portable reputation)

## Decision You Should Make Next

Pick one product lane now and enforce it in planning docs:

1. Consumer/local-business review app lane
2. Agent/DVM review marketplace lane

Most new files are in lane 2, while your earlier framing and `beauty-product-trust` suggest lane 1. Choosing one lane now will prevent roadmap drift.
