<p align="center">
  <img src="arrival.jpg" alt="Arrival" />
  <br>
  <em>The future of reviews: Anonymous, Verifiable, based on your Web of Trust</em>
</p>

Reviews are broken. Honest reviewers face retaliation. Fake reviews poison trust. Arrival fixes this with zero-knowledge proofs: leave anonymous, verified reviews that prove you're a real person in the reviewer's social network, who actually visited the business, without revealing who you are.

---

![Reviews Are Broken](slides/short_deck_pngs/1_Reviews-Are-Broken.png)

![Arrival: Zero-Knowledge Verified Reviews](slides/short_deck_pngs/2_Arrival-Zero-Knowledge-Verified-Reviews.png)

![How It Works](slides/short_deck_pngs/3_How-It-Works.png)

![End-to-End Proof-Verified Review](slides/short_deck_pngs/4_End-to-End-Proof-Verified-Review.png)

![The Vision](slides/short_deck_pngs/5_The-Vision.png)

---

## How It Works

Every review must pass four cryptographic checks:

- **WoT Member** — Prove you're in the reader's social network (Nostr + Semaphore v4)
- **Verified Visit** — Prove you actually went there (blind-signed interaction receipts)
- **Recent** — Prove your visit was within the time window (TimeBlind ZK proof)
- **Unique** — Prove this is your only review for this subject/epoch (nullifier)

All private data stays on your device. The server only sees proofs and public inputs.

## Built With

- **Nostr** — Decentralized Web of Trust source
- **Semaphore v4** — ZK group membership + nullifiers
- **Groth16** — Fast verification, small proof size
- **Blind signatures** — Untraceable interaction receipts
- **Local-first proving** — Private data never leaves your device

## FAQ

### General

<details>
<summary><strong>Do I need to be part of a Web of Trust to leave a review?</strong></summary>

Yes — and this is a hard requirement, not a filter. You need a Nostr account, and other people need to follow you (directly or indirectly). The system builds groups ("cohorts") from the Nostr follow graph, and you must be in one to submit a review. If you're not connected to anyone, or your group has fewer than 50 people, your review is rejected — it won't even be held for later. This is intentional: the anonymity guarantee depends on having a crowd to hide in, and the trust signal depends on social proximity being real.
</details>

<details>
<summary><strong>What's the minimum needed to submit a review?</strong></summary>

You need all of the following: (1) a Nostr identity, (2) enough social connections that your cohort has at least 50 members, (3) an actual visit to the business to get an interaction receipt, (4) your visit falls within an active time window, (5) you haven't already reviewed that business this period, and (6) the business has enough total reviews in the window (at least 20) for batch release. If any of these aren't met, the review is either rejected or held.
</details>

<details>
<summary><strong>When someone follows or unfollows someone, does everything have to be recomputed?</strong></summary>

No — not in real-time, and not everything. The system refreshes the social graph on a schedule (daily by default). At each refresh, it checks whether the graph has actually changed. If it hasn't, nothing is rebuilt. If it has, the Merkle trees are rebuilt with updated membership lists and new roots are published.

Existing reviews are not affected — they were verified against the root that was active at the time of submission, and that root remains valid for its time period. A new follow might move someone into a closer distance tier (e.g., d<=3 to d<=2) at the next refresh. A removed follow might bump someone out of a tier. But already-submitted reviews still stand either way.

So a single follow/unfollow doesn't trigger an immediate recomputation. It gets picked up in the next daily refresh, and only the affected cohort trees are rebuilt — not every tree in the system.
</details>

<details>
<summary><strong>Is this only for businesses? Could someone review a product, a landlord, or a grocery store SKU?</strong></summary>

Yes — the system is designed around a generic `subject_id`, not "businesses" specifically. A subject could be a restaurant, a product SKU, a hotel, a landlord, an apartment complex, or anything else people want to review. The cryptographic system doesn't care what the subject is. It just needs a unique identifier, an interaction receipt issuer (someone who can prove you actually interacted with it), and enough traffic to meet the anonymity thresholds.

The interesting part is how the interaction receipt works per subject type. For a restaurant, it might be NFC or a QR code at the location. For a grocery SKU, it could be tied to a purchase receipt. For a landlord, it could be tied to lease verification. The receipt issuer is pluggable — the rest of the system (WoT membership, Merkle trees, nullifiers, batch release) works identically regardless of what's being reviewed.

