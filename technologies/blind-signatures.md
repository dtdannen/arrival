# Blind signatures: proof of interaction without linkability

## What it is

A blind signature, introduced by David Chaum in 1982, lets someone get a message signed by an authority *without the authority seeing the message*. The signer signs a "blinded" version of the message. The requester then "unblinds" the result to get a valid signature on the original message. The signer can later verify the signature is valid but cannot link it back to the signing session.

Think of it like carbon paper in an envelope: you put a document in a sealed envelope with carbon paper. The signer signs the outside of the envelope, and the signature transfers through to the document inside. They signed your document without ever seeing it.

## How it applies to this review system

Blind signatures are the **core primitive for proof of interaction** -- the mechanism by which a business attests "this person was my customer" without being able to identify which customer later.

### The flow

1. You visit a restaurant. At the end of your meal, your phone generates a random secret value and *blinds* it (wraps it cryptographically).
2. The restaurant's system signs the blinded value. This could happen via QR code on the receipt, NFC tap at the register, or a code printed on the bill.
3. Your phone *unblinds* the signature, revealing a valid signature from the restaurant on your secret value.
4. Days later, you write a review and attach `(secret, signature)` as proof of interaction.
5. Anyone can verify: "This signature is valid under the restaurant's public key." But the restaurant cannot determine which customer holds this particular signed token -- they never saw the unblinded value.

**This is the magic**: the restaurant provably signed something for you, but they mathematically cannot connect the signed token to your visit. The unlinkability isn't a policy choice -- it's a mathematical guarantee.

### Partially blind signatures

A limitation of plain blind signatures is that they prove "the business signed *something*" but don't encode any metadata. Partially blind signatures fix this: the signer and requester agree on a visible portion (like a date range or service category) while the identifying portion remains blinded.

Example: the restaurant signs a token where the visible part is "January 2026, dinner service" and the blinded part is your secret. The resulting proof says "someone dined at this restaurant in January 2026" without revealing who.

## Why this beats existing verification

| Approach | Proves real customer? | Preserves anonymity? | Works cross-platform? |
|---|---|---|---|
| Amazon "Verified Purchase" | Weakly (gameable) | No (tied to account) | No (Amazon only) |
| Google location check-in | No (just proximity) | No (tied to account) | No (Google only) |
| Receipt upload | Yes (if genuine) | No (reveals purchase details) | Yes |
| **Blind signature token** | **Yes (cryptographic proof)** | **Yes (mathematically unlinkable)** | **Yes (portable)** |

## Practical maturity

Blind signatures are 40+ years old and extremely well understood. This is not experimental cryptography.

- **RSA blind signatures**: IETF standard (RFC 9474). Rust crate `blind-rsa-signatures`. JavaScript implementations exist.
- **Elliptic curve blind signatures**: Used by Cashu (ecash protocol). Well-implemented in TypeScript and Rust.
- **Production deployments**: Cashu ecash is built entirely on blind signatures and processes real payments. The Privacy Pass protocol (used by Cloudflare) uses blind signatures for anonymous authentication tokens.

## Integration scenarios

### Physical business (restaurant, store, salon)
The business displays a QR code at checkout (or the POS terminal generates one). The customer's app scans it, performs the blind signing protocol, and stores the resulting token. Takes under a second.

### Online purchase
After payment, the e-commerce system includes a blind-signing endpoint in the confirmation flow. The customer's app automatically obtains a proof token. Could also be embedded in shipping confirmation.

### Service provider (doctor, mechanic, lawyer)
The practice's system generates a proof token at check-out. The token proves "this person had an appointment" without encoding what the appointment was for.

### Beauty product (anti-counterfeit)
The brand embeds a one-time blind-signing code inside the packaging. When the customer opens the product, they scan the code to obtain a proof token. This proves they have the authentic product (counterfeits won't have valid codes) AND creates the proof of interaction for a review.

## Trade-offs

- **Requires real-time interaction**: The blinding/signing/unblinding protocol requires a live exchange between the customer's device and the business's system. This is natural for in-person (QR/NFC) but adds a step to the checkout flow.
- **Business participation required**: The business must run signing infrastructure. This could be as simple as an app or POS integration, but it's not zero effort. The incentive: businesses that participate get verified reviews, which protects them from fake negative reviews.
- **Key management for businesses**: The business needs a signing key pair. If the key is compromised, fake proofs can be generated. Key rotation, hardware security modules, and transparency logs can mitigate this.
- **One token per interaction**: By default, each blind signing session produces one token. The system needs to decide: one token per visit? Per transaction? Per item? This is a design choice.
- **No attribute richness**: Plain blind signatures don't encode structured data. For richer proof-of-interaction credentials (date, category, service type), you'd need partially blind signatures or BBS+ signatures.
