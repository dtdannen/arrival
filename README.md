# arrival

The future of reviews: Anonymous, Verifiable, based on your Web of Trust

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

### For Reviewers

**How is my identity protected?**
Your persistent identity is never linked to your reviews. You generate a one-time posting key for each review, and all proofs are created locally on your device. The server only sees cryptographic proofs, not who you are.

**Can the business figure out who I am?**
No. The ZK proof shows you're *someone* in the relevant social network who visited the business, but not *which* person. Reviews are also batch-released with randomized ordering so timing can't be used to narrow it down.

**What do I need to get started?**
A Nostr identity (for Web of Trust membership) and a visit to the business (to get a blind-signed interaction receipt). The app handles the cryptography.

**What happens if my phone is slow — can it generate the proofs?**
Proofs are generated locally using snarkjs in the browser via WASM. If your device can't handle it, there's an optional remote proving fallback — but the app will warn you about the privacy tradeoff.

**Can I edit or delete my review?**
No. Each review is tied to a one-time nullifier for that business and time period. You get one review per business per epoch.

**Why can't I see my review immediately after submitting?**
Reviews are batch-released at the end of each time window to prevent timing-based deanonymization. Your review is held until enough other reviews exist (minimum threshold) and the window closes.

### For Readers

**What do the verification badges mean?**
Each review can show: a WoT badge (reviewer is in your social network), an interaction badge (they actually visited), and an anonymity-set badge (the reviewer pool was large enough to be meaningful).

**What does "distance" mean (d<=1, d<=2, d<=3)?**
It's how many hops away the reviewer is in your social graph. d<=1 means someone you directly follow. d<=2 means a friend-of-a-friend. You can filter reviews by distance.

**Can I trust that reviews are from real customers?**
Yes — every review includes a cryptographic proof of interaction (a blind-signed receipt from the business). Fake reviews without a real visit are rejected by the verification pipeline.

**Are there fake reviews?**
Every review must pass four cryptographic checks before publication: WoT membership, verified visit, time-window proof, and uniqueness. Fabricating all of these is cryptographically infeasible.

### For Skeptics / Technical Users

**What do I have to trust?**
In local proving mode: the open-source client code, the circuit correctness, and the Semaphore v4 trusted setup ceremony (400+ participants). You do *not* need to trust a remote server with your private data.

**Is this open source?**
Yes. Reproducible builds let you verify that the deployed code matches the source.

**What's the "trusted setup" and should I worry about it?**
Arrival uses Semaphore v4's Groth16 ceremony, which had 400+ independent participants. As long as at least one participant was honest, the setup is secure. This is a widely accepted trust assumption in ZK systems.

**Can the system operator deanonymize me?**
No. The operator sees proofs and public inputs only. Your identity secret never leaves your device. `created_at` timestamps are internal-only and never exposed via any API.

**What happens if an interaction receipt issuer is compromised?**
Keyset rotation limits the blast radius to one time period. Compromised keysets can be revoked through the issuer registry.

### For Businesses

**Can I retaliate against a negative reviewer?**
No. That's the point. The reviewer is cryptographically anonymous — you can verify they visited your business, but you cannot determine who they are.

**How do I know the reviewer actually visited?**
Your location issues blind-signed interaction receipts. The receipt proves a visit happened without revealing which visitor left which review.

## Documentation

See [`mvp/`](mvp/) for the full technical specification.
