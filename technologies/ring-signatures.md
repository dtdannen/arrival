# Ring signatures: proving group membership without revealing identity

## What it is

A ring signature lets you sign a message on behalf of a group -- called a "ring" -- without revealing which member of the group actually signed. The verifier can confirm that *someone* in the ring signed the message, but mathematically cannot determine who.

The key properties:

- **No setup required**: The signer picks the ring members unilaterally. The other members don't participate, don't know they're included, and don't need to agree.
- **Ad-hoc rings**: You choose which public keys to include each time you sign. No pre-registration, no group manager.
- **Unconditional anonymity**: No one -- not even with unlimited computational power -- can determine which ring member signed. There's no trapdoor, no master key, no way to unmask the signer.

Invented in 2001 by Rivest, Shamir, and Tauman, originally motivated by the concept of leaking secrets: proving you're a White House insider without revealing which insider you are.

## How it applies to this review system

Ring signatures are a natural fit for anonymous reviews within a trust network. Here's the flow:

1. A reviewer wants to post an anonymous review for a restaurant.
2. They look at the Nostr follow graph around the reader's social circle and pick N public keys (say, 20 people within 2 degrees of connection).
3. They create a ring signature on their review using their own private key and the 19 other public keys.
4. Anyone verifying the review can confirm: "One of these 20 people wrote this review." But not which one.

This directly delivers the core promise: **anonymous to the business and public, but provably from within a trusted social circle.**

### Why this beats full anonymity

A fully anonymous review has no credibility. A review signed by an identifiable person risks retaliation. A ring signature is the middle ground:

- The business cannot harass the reviewer (they don't know who it is)
- The reader knows the reviewer is real (they're one of N known people in the trust network)
- The ring size controls the anonymity/credibility tradeoff (bigger ring = more anonymous, smaller ring = more credible)

### Linkable ring signatures

A variant called **linkable ring signatures** (used by Monero) adds one property: if the same person signs twice with the same ring, the signatures contain a shared "key image" that reveals it's the same signer -- without revealing who.

This is perfect for preventing double-reviewing:
- If someone tries to review the same business twice, the two reviews share a key image, flagging a duplicate.
- Reviews for *different* businesses produce different key images, so cross-business tracking is impossible.

## Practical considerations

### Ring size vs. signature size

Basic ring signature size scales linearly with the number of ring members: O(n). A ring of 20 members means a signature roughly 20x the size of a standard signature.

For this system, practical ring sizes are likely 10-50 members, producing signatures of 1-5 KB. This is acceptable for Nostr events (which have no strict size limit on most relays) but worth optimizing.

More advanced constructions reduce this:
- **Logarithmic ring signatures**: O(log n) size. More complex but dramatically smaller for large rings.
- **ZK Merkle inclusion proofs**: Instead of a ring signature, prove "my key is in this Merkle tree of N keys" using a ZK proof. Proof size is constant regardless of N. This is what Semaphore does.

### Compatibility with Nostr keys

Nostr uses secp256k1 (Schnorr signatures via BIP-340). Ring signatures can be constructed over the same curve, meaning existing Nostr key pairs can be used directly. No need for users to manage separate keys.

Schnorr-based ring signatures are well-studied. The construction is: given public keys P1, P2, ..., Pn, and knowing the private key for one of them, produce a signature that verifies against the entire set.

### Ring selection strategy

Who goes in the ring? This is a design decision with implications:

- **Follow-graph based**: Pick N keys from the reader's extended follow graph. This proves "the reviewer is in your social circle" but requires knowing the reader's graph at signing time (or signing for a pre-computed group).
- **Community-based**: Use a fixed set of keys (e.g., all members of a Nostr community). The ring represents "someone in this community."
- **Random + target**: Include the reviewer's key plus random keys from the broader network. Weaker trust signal but simpler.

The strongest approach: the reviewer signs with a ring of keys drawn from a known community or follow graph intersection. The reader verifies "one of these people, all within my trust network, wrote this."

## Existing implementations

- **Monero**: The most battle-tested ring signature implementation in production. Uses CLSAG (Concise Linkable Spontaneous Anonymous Group) signatures. Written in C++, heavily audited.
- **Ring signature libraries**: Various implementations in Rust and JavaScript exist, though maturity varies. Most are academic or experimental.
- **For secp256k1 specifically**: Would likely need to be built or adapted from existing Schnorr ring signature papers. The cryptographic construction is straightforward, but a production-quality, audited library for Schnorr ring signatures on secp256k1 is a gap.

## Trade-offs

- **Signature size**: Scales with ring size. Manageable for small-to-medium rings (10-50) but becomes impractical for very large anonymity sets (1000+). ZK-based approaches are better for large sets.
- **Ring selection reveals information**: The choice of *which* keys to include in the ring can leak information. If the ring contains 19 keys from San Francisco and 1 from Tokyo, the Tokyo person is probably the signer. Ring selection needs care.
- **No revocation**: Once a ring signature is created, it can't be revoked or attributed. If a review is provably defamatory, there's no mechanism to unmask the author. This is a feature for anti-retaliation but a concern for abuse.
- **Computational cost**: Signing and verification scale linearly with ring size. Not a bottleneck for typical sizes (10-50) but relevant at scale.
- **Simpler than ZK, weaker than ZK**: Ring signatures are easier to implement than full ZK proof systems but less flexible. They prove group membership but can't prove arbitrary additional statements (like proof of interaction) in the same signature. For combined proofs, ZK is the better tool.
