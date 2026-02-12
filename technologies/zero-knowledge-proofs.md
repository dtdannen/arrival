# Zero-knowledge proofs: proving statements without revealing information

## What it is

A zero-knowledge proof lets you convince someone that a statement is true without revealing any information beyond the truth of the statement itself. "I know the password" without showing the password. "I'm over 21" without showing your ID. "I'm in this group" without revealing which member I am.

For this review system, ZK proofs are the most powerful and flexible cryptographic tool. They can express almost any statement you'd want to prove about a review's author.

## What ZK proofs enable in this system

### Anonymous social graph membership

"My public key is in the set of people within 2 degrees of your follow graph."

Expressed as a ZK circuit: "I know a private key `sk` such that the corresponding public key `pk = sk * G` is a leaf in this Merkle tree of public keys." The proof reveals nothing about which leaf.

### Proof of interaction with hidden identity

"I possess a valid token signed by this business."

Expressed as a ZK circuit: "I know values `(x, sig)` such that `Verify(business_pubkey, x, sig) = true`." The proof reveals only that the statement is true -- not `x` or `sig`.

### Combined proofs

The real power: combine both into a single proof. "I am in your social graph AND I have a valid interaction token from this business." One proof, two guarantees, zero information leaked.

## ZK proof systems compared

### Groth16 (recommended primary system)

The workhorse of practical ZK. Used by Zcash, Semaphore, WorldCoin, Tornado Cash.

- **Proof size**: ~200 bytes. Tiny. Perfect for embedding in Nostr events.
- **Verification time**: ~10ms. Instant for any client.
- **Proving time**: 2-5 seconds on a laptop for moderately complex circuits. Under 1 second with optimized provers (rapidsnark).
- **Trusted setup**: Requires a one-time ceremony per circuit. This is a real downside -- if the setup ceremony is compromised, fake proofs can be generated. Multi-party ceremonies (like Semaphore V4's with 400+ participants) mitigate this.
- **Tooling**: Circom (circuit DSL) + snarkjs (JavaScript prover/verifier). The most mature ZK development ecosystem. Extensive library of existing circuits for common operations (Merkle trees, signature verification, hash functions).

### PLONK / Halo2

An alternative that avoids Groth16's per-circuit trusted setup.

- **Proof size**: ~500 bytes. Slightly larger but still small.
- **Universal setup**: One setup works for any circuit (or no setup at all with Halo2's IPA variant).
- **Tooling**: Halo2 (Rust, from Zcash). More complex than Circom but more flexible. Noir (higher-level DSL from Aztec) compiles to PLONK backends.
- **Trade-off**: More complex development experience than Circom/Groth16, but eliminates the trusted setup concern.

### STARKs

No trusted setup. Post-quantum secure. But large proofs.

- **Proof size**: 50-200 KB. Too large for embedding in Nostr events without compression or off-chain storage.
- **Best for**: Large computations. Overkill for the relatively simple proofs this system needs (group membership, signature verification).
- **Relevance**: Cashu is integrating Cairo/STARK-based spending conditions, so STARKs may enter the system through the ecash layer rather than directly.

### Bulletproofs

No trusted setup. Logarithmic proof size. But limited expressiveness.

- **Best for**: Range proofs ("this value is between X and Y"). Not suited for general computation like signature verification or Merkle tree traversal.
- **Possible niche use**: Proving "my interaction happened within this date range" without revealing the exact date.

## Practical tooling

| Tool | Language | Best for | Maturity |
|---|---|---|---|
| Circom + snarkjs | JS/WASM | Groth16 circuits, rapid prototyping | Production |
| rapidsnark | C++ (ARM-optimized) | Fast mobile proving | Production |
| Halo2 | Rust | No-trusted-setup proofs | Production (Zcash) |
| Noir | Custom DSL | Developer-friendly ZK | Growing |
| Cairo | Custom DSL | STARK proofs (Cashu integration) | Production |

## What the circuits would look like

### Social graph membership circuit

Inputs (private): secret key `sk`, Merkle path
Inputs (public): Merkle root, nullifier hash
Constraints:
1. Compute `pk = sk * G` (public key derivation)
2. Compute `commitment = hash(pk, secret)` (identity commitment)
3. Verify Merkle path from `commitment` to `root`
4. Compute `nullifier = hash(sk, external_nullifier)` (double-review prevention)

This is essentially what Semaphore does. The circuit is ~65K constraints, proving takes 2-5 seconds.

### Proof of interaction circuit

Inputs (private): token `x`, signature `sig`
Inputs (public): business public key
Constraints:
1. Verify `sig` is a valid signature on `x` under the business public key

Signature verification in a ZK circuit is the most expensive part (~50K constraints for Schnorr verification).

## Trade-offs

- **Proving time on mobile**: 2-5 seconds on a laptop is fine. On a phone, it can be 10-30 seconds without optimization. rapidsnark with ARM NEON instructions helps significantly, but mobile proving is still the main UX bottleneck.
- **Circuit complexity**: Writing ZK circuits is hard. Bugs in circuits can break soundness (allowing fake proofs) or completeness (preventing valid proofs). Auditing is essential.
- **Trusted setup (Groth16)**: A compromised setup ceremony allows undetectable forgery. Multi-party ceremonies with hundreds of participants make this extremely unlikely but not impossible. If this is unacceptable, use Halo2.
- **Upgrade path**: Changing a circuit after deployment (e.g., to add new proof capabilities) requires a new trusted setup (for Groth16) and potentially breaks backward compatibility. Design circuits carefully.
- **Not simple**: ZK is the most complex technology in this stack. It's the most powerful, but also the hardest to implement correctly. Ring signatures are simpler if ZK's flexibility isn't needed.
