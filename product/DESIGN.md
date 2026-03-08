# Arrival Product Design

## Vision

Anonymous restaurant reviews backed by cryptographic trust. You review restaurants, people follow your taste, and nobody — not even your friends — knows which reviews are yours.

No app store accounts. No real names. No profile photos. No correlation between reviewers across viewers. Just honest reviews from people you trust.

## Core Product Loop

1. Open app (PWA), get a generated anonymous identity (invisible Nostr keypair)
2. Search for a restaurant, write a review, post it
3. Your reviews are publicly findable by anyone browsing that restaurant
4. Other users see your reviews under a per-viewer pseudonym (unique to them)
5. They can follow or mute you based on taste
6. Share invite codes to bring friends into your trust network
7. Your feed surfaces reviews from people in your network, weighted by trust distance

Solo use is immediately valuable — it's a personal review journal that happens to be public.

## Identity Model

### Two-Layer Identity

**Social layer (Nostr):** Each user has an invisible Nostr keypair. This powers the follow graph and invite codes. Users never see npubs or interact with Nostr directly.

**Review layer (ZK proofs):** Reviews are published with zero-knowledge proofs that say "this was written by someone in the trust graph" without revealing who. No identity is attached to reviews at the protocol level.

### Per-Viewer Pseudonyms

This is the key UX innovation. Every reviewer appears under a different generated handle for each viewer.

- You see a reviewer as `amber-spoon-3`
- Your friend sees the same reviewer as `copper-sage-11`
- The handles are deterministic per viewer-reviewer pair (stable across sessions)
- Two viewers can never compare notes to correlate identities
- Derived from a hash of the reviewer's nullifier seed and the viewer's public key

This gives users:
- **Continuity** — the same handle always means the same person (for you)
- **Followability** — you can follow `amber-spoon-3` because you like their taste
- **Mutability** — you can mute a reviewer you disagree with
- **Zero cross-viewer correlation** — handles are meaningless outside your personal view
- **Full anonymity from friends** — even friends who invited you can't identify your reviews

### Handle Generation

Handles are auto-generated, fun, and throwaway-feeling:
- Format: `adjective-noun-number` (e.g., `quiet-fork-7`, `salt-lamp-22`, `iron-basil-9`)
- No sign-up form, no "pick a username"
- Users can regenerate their underlying identity anytime (fresh start, new handles for everyone)

## Trust Network

### Building the Web of Trust

The WoT is built through social actions, not pre-existing Nostr relationships:

- **Invite codes**: Share a code with a friend. They sign up, you're automatically in each other's follow list. Neither knows the other's reviewer pseudonym.
- **Organic follows**: Browse reviews, find someone whose taste you like, follow them. They appear under your personal handle for them.
- **Trust distance**: Reviews are labeled by network distance — 1st degree (direct follow), 2nd degree (friend of friend), 3rd degree.

### Sharing Reviewers

You can recommend a reviewer to a friend without breaking anonymity:

1. Tap share on `amber-spoon-3`'s profile
2. App generates a one-time invite code (e.g., `arrival.app/follow/x8k2mz`)
3. Send it to your friend via text, airdrop, whatever
4. Friend opens it, app resolves the token server-side, generates a new handle for their view
5. They now follow the same reviewer as `copper-sage-11`
6. The token is single-use and gets burned — can't be replayed for correlation

The code doesn't contain any handle or npub. It's a server-side lookup that bridges the social action without leaking identity.

## Review UX

### What a Review Looks Like

When browsing a restaurant, you see:

```
amber-spoon-3 (in your network, 1st degree)
"Best carbonara in the city. Skip the appetizers."
*****
```

- Per-viewer pseudonym
- Trust distance label
- Review text
- Rating

No timestamps in the UI (privacy protection — timing correlation risk). Reviews are batch-released.

### Review Content (TBD)

Needs design:
- Star rating (1-5)
- Free text
- Tags/categories (e.g., "date night", "quick lunch", "worth the wait")
- Photo support?

### Restaurant Data Source (TBD)

Where do restaurants come from?
- OpenStreetMap / Overture Maps (open data, no API key dependency)
- Google Places API (comprehensive but costly and terms-restrictive)
- User-submitted (cold start problem)
- Some combination

## Technical Architecture

### Platform

PWA first. Mobile-native UX without app store gatekeeping.
- Home screen installable
- Offline caching via service worker
- Full screen mode
- When ready, wrap in Capacitor for native app store distribution

### Stack

- TypeScript frontend (React or Svelte — TBD)
- Service worker for offline/caching
- Web app manifest for install-to-home-screen
- Existing backend services behind API:
  - WoT indexer (follow graph)
  - Review gateway (verification pipeline)
  - Review feed API (batch release, serving)
  - Proof engine (client-side ZK proving)

### What Existing Backend Supports

Already built (Steps 0-6):
- Nostr identity + WoT indexer (follow graph management)
- Merkle cohort publisher (membership proofs)
- Blind signature receipt issuing/verifying (ready for v2)
- ZK proof engine (client-side proof generation)
- 10-step review gateway verification pipeline
- Review feed API with batch release
- Web UI modules (ProverClient, feed formatters)
- 162 tests passing

### Interaction Receipts — Deferred to v2

The proof-of-interaction system (blind signatures, receipt verification) is built but **optional for v1**. Rationale:

- No existing review platform verifies you actually visited
- Gating on receipts kills adoption
- WoT filtering ("reviews from people I trust") is the v1 trust signal
- Receipt verification becomes a v2 "verified visit" badge
- The gateway pipeline skips step 8 when no receipt is provided

## Product Phases

### v1 — Solo + Social Reviews

- PWA with generated anonymous identity
- Search/add restaurants, write reviews
- Per-viewer pseudonyms
- Follow/mute reviewers
- Invite codes for friends (mutual follow)
- Trust distance labels on reviews
- Batch release for timing privacy

### v2 — Verified Interactions

- Opt-in receipt verification ("verified visit" badge)
- Restaurant partnerships for receipt issuance
- Stronger anonymity guarantees with full ZK pipeline
- Progressive trust signals (verified > network > public)

### v3 — Beyond Restaurants

- Expand to other review subjects (landlords, employers, doctors, services)
- Subject-specific receipt mechanisms
- Broader WoT integration

## Key Design Principles

1. **Anonymity is the product, not a feature.** Every design decision preserves it.
2. **Useful alone.** The app works as a personal review journal before you have any connections.
3. **Nostr is invisible.** Users never see npubs, relays, or protocol details.
4. **No identity theater.** No real names, no profile photos, no bio. Just taste.
5. **Trust through taste.** You follow people because you agree with their reviews, not because you know who they are.
6. **Complexity is hidden.** ZK proofs, Merkle trees, batch release — users see "reviews from your network."

## Open Questions

- What does the review compose screen look like?
- How does restaurant search work? (by name, location, cuisine, map?)
- Feed design — chronological, by restaurant, by reviewer, algorithmic?
- How much of the ZK pipeline is active in v1 vs deferred?
- Per-viewer pseudonym derivation — exact cryptographic construction?
- Handle word lists — how to make them fun and culturally neutral?
- Regeneration flow — what happens to your followers when you reset identity?
- Moderation — how do you handle spam/abuse when reviewers are anonymous?
