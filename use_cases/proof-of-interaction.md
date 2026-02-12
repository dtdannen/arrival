# Proof of interaction: verifying the reviewer was actually there

## The problem

One of the most damaging categories of fake reviews is from people who never used the product or visited the business at all. Competitors leave fake negative reviews. Marketing agencies leave fake positive reviews. Disgruntled people review businesses they've never set foot in. And there is no way to distinguish these from genuine customer experiences.

Platforms have tried:

- **"Verified Purchase" badges** (Amazon): Only confirms a transaction occurred on that platform. Easily gamed through refund schemes, free product programs, and "brush" scams. Doesn't exist for services, restaurants, local businesses.
- **Location check-ins** (Yelp, Google): Proves your phone was near the business. Doesn't prove you actually transacted. Can be spoofed.
- **Receipt uploads**: Cumbersome, reveals purchase details and personal info, easy to photoshop, and no platform seriously implements this.

The fundamental gap: there is no lightweight, privacy-preserving way for a business to attest "yes, this person was our customer" without revealing *which* customer they were.

## How it works (conceptually, not technically)

The idea is simple:

1. **A business generates a code** -- on a receipt, on a card, on a screen, via NFC, whatever the interaction context calls for.
2. **The code is cryptographic**: It proves "someone transacted with this business on this date" without encoding who.
3. **The reviewer includes this proof in their review**: It's embedded in the review's metadata, not visible as text.
4. **Anyone reading the review can verify**: Yes, this review includes valid proof of interaction with the business. No, you cannot determine which specific transaction it corresponds to.

The business participates voluntarily. In fact, it's in their interest to participate -- it means the reviews they receive are from actual customers, which protects them from competitor sabotage and drive-by negativity.

## Why this changes the game

### For reviewers
- Your review carries more weight. "I actually went there and here's the cryptographic proof" is a different category of credible than "trust me bro."
- You can still be anonymous. The proof doesn't reveal your identity -- just that you interacted with the business.
- You can choose whether to include it. Maybe you overheard something at a business but weren't a customer -- you can still review, it just won't have the verified badge.

### For businesses
- Protection against fake negative reviews. If you participate in the proof system, reviews without proof are visibly unverified. A competitor's hit piece stands out.
- Authentic feedback loop. When you know every verified review is from a real customer, the feedback becomes genuinely actionable.
- A trust signal to new customers. "This business participates in verified reviews" becomes a mark of confidence, like a health inspection grade on a restaurant window.

### For readers
- Instant credibility assessment. A review with proof-of-interaction is fundamentally more trustworthy than one without.
- Combined with trust-network filtering, this creates a powerful signal: "Someone within 2 degrees of my social graph, who verifiably visited this business, had this experience."
- No more wondering "is this person even real?" The interaction proof provides a strong baseline of authenticity.

## Use case scenarios

### Restaurant
You finish dinner. The receipt has a QR code at the bottom (or the payment terminal flashes one). You scan it. Later, when you write your review, the proof is automatically attached. The restaurant cannot trace which table you were at or what you ordered. But your review now carries verifiable weight.

### Online purchase
You buy a product. The shipping confirmation includes a unique proof token. When the product arrives and you review it, you include the token. This goes beyond Amazon's "verified purchase" because it works across any platform -- the proof is portable, not locked to one marketplace.

### Service provider (doctor, lawyer, contractor)
You complete an appointment. The practice generates a proof of visit -- not a proof of what happened during the visit, just that you were there. When you review them (anonymously), the proof confirms you were an actual patient/client. This is especially powerful for healthcare, where reviews are critical but retaliation fears are highest.

### Hotel or travel
You check out. The hotel receipt includes a proof token covering your stay dates. Your review of "the walls are paper thin and the elevator was broken for 3 days" now carries the weight of someone who was verifiably there during that period.

### Beauty product
A brand includes a verifiable code inside the packaging (under the cap, on the seal). This proves you bought an authentic product (not a counterfeit) and actually used it. Your review is now verified against both the product and the purchase. This directly addresses the counterfeit problem in beauty -- if someone reviewed a fake SkinCeuticals, they wouldn't have the authentic proof code.

## The opt-in dynamic

This system works even with partial adoption because of the **asymmetry of incentives**:

- Businesses that know they provide good service want to participate -- it protects them and validates their positive reviews.
- Businesses that rely on fake positive reviews or fear authentic feedback will resist -- and that resistance itself becomes a signal.
- Consumers quickly learn that proof-of-interaction reviews are more reliable, creating demand pressure on businesses to participate.

Over time, not participating becomes suspicious, similar to how a restaurant without a health grade posted raises eyebrows.

## What this doesn't solve (and that's okay)

- It doesn't prevent a real customer from leaving a dishonest review. But the trust network helps with that -- your friends have reputations to maintain.
- It doesn't work for all contexts. You can't get a proof code for a public park or a street performance. That's fine -- not every review needs verification.
- It requires business cooperation. But unlike current "verified purchase" systems, the business doesn't need to share customer data with a platform. They just issue anonymous tokens.

## Who this serves

- Consumers who want confidence that reviewers actually experienced what they're reviewing
- Businesses tired of fake reviews (both positive from competitors gaming the system and negative from people who were never customers)
- High-stakes verticals: healthcare, legal services, financial advisors, contractors -- where fake reviews can cause serious harm
- Beauty and supplement buyers who need assurance the reviewer used the authentic product
- Anyone who has read a suspiciously detailed 1-star review and wondered "did this person even go there?"
