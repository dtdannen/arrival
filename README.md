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

## Documentation

See [`mvp/`](mvp/) for the full technical specification.
