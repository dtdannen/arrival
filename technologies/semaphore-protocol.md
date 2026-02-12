# Semaphore: anonymous group signaling with built-in double-signal prevention

## What it is

Semaphore is a zero-knowledge protocol specifically designed for one thing: **proving you're a member of a group without revealing which member you are**, with a built-in mechanism to prevent signaling twice.

It works by:
1. Members register "identity commitments" (hashed public keys) in a Merkle tree.
2. To signal (vote, post, review), a member generates a ZK proof that they know the private key behind one of the commitments in the tree -- without revealing which one.
3. A "nullifier" is deterministically derived from the member's private key and an external context (like a business ID). This prevents the same person from signaling twice in the same context, without revealing who they are.

Semaphore was created by the Privacy & Scaling Explorations team at the Ethereum Foundation. V4 is live, with a trusted setup ceremony completed in July 2024 involving 400+ participants.

## Why Semaphore is directly relevant

Semaphore solves the **anonymous social graph membership** problem almost exactly as this review system needs it. The mapping is natural:

| Semaphore concept | Review system equivalent |
|---|---|
| Group | A Nostr follow graph (or subset of it) |
| Member | A Nostr user (their public key commitment) |
| Signal | A review |
| External nullifier | Business ID being reviewed |
| Nullifier | Double-review prevention token |

### The flow

1. Build a Merkle tree from identity commitments of all public keys within N degrees of a user's follow graph.
2. When a reviewer writes a review, they generate a Semaphore proof: "I know a private key whose commitment is in this tree."
3. The proof includes a nullifier derived from (their private key + the business ID). If they try to review the same business again, the same nullifier appears, flagging the duplicate.
4. The proof is attached to the review. Anyone can verify it.

This gives you: anonymous group membership proof + double-review prevention + compact proof size. All in one protocol.

## What Semaphore provides out of the box

- **Merkle tree management**: Libraries for building and updating the identity tree.
- **ZK circuits**: Pre-built, audited Circom circuits for the membership proof.
- **Proof generation**: JavaScript/WASM prover that runs in browsers and Node.js.
- **Proof verification**: On-chain (Solidity) and off-chain (JavaScript) verifiers.
- **Nullifier system**: Built-in, no additional design needed.
- **Identity commitment scheme**: Standard way to derive commitments from private keys.

## What needs to be adapted for this system

Semaphore was built for Ethereum. Using it with Nostr requires bridging:

### Merkle tree construction
- Semaphore expects an on-chain Merkle tree (in a smart contract). For this system, the tree would be constructed off-chain from Nostr follow lists.
- A service (or the user's client) would read the follow graph from Nostr relays, compute identity commitments for each key, and build the Merkle tree.
- The Merkle root would be published (to a Nostr relay or similar) so verifiers can check proofs against it.

### Identity commitment format
- Semaphore uses `poseidon(secret, nullifier_seed)` as the identity commitment. This would need to be compatible with or derived from Nostr private keys.
- Simplest approach: derive the Semaphore identity from the Nostr private key deterministically. The user manages one key, the Semaphore identity is computed from it.

### Tree updates
- Nostr follow graphs change as people follow/unfollow. The Merkle tree needs periodic rebuilding.
- This doesn't need to be real-time. Follow graphs change slowly. Hourly or daily rebuilds are likely sufficient.
- Stale trees are a minor issue: a new follower might not be in the tree yet. This is acceptable.

## Existing ecosystem

- **Core library**: `@semaphore-protocol/core` (TypeScript/JavaScript)
- **Circuits**: Circom circuits, audited, with completed trusted setup
- **Used by**: WorldCoin/World ID (proving unique humanness), various voting and anonymous feedback systems
- **Community**: Active development, regular releases, comprehensive documentation

## Comparison with ring signatures

| Property | Semaphore (ZK) | Ring signatures |
|---|---|---|
| Proof size | ~200 bytes (constant) | O(n) with ring size |
| Group size support | Millions (Merkle tree) | Practical up to ~50 |
| Double-signal prevention | Built-in (nullifiers) | Requires linkable variant |
| Setup | Trusted setup (once) | None |
| Implementation complexity | Higher | Lower |
| Flexibility | Can add arbitrary constraints | Membership proof only |

For small groups (under 50), ring signatures are simpler. For large anonymity sets or when combined proofs are needed, Semaphore wins.

## Trade-offs

- **Ethereum-centric design**: Much of the tooling assumes Ethereum smart contracts. Adapting to Nostr is doable but requires building the Merkle tree management layer.
- **Trusted setup**: Groth16-based, so it requires a trusted setup ceremony. V4's ceremony had 400+ participants, making compromise extremely unlikely. But if this is a concern, a PLONK-based alternative could replace the proof system.
- **Proof generation time**: 2-5 seconds on a laptop, potentially 10-30 seconds on a phone without optimization. rapidsnark (C++ with ARM optimizations) helps significantly on mobile.
- **Merkle tree synchronization**: Keeping the tree in sync with Nostr follow graphs adds an infrastructure layer. This is the main new thing that needs to be built.
- **Identity binding**: The Semaphore identity needs to be securely derived from the Nostr key. If this derivation is compromised, anonymity breaks. Standard key derivation functions solve this, but the implementation must be careful.
