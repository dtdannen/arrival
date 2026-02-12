# Arrival - Hackathon Presentation

## Elevator Pitch (30 seconds)

Reviews are broken. Honest reviewers face retaliation. Fake reviews poison trust. Arrival fixes this with zero-knowledge proofs: leave anonymous, verified reviews that prove you're a real person in the reviewer's social network, who actually visited the business, without revealing who you are.

## Narrative Arc

### 1. The Problem (1-2 min)

- **Retaliation kills honesty.** People self-censor negative reviews because business owners can see who wrote them. Yelp, Google, TripAdvisor — your name is right there.
- **Fake reviews poison trust.** Without verification, anyone can review anything. Paid review farms. Competitor sabotage. Astroturfing.
- **The core tension:** Identity verification and anonymity seem contradictory. Every existing platform picks one — Arrival solves both.

### 2. The Insight (1 min)

Zero-knowledge proofs let you prove *facts about yourself* without revealing *who you are*:

- "I'm in your social network" — without saying which friend
- "I visited this restaurant" — without revealing when exactly
- "This is my only review this period" — without linking to your identity

### 3. How It Works (2-3 min)

**Four proofs, one review:**

| Proof | What it proves | What stays private |
|-------|---------------|-------------------|
| **Membership** | Reviewer is in the WoT cohort for this subject | Which person they are |
| **Interaction** | Reviewer actually visited/used the business | Exact identity, exact time |
| **TimeBlind** | Visit happened within an allowed time window | Exact timestamp |
| **Uniqueness** | One review per person per subject per epoch | Link between review and identity |