The main constraint is volume. A niche product that only 30 people buy per quarter might never hit the minimum cohort size (50 people), meaning reviews would be rejected to protect anonymity. The system works best for things lots of people interact with.
</details>

<details>
<summary><strong>Does this get expensive to scale across many subjects?</strong></summary>

Yes — scaling is a real consideration. For each subject, the system maintains 3 Merkle trees (one per distance tier), signing keysets for interaction receipts, nullifier entries, and adaptive time window state. So the cost grows roughly with the number of subjects.

At 1,000 local businesses, that's 3,000 trees to rebuild at each daily graph refresh. At 100,000 businesses, that's 300,000. At millions of SKUs across a retail chain, it gets serious.

The spec has some built-in relief: trees are only rebuilt when the graph actually changes, only affected trees are rebuilt (not every tree in the system), and subjects with no review activity don't need active trees. But at large scale, you'd also want incremental Merkle tree updates (change the affected leaves, not full rebuilds), sharding by subject, and reuse of shared subtrees across subjects — since the WoT graph is common, many subjects share the same members at the wider distance tiers.

The verification pipeline (the 10-step check when a review is submitted) scales with review volume, not subject count, so that side is more straightforward.
</details>

### For Reviewers

<details>
<summary><strong>Why does "recency" need a cryptographic proof?</strong></summary>

The TimeBlind proof actually does three things at once:

1. **Validity** — it proves your visit actually happened during the claimed time period. Without it, someone could reuse an old interaction receipt from 2 years ago and submit a review that looks "recent" but is based on a completely stale experience. The proof takes your private visit timestamp and cryptographically proves it falls within the time window — so you can't lie about when you went.

2. **Privacy** — it hides your exact visit time. The proof reveals only the time window (e.g., "January 2026"), not the exact day or hour. This is the "blind" part of TimeBlind.

3. **Filtering** — readers can filter reviews by time period, which matters because businesses change — new chefs, new management, updated products. Recency is useful signal, but readers get it through time windows, never exact timestamps.

So the window helps anonymity, the proof prevents stale receipt abuse, and the time window ID gives readers useful recency filtering.
</details>

<details>
<summary><strong>How is my identity protected?</strong></summary>

Your persistent identity is never linked to your reviews. You generate a one-time posting key for each review, and all proofs are created locally on your device. The server only sees cryptographic proofs, not who you are.
</details>

<details>
<summary><strong>Can the business figure out who I am?</strong></summary>

No. The ZK proof shows you're *someone* in the relevant social network who visited the business, but not *which* person. Reviews are also batch-released with randomized ordering so timing can't be used to narrow it down.
</details>

<details>
<summary><strong>What do I need to get started?</strong></summary>

A Nostr identity (for Web of Trust membership) and a visit to the business (to get a blind-signed interaction receipt). The app handles the cryptography.
</details>

<details>
<summary><strong>What happens if my phone is slow — can it generate the proofs?</strong></summary>

Proofs are generated locally using snarkjs in the browser via WASM. If your device can't handle it, there's an optional remote proving fallback — but the app will warn you about the privacy tradeoff.
</details>

<details>
<summary><strong>Can I edit or delete my review?</strong></summary>

No. Each review is tied to a one-time nullifier for that business and time period. You get one review per business per epoch.
</details>

<details>
<summary><strong>Why can't I see my review immediately after submitting?</strong></summary>

Reviews are batch-released at the end of each time window to prevent timing-based deanonymization. Your review is held until enough other reviews exist (minimum threshold) and the window closes.
</details>

### For Readers

<details>
<summary><strong>What do the verification badges mean?</strong></summary>

Each review can show: a WoT badge (reviewer is in your social network), an interaction badge (they actually visited), and an anonymity-set badge (the reviewer pool was large enough to be meaningful).
</details>

<details>
<summary><strong>What does "distance" mean (d<=1, d<=2, d<=3)?</strong></summary>

It's how many hops away the reviewer is in your social graph. d<=1 means someone you directly follow. d<=2 means a friend-of-a-friend. You can filter reviews by distance.
</details>

<details>
<summary><strong>Can I trust that reviews are from real customers?</strong></summary>

Yes — every review includes a cryptographic proof of interaction (a blind-signed receipt from the business). Fake reviews without a real visit are rejected by the verification pipeline.
</details>

<details>
<summary><strong>Are there fake reviews?</strong></summary>

