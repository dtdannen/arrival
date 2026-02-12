# Arrival - 5-Slide Hackathon Deck

## Slide 1: The Problem

**Headline:** Reviews are broken

**Content:**
- Left side: "Honest reviews are dangerous" — your name is on every review you write. Business owners see it. Retaliation is real.
- Right side: "Anonymous reviews are worthless" — no verification means review farms, sockpuppets, competitor sabotage.
- Bottom, bold: **Every platform chooses identity OR anonymity. What if you could have both?**

**Speaker notes:** "Reviews have a fundamental problem. If your name is attached, you self-censor — bad restaurant? Creepy landlord? You say nothing because they know who you are. But if reviews are anonymous, anyone can fake them. Every platform picks a side. We solved both."

---

## Slide 2: The Solution

**Headline:** Arrival: zero-knowledge verified reviews

**Content:**
- One sentence: "Prove you're a real person who actually went there — without revealing who you are."
- Four proof badges in a row, each with a one-liner:
  - **WoT Member** — "I'm in your social network"
  - **Verified Visit** — "I actually went there"
  - **Recent** — "My visit was within the time window"
  - **Unique** — "This is my only review"
- Below: "All four verified cryptographically. Zero personal data exposed."

**Speaker notes:** "Arrival uses zero-knowledge proofs. Every review must pass four checks. You prove you're in the reader's social network — using Nostr's Web of Trust. You prove you visited the business — using blind-signed receipts that the business can't trace back to you. You prove it was recent. And you prove you haven't reviewed before. All without revealing a single bit of personal information."

---

## Slide 3: How It Works

**Headline:** Blind signatures + ZK proofs + Web of Trust

**Content:**
- Visual flow, left to right:
  1. **Visit** — Alice eats at a restaurant. Her phone gets a blind-signed receipt. (Business signs it without seeing the data.)
  2. **Prove** — Her device generates a ZK proof bundle *locally*. Private data never leaves her phone.
  3. **Submit** — One-time posting key. Gateway verifies all four proofs. Admitted.
  4. **Read** — Readers filter by trust distance: "Show me reviews from friends-of-friends who actually went there."
- Bottom callout: "The business can't trace the receipt. The server can't see the identity. The reader gets verified trust signals."

**Speaker notes:** "Here's the flow. You visit a business and get a cryptographic receipt — but it uses blind signatures, so the business signs something without seeing what it is. They can't connect the dots later. Your phone builds a proof bundle locally — your secrets never touch our servers. You submit with a throwaway key. The gateway checks the math and admits it. Readers see trust badges and can filter by social distance."

---

## Slide 4: Demo

**Headline:** End-to-end proof-verified review

**Content:**
- Live demo or annotated screenshots of:
  1. Review submitted with verification badges visible (WoT d<=2, Interaction Verified, Anonymity Set: 847)
  2. Duplicate attempt → rejected: `duplicate_nullifier`
  3. No receipt → rejected: `invalid_interaction_proof`
  4. Outside WoT → rejected: `invalid_membership_proof`
- Key stat: "k_min = 50 — your review is hidden among at least 50 people who could have written it"

**Speaker notes:** "Here's a submitted review. You can see the badges — this reviewer is within 2 hops of your network, they verified their visit, and 847 people could be the author. Now watch what happens when we try to game it. Duplicate review? Rejected — same nullifier. No receipt? Rejected. Not in the trust network? Rejected. No human moderation. Math says no."

---

## Slide 5: The Vision

**Headline:** Prove you went there. Say what you think. Stay anonymous.

**Content:**
- "Arrival is a new primitive: verified-but-anonymous attestation"
- Three expansion paths:
  - **Restaurants** → Landlords → Employers → Products → Services
  - **Reviews** → Whistleblowing → Anonymous voting → Credential verification
- Tech stack: Nostr, Semaphore v4, Groth16, blind signatures, local-first proving
- GitHub / demo link
- **Questions?**

**Speaker notes:** "This isn't just a review app — it's a new primitive. Any time someone needs to prove a fact about themselves without revealing who they are, this architecture works. Anonymous employee reviews. Whistleblowing. Verified voting. We're starting with restaurant reviews because the problem is concrete and the demo is intuitive. But the protocol is general. We want to make honesty free."
