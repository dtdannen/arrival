# Review App Use Cases, Technology Matrix, and MVP Direction

## Core Product Direction

From the `use_cases` docs, the strongest core product direction is:

1. Anonymous reviews without retaliation
2. Social-graph trust filtering
3. Optional proof-of-interaction (phased in after initial adoption)

This aligns with `README.md`: "Anonymous, Verifiable, based on your Web of Trust."

## Use Cases Reviewed

### Core review app use cases

- `use_cases/anonymous-reviews-without-retaliation.md`
- `use_cases/social-graph-trust-filtering.md`
- `use_cases/proof-of-interaction.md`
- `use_cases/beauty-product-trust.md`

### Adjacent/R&D use cases

- `use_cases/anonymous-agent-reviews-nostr.md`
- `use_cases/anonymous-agent-coordination-ring-nostr.md`
- `use_cases/private-agent-capability-matching.md`
- `use_cases/adaptor-signature-data-for-sats-swap.md`
- `use_cases/zk-verified-ai-inference-marketplace.md`

## Technology-to-Use-Case Matrix

Legend:
- `P` = Primary fit
- `S` = Supporting fit
- `-` = Weak/no fit

| Use case | Nostr keys | Nostr WoT | Ring sigs | Semaphore | Blind sigs | Cashu | BBS+ | ZK proofs | Notes |
|---|---|---|---|---|---|---|---|---|---|
| Anonymous reviews w/o retaliation | P | P | P | S | S | S | S | S | Core product |
| Social-graph trust filtering | P | P | S | P | - | - | - | S | Core product |
| Proof of interaction | S | - | S | S | P | P | P | P | Core product |
| Beauty product trust | P | P | S | S | P | P | P | P | Strong GTM wedge |
| Anonymous agent reviews on Nostr | P | S | P | - | S | P | - | S | R&D |
| Anonymous agent coordination | P | S | S | P | - | S | - | P | R&D |
| Private agent capability matching | S | S | - | - | - | - | - | S | Needs PSI primitive |
| Data-for-sats swap | - | - | - | - | - | - | - | - | Needs adaptor signatures |
| ZK-verified AI inference market | S | - | - | - | - | P | - | P | R&D |

## Recommendation: What To Do Next

Yes: do the matching first, then pick one tightly scoped MVP.

### Single MVP to build now

- Solve only:
  - Anonymous reviews without retaliation
  - Social-graph trust filtering
- Start with one wedge:
  - Beauty products (recommended), or
  - Local businesses
- Use now:
  - Nostr keys
  - Nostr follow graph (web of trust)
- Defer:
  - Full proof-of-interaction
  - Heavy ZK/ring/BBS+ cryptography until user pull is clear

Why: this gives fastest path to real user value with the fewest integration dependencies, while preserving a clear roadmap to stronger cryptographic verification.

## Proposed Phase Plan

1. Phase 1 (MVP): anonymous posting + trust-distance filtering (1st/2nd/3rd degree)
2. Phase 2: basic proof-of-interaction pilot (blind signature or Cashu token)
3. Phase 3: advanced cryptography (Semaphore/BBS+/composed ZK proofs) as scale and abuse-resistance needs grow

## Immediate Next Decisions

1. Choose wedge: beauty vs. local business
2. Define MVP in/out scope in one-page PRD
3. Convert PRD to build milestones (events, APIs, UI screens, moderation/abuse controls)