Every review must pass four cryptographic checks before publication: WoT membership, verified visit, time-window proof, and uniqueness. Fabricating all of these is cryptographically infeasible.
</details>

### For Skeptics / Technical Users

<details>
<summary><strong>What do I have to trust?</strong></summary>

In local proving mode: the open-source client code, the circuit correctness, and the Semaphore v4 trusted setup ceremony (400+ participants). You do *not* need to trust a remote server with your private data.
</details>

<details>
<summary><strong>Is this open source?</strong></summary>

Yes. Reproducible builds let you verify that the deployed code matches the source.
</details>

<details>
<summary><strong>What's the "trusted setup" and should I worry about it?</strong></summary>

Arrival uses Semaphore v4's Groth16 ceremony, which had 400+ independent participants. As long as at least one participant was honest, the setup is secure. This is a widely accepted trust assumption in ZK systems.
</details>

<details>
<summary><strong>Can the system operator deanonymize me?</strong></summary>

No. The operator sees proofs and public inputs only. Your identity secret never leaves your device. `created_at` timestamps are internal-only and never exposed via any API.
</details>

<details>
<summary><strong>What happens if an interaction receipt issuer is compromised?</strong></summary>

Keyset rotation limits the blast radius to one time period. Compromised keysets can be revoked through the issuer registry.
</details>

### For Businesses

<details>
<summary><strong>Can I retaliate against a negative reviewer?</strong></summary>

No. That's the point. The reviewer is cryptographically anonymous — you can verify they visited your business, but you cannot determine who they are.
</details>

<details>
<summary><strong>How do I know the reviewer actually visited?</strong></summary>

Your location issues blind-signed interaction receipts. The receipt proves a visit happened without revealing which visitor left which review.
</details>

## Key Concepts (ELI5)

<details>
<summary><strong>What is a "cohort"?</strong></summary>

The group of people in your corner of the social network. When you leave a review, you prove you're *someone* in this group without saying who. The bigger the group, the harder it is to figure out which one you are.
</details>

<details>
<summary><strong>How do cohorts and Merkle trees work?</strong></summary>

Think of it like a school roster. For each business, Arrival takes the Nostr follow graph and builds three lists — people within 1 hop of the reader (d<=1), within 2 hops (d<=2), and within 3 hops (d<=3). Each list is a cohort.

Now, instead of publishing the full list (which would be a privacy problem), Arrival feeds the list into a Merkle tree. A Merkle tree takes all the members, hashes them in pairs, then hashes those results in pairs, and so on, until there's one single hash at the top — the "root." The root is published. The full list is not.

When you want to prove you're on the list, you don't reveal your name. Instead, you show a short "path" — just a few hashes from your spot in the tree up to the root. The math proves you're in the tree, but doesn't reveal where in the tree (or who you are). And because it's wrapped in a zero-knowledge proof, no one even sees the path — they just see "yes, this person is a member."

So there aren't thousands of cohorts. For each business, there are just three trees (one per distance tier). Each tree can have hundreds or thousands of members. The branches aren't separate cohorts — they're just the internal structure that makes the membership proof fast and private.
</details>

<details>
<summary><strong>What is a "Web of Trust"?</strong></summary>

It's your social network on Nostr, built from who follows whom. Arrival uses these connections to figure out how close a reviewer is to you socially.
</details>

<details>
<summary><strong>Who has to follow whom?</strong></summary>

Nobody has to follow the business. What matters is that you (the reviewer) are connected in the Nostr social graph to the people who will read the review. If a reader follows your friend, and your friend follows you, you're two hops away (d<=2) from that reader.
</details>

<details>
<summary><strong>Why does the group need to be at least 50 people?</strong></summary>

If only 3 people visited a restaurant last month, and an anonymous review appears, the owner can guess pretty easily who wrote it. The 50-person minimum (k_min) makes sure the crowd is big enough for real anonymity.
</details>

<details>
<summary><strong>What's a "nullifier"?</strong></summary>

A unique one-time token that proves "I already reviewed this place this period" without revealing who you are. It prevents double-reviewing while keeping you anonymous.
</details>

<details>
<summary><strong>What's a "blind signature"?</strong></summary>

When you visit a business, your app gets a digital stamp proving you were there — but the business can't connect that stamp to you later. It's like getting a hand stamp at a club while wearing a disguise.
</details>