**Key tech:**
- **Nostr** social graph as Web of Trust source
- **Semaphore v4** for ZK group membership + nullifiers
- **Blind signatures** for interaction receipts (business signs proof of visit, can't link it later)
- **Groth16** proofs — fast verification, small proof size

### 4. The Demo Flow (2-3 min)

Walk through the go/no-go demo scenario:

1. Alice has a Nostr identity and follows people who frequent a restaurant
2. She visits, gets a blind-signed interaction receipt (like a cryptographic stamp card)
3. Her phone generates a proof bundle locally — her secrets never leave her device
4. She submits her honest review with a one-time posting key
5. The gateway verifies all four proofs, admits the review
6. Readers see trust badges: WoT-verified, interaction-verified, anonymity-set size
7. Alice tries to submit a second review — deterministic rejection via nullifier

### 5. Why This Matters (1 min)

- **For reviewers:** Be honest without fear. Your employer, your landlord, that restaurant owner — none of them can trace a review back to you.
- **For readers:** Filter reviews by trust distance. "Show me reviews from friends-of-friends who actually went there."
- **For the ecosystem:** Sybil-resistant by design. Can't fake WoT membership. Can't fake interaction receipts. Can't review twice.

### 6. Architecture Highlight (1 min, if technical audience)

```
User Device                          Server
-----------                          ------
Identity secret  ----[ZK Proof]----> Verify membership
Interaction receipt -[ZK Proof]----> Verify interaction
Timestamp witness --[ZK Proof]----> Verify time window
Nullifier ---------[ZK Proof]----> Check uniqueness
                                     |
                                     v
                                   Admit (held)
                                     |
                                   Batch release (breaks timing correlation)
```

All private data stays on-device. Server only sees proofs and public inputs.

### 7. What's Next / Roadmap (30 sec)

- Local proving optimization (WASM/mobile)
- Multi-vertical expansion (landlords, employers, products)
- Decentralized verification (remove server trust)
- Portable reputation credentials

---

## Slide-by-Slide Content

### Slide 1: Title

**Headline:** Arrival
**Subhead:** Anonymous Reviews You Can Actually Trust
**Visual:** Logo/wordmark, dark background, subtle lock/shield motif
**Speaker notes:** Quick intro — your name, one sentence on what you built.

---

### Slide 2: The Problem — Retaliation

**Headline:** Honest reviews are dangerous
**Content:**
- "Your review of [Business] has been flagged by the owner"
- Screenshot/mockup of a Yelp-style review with reviewer's full name and photo visible
- Real stats if available: % of people who self-censor reviews, retaliation lawsuits (SLAPP suits)

**Speaker notes:** Start with emotion. "Imagine you had a terrible experience at a restaurant. You want to warn others. But your name, your photo — it's all right there. The owner sees it. Maybe they're your neighbor. Maybe they know your boss. So you say nothing."

---

### Slide 3: The Problem — Fake Reviews

**Headline:** Unverified reviews are worthless
**Content:**
- "FTC: $152 billion in consumer spending influenced by fake reviews annually"
- Visual: side-by-side of a 5-star review farm listing vs. real customer experience
- The two failure modes: platforms with identity (retaliation) vs. platforms without (fraud)

**Speaker notes:** "The other side of the coin. Without verification, reviews become a marketplace. You can buy 500 five-star reviews for $50. Competitors post fake negatives. The signal is buried in noise."

---

### Slide 4: The Core Tension

**Headline:** Verification and anonymity seem impossible to have at the same time
**Content:**
- Simple 2x2 matrix:
  | | Verified Identity | Anonymous |
  |---|---|---|
  | **Existing platforms** | Yelp, Google (retaliation risk) | Reddit, 4chan (no trust) |
  | **Arrival** | | Both. |
- Arrow or highlight on the "Both" cell

**Speaker notes:** "Every platform picks a side. Identity and trust, or anonymity and chaos. What if you didn't have to choose?"

---

### Slide 5: The Breakthrough — ZK Proofs

**Headline:** Prove facts without revealing identity
**Content:**
- Three plain-English statements:
  - "I'm in your social network" — *without revealing which person*
  - "I visited this business" — *without revealing when exactly*
  - "This is my only review" — *without linking to my identity*
- Small visual: a sealed envelope with a checkmark — "verified, but private"

**Speaker notes:** "Zero-knowledge proofs are the key insight. They let you prove something is true without revealing the underlying information. Not a new concept — but applying them to reviews is new."

---

### Slide 6: How It Works — Overview

**Headline:** Four proofs, one review
**Content:**
- Clean diagram of the four proof types stacked vertically:
  1. **Membership** — "I'm in the Web of Trust"
  2. **Interaction** — "I actually went there"
  3. **TimeBlind** — "My visit was recent enough"
  4. **Uniqueness** — "I haven't reviewed this before"
- Each with a lock icon and a checkmark
- Arrow pointing to: "Verified anonymous review"

**Speaker notes:** "Every review in Arrival must pass four cryptographic checks. Each one proves a specific fact while keeping a specific secret. Let me walk through each one."

---

### Slide 7: Proof Deep Dive — Membership (Web of Trust)

**Headline:** Trust your network, not a platform
**Content:**
- Visual: Social graph diagram (nodes and edges), one node highlighted but anonymous
- "Your Nostr social graph = your trust filter"
- How it works in one line: "We build a Merkle tree from the follow graph around each business. The reviewer proves they're a leaf in that tree — without revealing which leaf."
- Tech callout (small): Semaphore v4, Groth16

**Speaker notes:** "Instead of trusting Yelp to decide which reviews are real, you trust your own social network. If the reviewer is within 2 hops of people you follow on Nostr, that review is relevant to you. The reviewer proves membership in that group using a zero-knowledge proof — the server can verify they belong without learning who they are."

---

### Slide 8: Proof Deep Dive — Interaction (Blind Signatures)

**Headline:** Prove you went there. Business can't trace it back.
**Content:**
- 4-step visual flow:
  1. Alice visits restaurant, gets a "cryptographic stamp" (blinded token)
  2. Restaurant signs it (without seeing what they're signing)
  3. Alice unblinds the signature — now she has proof of visit
  4. Restaurant cannot link the signed receipt back to Alice's visit
- Key insight callout: "Like getting a stamp card punched while wearing a mask — they know *someone* came in, but not which receipt is yours"

**Speaker notes:** "This is the clever part. When you visit a business, your phone gets a cryptographic receipt. But it uses blind signatures — the business signs something without seeing the actual data. Later, when you use that receipt in your review, it's valid but untraceable. The business literally cannot connect the dots."

---

### Slide 9: Proof Deep Dive — TimeBlind + Uniqueness

**Headline:** Recent and unrepeatable
**Content:**
- **TimeBlind:** "Proves your visit was within an allowed window (e.g., this month) — without revealing the exact date/time"
  - Visual: a calendar with a shaded range, no specific day marked
- **Uniqueness:** "One review per person, per business, per time period — enforced cryptographically"
  - Visual: a nullifier concept — same person + same business + same epoch = same hash = blocked
- Together: "No stale reviews. No spam. No sockpuppets."

**Speaker notes:** "TimeBlind ensures reviews are timely without revealing exactly when you visited — because an exact timestamp could be used to identify you. The nullifier guarantees you can only review each business once per period. Try to submit twice and the system produces the same hash — instant rejection, no identity needed."

---

### Slide 10: Demo — Alice Reviews a Restaurant

**Headline:** End-to-end walkthrough
**Content:**
- Step-by-step with simple icons/mockups:
  1. Alice has a Nostr identity; she follows foodies in her city
  2. She eats at "Cafe ZK" — her phone gets a blind-signed receipt
  3. At home, her device generates the proof bundle *locally* (secrets never leave her phone)
  4. She writes her honest review and hits submit
  5. Gateway checks all four proofs in ~200ms
  6. Review appears in the feed with verification badges

**Speaker notes:** Walk through each step conversationally. Emphasize that step 3 is local — "Alice's private data never touches our servers. The proof is generated on her device. We only see the mathematical proof, not the secret inputs."

---

### Slide 11: Demo — What Readers See

**Headline:** Trust signals, not platform authority
**Content:**
- Mockup of a review card showing:
  - Review text
  - Badge: "WoT Verified (d<=2)" — reviewer is within 2 hops
  - Badge: "Interaction Verified"
  - Badge: "Anonymity Set: 847" — this many people *could* be the reviewer
  - Trust distance filter: slider for d<=1, d<=2, d<=3
- "Filter by trust distance: show only reviews from friends-of-friends"

**Speaker notes:** "This is what makes Arrival useful, not just private. As a reader, you can filter by trust distance. 'Only show me reviews from people within 2 hops of my network who actually went there.' The anonymity set badge tells you how many people could be the author — bigger number = stronger privacy guarantee."

---

### Slide 12: Demo — Rejection

**Headline:** The system says no — and proves why
**Content:**
- Alice tries to review Cafe ZK again → `duplicate_nullifier` — "You've already reviewed this business this period"
- Bob tries to review without visiting → `invalid_interaction_proof` — "No valid receipt"
- A fake account outside the WoT → `invalid_membership_proof` — "Not in the trust network"
- Tiny cohort (< 50 people) → `insufficient_anonymity_set` — "Not enough people to hide among"

**Speaker notes:** "The system doesn't just accept good reviews — it provably rejects bad ones. Each rejection has a specific, deterministic code. There's no ambiguity, no human moderation judgment call. Math says no."

---

### Slide 13: Architecture (Technical Audience)

**Headline:** What's under the hood
**Content:**
- Clean system diagram:
  ```
  [Nostr Graph] → [WoT Indexer] → [Cohort Root Publisher]
  [Business POS] → [Receipt Issuer] (blind signatures)

  [User Device]
    ├── Identity Client (Nostr keys, one-time posting keys)
    ├── Proof Engine (Semaphore v4, Groth16, local proving)
    └── Submit → [Review Gateway]
                    ├── Verify all 4 proofs
                    ├── Check nullifier store
                    └── Admit → [Batch Release] → [Review Feed API]
  ```
- Tech stack callout: Nostr, Semaphore v4, Circom, Groth16, blind signatures

**Speaker notes:** "Nine components. The key design principle: private data stays on the user's device. The server only processes proofs and public inputs. Batch release breaks timing correlation — all reviews for a window are published at once in random order."

---

### Slide 14: Why This Matters

**Headline:** Privacy and trust, not privacy *or* trust
**Content:**
- Three audience-specific value props:
  - **Reviewers:** "Be honest without fear. No retaliation. No self-censorship."
  - **Readers:** "Trust based on your social network, not a platform's algorithm."
  - **Businesses:** "Sybil-resistant reviews. No more competing with fake review farms."
- Bigger picture: "A new primitive for verified-but-anonymous attestation"

**Speaker notes:** "This isn't just a review app. It's a new primitive. Any time you need 'prove X about yourself without revealing who you are' — verified anonymous voting, whistleblowing, credential verification — this architecture applies."

---

### Slide 15: What's Next

**Headline:** Roadmap
**Content:**
- **Now:** MVP for local business reviews (restaurants, services)
- **Next:** Mobile-native local proving (WASM), UX polish
- **Later:** Multi-vertical (landlords, employers, products), decentralized verification, portable reputation credentials
- **The vision:** A world where honest feedback has zero personal cost

**Speaker notes:** Keep this brief. End on the vision, not the task list. "We want to make honesty free. No cost to telling the truth."

---

### Slide 16: Closing / CTA

**Headline:** Prove you went there. Say what you think. Stay anonymous.
**Content:**
- GitHub link / demo link
- Team info
- "Questions?"

**Speaker notes:** Repeat the tagline. Open for Q&A. Have the anticipated questions doc ready in your head.

---

## Presentation Strategy Notes

### Know Your Audience
- **General/product audience:** Lead with the problem and demo. Minimize ZK jargon. "Cryptographic proof" is enough — don't explain Poseidon hashing.
- **Technical/crypto audience:** Go deeper on Semaphore v4, blind signature scheme, nullifier construction, Groth16 tradeoffs. They'll ask about trusted setup.
- **Judges:** Focus on: Is the problem real? Is the solution novel? Is it buildable? Does it have a path to users?

### Anticipated Questions
- **"Why not just use anonymous accounts?"** — No verification. Anyone can make 100 anonymous accounts. Arrival proves you're a real person in the social graph who actually went there.
- **"Why Nostr for WoT?"** — Open protocol, no platform lock-in, existing social graph data, censorship-resistant.
- **"What about the trusted setup?"** — Semaphore v4 uses an existing Groth16 ceremony. We don't need a new one.
- **"How does the business issue receipts without tracking?"** — Blind signatures. Business signs a blinded token. When unblinded later, the signature is valid but the business can't link it to the signing event.
- **"Can the server deanonymize users?"** — Server sees proofs and public inputs only. Private witness data never leaves the device. Batch release breaks timing correlation.
- **"What stops collusion?"** — Trust model doc covers this. Short answer: WoT makes sybil attacks expensive (need real social connections), blind signatures prevent issuer-reviewer linkage, nullifiers prevent spam.

### Slide Count Estimate
- Title: 1
- Problem: 2-3
- Insight/Solution: 1-2
- How It Works (4 proofs): 2-3
- Demo walkthrough: 3-4
- Architecture: 1
- Why It Matters: 1
- Roadmap: 1
- **Total: ~12-15 slides**

### Design Notes
- Use a dark theme — fits the privacy/crypto aesthetic
- Diagram the blind signature flow visually (Alice -> Blinded token -> Business signs -> Alice unblinds -> Proof)
- Show the verification badges mockup on the review feed
- Keep slides sparse — one idea per slide, talk through the rest

### Title Options
- "Arrival: Anonymous Reviews You Can Actually Trust"
- "Prove You Went There. Say What You Think. Stay Anonymous."
- "Zero-Knowledge Reviews: Verified Trust Without Identity"
