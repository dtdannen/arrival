# Nostr public/private keys: the identity layer

## What it is

Nostr (Notes and Other Stuff Transmitted by Relays) gives every user a cryptographic identity: a secp256k1 key pair. Your private key (nsec) is your identity. Your public key (npub) is how others refer to you. There's no server that owns your account, no email required, no phone number. You just generate a key pair and you exist.

This is the same elliptic curve cryptography used by Bitcoin. Keys are 32 bytes. They're portable across any Nostr client. If one client or relay disappears, your identity persists -- because it's just math, not a database row.

## Why this matters for the review system

Every other review platform ties your identity to a corporate account: your Google profile, your Yelp account, your Amazon login. This creates two problems:

1. **The platform owns your identity.** Google can delete your account and every review you've ever written vanishes. Amazon can shadow-ban your reviews. You have zero recourse.
2. **Your identity is linked to your real name.** Google Maps reviews show your name and profile photo. This is why people get harassed for leaving honest reviews.

Nostr keys solve both:

- **Self-sovereign identity**: No one can delete your key pair. No one can revoke your ability to sign messages. Your reviews are yours, signed by your key, verifiable by anyone.
- **Pseudonymous by default**: Your npub is a string of characters. It's not linked to your name, email, or phone unless you choose to link it. You can build a reputation under a pseudonym.
- **Portable reputation**: Because your identity isn't locked to a platform, your review history follows you everywhere. Switch apps, switch relays, your signed reviews are still verifiable as yours.

## How it works in practice

A user generates a key pair (most Nostr clients do this automatically on first launch). Their public key becomes their reviewer identity. When they write a review, they sign it with their private key. Anyone can verify the signature using the public key.

The key pair is the foundation that everything else builds on:

- **Follow graphs** (web of trust) are built on top of these keys
- **Ring signatures** use these keys as the anonymity set
- **Proof of interaction tokens** are tied to these keys
- **ZK proofs** prove properties about these keys without revealing them

## Existing ecosystem

- **Clients**: Damus (iOS), Amethyst (Android), Primal, Snort, Coracle (web)
- **Key management**: Amber (Android signer), nsecBunker (remote signer), NIP-07 browser extensions
- **NIPs (Nostr Implementation Possibilities)**: Open protocol specs. NIP-01 defines the basic event format. NIP-02 defines follow lists. Custom NIPs can define review events.
- **Relay infrastructure**: Thousands of relays worldwide. Anyone can run one.
- **Libraries**: `nostr-tools` (JS), `rust-nostr` (Rust), `python-nostr` (Python)

## Trade-offs

- **Key management is hard**: If you lose your private key, you lose your identity. There's no "forgot password" flow. This is the price of self-sovereignty. Solutions exist (seed phrases, NIP-49 key encryption) but it's still a UX challenge.
- **No built-in key recovery**: Unlike a Google account where you can recover via phone number, a lost Nostr key is gone. The community is working on social recovery schemes but nothing is standard yet.
- **Sybil attacks**: Anyone can generate unlimited key pairs. A single person can create thousands of identities. This is why the follow graph / web of trust layer is essential -- raw keys alone don't prove humanness.
- **secp256k1 only**: Nostr is locked to one curve. Some advanced cryptographic schemes (like BBS+ signatures) require different curves (BLS12-381). This means the review system may need to manage keys on multiple curves, with Nostr keys as the primary identity and derived keys for specific cryptographic operations.