<details>
<summary><strong>What does "zero-knowledge proof" mean?</strong></summary>

A way to prove a fact (like "I'm in this group" or "I visited this place") without revealing any details about yourself. The math checks out, but no private information is shared.
</details>

<details>
<summary><strong>What does "local proving" mean?</strong></summary>

All the cryptographic math runs on your own phone or laptop. Your private data never gets sent to a server. This is the default because it's the most private option.
</details>

<details>
<summary><strong>Why can't I see my review right away?</strong></summary>

If your review appeared the second you submitted it, someone could match the timing to figure out who you are. Instead, reviews are collected and released all at once in a batch, in random order.
</details>

<details>
<summary><strong>What's an "epoch" or "time window"?</strong></summary>

A review period for a specific business. Depending on how busy the business is, this could be a week, two weeks, a month, or a quarter. You get one review per business per window.
</details>

## Terms of Use

By using Arrival, you agree to the following terms. These exist to set clear expectations about what the system does, what it doesn't do, and what you're responsible for.

### What Arrival provides

1. **Cryptographic anonymity for reviewers.** Your persistent identity is never linked to your reviews through the protocol. Reviews are submitted with one-time keys and verified via zero-knowledge proofs.
2. **Proof-of-interaction verification.** Reviews are only admitted if backed by a valid blind-signed interaction receipt from the business.
3. **Web of Trust filtering.** Readers can filter reviews by social graph distance using Nostr follow data.
4. **Batch release.** Reviews are held and released in batches with randomized ordering to reduce timing-based deanonymization.

### What Arrival does NOT guarantee

1. **Absolute anonymity.** Arrival provides strong cryptographic anonymity, but no system can protect against all possible attacks. Side-channel risks include device compromise, network metadata leakage, and small anonymity sets (though k_min enforcement mitigates the last one). You are responsible for your own operational security.
2. **Review accuracy.** Arrival verifies that a reviewer is a real person who visited the business. It does not verify that the content of the review is truthful, fair, or complete.
3. **Permanent availability.** The service may experience downtime, and time windows or batch release schedules may change based on operational needs.
4. **Legal protection.** Anonymity is a technical property, not a legal shield. You are responsible for ensuring your reviews comply with applicable laws in your jurisdiction, including defamation and consumer protection laws.

### Your responsibilities

1. **Safeguard your identity key.** Your Nostr identity and derived secrets are your responsibility. If your device is compromised, your anonymity may be compromised. Arrival cannot recover lost keys.
2. **Honest reviews only.** The system is designed to enable honest reviews without fear of retaliation. Do not abuse it to post fraudulent, harassing, or deliberately misleading content.
3. **One review per window.** The nullifier system enforces one review per business per time period. Attempting to circumvent this (e.g., by creating multiple identities) undermines the trust model for everyone.
4. **Understand the trust model.** In local proving mode, you trust the open-source client code, the ZK circuit correctness, and the Semaphore v4 trusted setup. In remote proving mode, you additionally trust the remote prover operator. Read the [trust model documentation](mvp/06-trust-model-and-risk-mitigation.md) to understand what you're relying on.

### For businesses

1. **You cannot identify reviewers.** This is by design. Blind-signed receipts confirm a visit occurred but do not reveal which visitor left which review.
2. **You cannot suppress reviews.** Once a review passes the verification pipeline and is batch-released, it is published. There is no mechanism for businesses to remove or flag verified reviews.
3. **Receipt issuance is your responsibility.** Your interaction receipt system must be properly secured. Compromised signing keys can lead to fraudulent receipts for the affected time period (mitigated by keyset rotation).

### Data and privacy

1. **Private data stays local.** In default (local proving) mode, your identity secret, Merkle path, and interaction timestamps never leave your device.
2. **The server sees proofs only.** The Arrival server stores cryptographic proofs, nullifiers, and public inputs. It does not store or have access to your identity, your social connections, or your exact visit timestamps.
3. **No exact timestamps are exposed.** The `created_at` field is internal-only and never included in any API response. The only public timing signal is the `time_window_id`.
4. **Minimized logging.** Arrival follows a privacy-minimized logging policy. Operational logs do not contain identity-linked data.

### Changes to terms

These terms may be updated as the protocol evolves. Significant changes to the trust model, anonymity guarantees, or data handling will be communicated through the project's public channels and release notes.

## Documentation

See [`mvp/`](mvp/) for the full technical specification.
