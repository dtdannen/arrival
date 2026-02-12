# Cashu ecash: production-ready blind signatures with Nostr integration

## What it is

Cashu is a free, open-source Chaumian ecash protocol built on Bitcoin and Lightning. A "mint" issues blind-signed tokens that represent value. Because the tokens are blind-signed, the mint cannot link issuance to redemption -- it knows a token is valid (it signed it) but not who it was issued to.

Cashu implements David Chaum's 1982 ecash scheme using elliptic curves rather than RSA. It's not theoretical -- it's deployed, processing real payments, with multiple wallet implementations and a formal specification.

## Why Cashu matters here (beyond payments)

Cashu's value for this review system isn't about money. It's that Cashu provides **production-ready blind signature infrastructure** that can be repurposed for proof of interaction.

The core mechanism: **NUT-12 DLEQ proofs**. When a Cashu mint signs a token, it includes a Discrete Log Equality proof demonstrating it used the correct private key. A token holder can present this DLEQ proof to a third party to demonstrate "I hold a token signed by this mint" without revealing which specific token. This is exactly what proof of interaction needs.

## Two models for proof of interaction

### Model A: Payment-as-proof (digital services)

If the service being reviewed accepts Cashu payments (or Lightning payments through a Cashu mint), the payment itself is the proof of interaction. You paid, you have a signed token, you can prove it.

Flow:
1. Pay for a service using Cashu tokens
2. You hold the spent token's DLEQ proof
3. When reviewing, include the DLEQ proof to demonstrate "I paid this mint"
4. The mint cannot determine which specific payment this corresponds to

This is elegant for digital services: AI agents, SaaS subscriptions, API access, online courses -- anything where payment happens through Cashu.

### Model B: Dedicated proof tokens (physical businesses)

A physical business runs a lightweight Cashu mint (or uses a shared community mint) that issues zero-value tokens at the point of sale. These tokens aren't about payment -- they're proof-of-interaction tokens that happen to use ecash infrastructure.

Flow:
1. You finish your meal. The restaurant generates a Cashu token (0-sat denomination)
2. You receive the token (via QR code, NFC, receipt code)
3. The token is blind-signed -- the restaurant signed it but can't link it to your visit
4. When reviewing, include the DLEQ proof
5. Anyone can verify: "This token was signed by the restaurant's mint"

The advantage of using Cashu instead of raw blind signatures: you get a complete protocol with token serialization, mint discovery, error handling, and wallet management already built.

## Nostr integration

Cashu already has Nostr integration points:

- **NUT-22**: Blind authentication using Cashu tokens -- proving identity to a relay without revealing it. Directly relevant to anonymous review posting.
- **Cashu payment events**: Nostr events that embed Cashu tokens. The format for attaching proofs to Nostr events already exists.
- **Mint discovery via Nostr**: Mints can advertise their existence through Nostr events, making it possible to discover which businesses participate in the proof system.

This means the review system doesn't need to build token infrastructure from scratch. It can build on Cashu's existing protocol and Nostr's existing event system.

## Practical maturity

- **Specifications**: Formal NUT (Notation, Usage, and Terminology) documents covering the full protocol
- **Libraries**: `cashu-ts` (TypeScript), `cdk` / Cashu Dev Kit (Rust), `nutshell` (Python reference implementation)
- **Wallets**: Cashu.me (web), Minibits (mobile), Nutstash, eNuts
- **Zero-knowledge spending conditions**: As of 2025, Cashu is integrating Cairo/STARK-based spending conditions, allowing arbitrary ZK-verified conditions on token use. This could enable conditions like "this token can only be used as a review proof for business X."
- **Active development**: Regular protocol updates, growing developer community

## Trade-offs

- **Mint trust**: A Cashu mint is a single point of trust. It could refuse to honor tokens, go offline, or be compromised. For proof-of-interaction, this is somewhat acceptable -- the business *is* the authority on whether an interaction happened. But it means the business controls the mint.
- **Fedimint alternative**: Fedimint provides the same ecash model but with a federation of guardians instead of a single mint. More trust-distributed but operationally heavier. Could be useful for a shared community mint that multiple businesses use.
- **Double-use detection**: Cashu prevents double-spending by tracking spent tokens. For proof-of-interaction, a design decision: can one token generate multiple reviews? If not, the mint needs to track usage. If one-visit-one-review, the mint learns "a token was used for a review" but not which customer.
- **Operational overhead for businesses**: Running a Cashu mint is simpler than running a full Bitcoin node but still requires a server. For small businesses, a hosted or shared mint model is more practical than self-hosting.
- **Bitcoin-centric**: Cashu is built on the Bitcoin/Lightning ecosystem. This is a feature (robust, well-tested infrastructure) and a limitation (ties the system to Bitcoin's stack).
