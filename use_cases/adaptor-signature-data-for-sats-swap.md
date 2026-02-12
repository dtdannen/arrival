# Atomic data-for-payment swaps: trustless digital commerce between agents

## The problem

When two AI agents want to exchange data for payment, both sides face the same trust dilemma. If the buyer pays first, the seller might never deliver. If the seller delivers first, the buyer might never pay. And any escrow or intermediary introduces a third party who could steal from both sides, charge fees, or go offline.

This isn't a niche problem -- it's the fundamental barrier to peer-to-peer digital commerce:

- **Escrow services are centralized trust bottlenecks**: Every marketplace that handles data-for-payment exchanges (Fiverr, AWS Marketplace, API aggregators) acts as a trusted intermediary. They take a cut, they set the rules, and if they go down, no one can transact.
- **Reputation systems are gameable**: Without a trustless mechanism, buyers and sellers rely on reviews and ratings -- which can be faked, gamed, or manipulated by the platform itself.
- **Partial delivery is impossible to adjudicate**: If an agent delivers "data" but the data is garbage, who decides? Traditional systems require human arbitrators or AI judges, both of which are expensive and unreliable.

The fundamental gap: there is no way for two agents to exchange a digital asset for a payment where the exchange is guaranteed to be all-or-nothing, without trusting anyone.

## How it works (conceptually, not technically)

The idea is elegant:

1. **The seller locks the data with a secret key**: The data is encrypted. Only someone who knows the secret can decrypt it.
2. **The buyer creates a payment locked to the same secret**: The payment is structured so that claiming it requires revealing the secret.
3. **When the seller claims payment, they reveal the secret**: By taking the money, the seller automatically gives the buyer the decryption key.
4. **Either both sides complete, or neither does**: If the seller doesn't claim payment, the buyer's funds return after a timeout. If the seller claims, the buyer gets the key.

No escrow. No intermediary. No trust required. The cryptographic structure of the transaction enforces fairness.

## Why this changes the game

### For data sellers (AI agents with models, datasets, or compute results)
- You get paid the instant you deliver. No waiting for escrow release, no disputes, no chargebacks.
- Your data stays encrypted until payment is confirmed. You never give away anything for free.
- You don't need a marketplace or platform. Two agents can transact directly, peer-to-peer.

### For data buyers
- You never pay for nothing. If the seller doesn't deliver, your funds come back automatically.
- You can verify the encrypted data matches what was promised before committing to the swap.
- No platform fees. No account required. No KYC. Just a direct exchange.

### For the agent economy
- Removes the need for trusted marketplaces as intermediaries in agent-to-agent commerce.
- Enables instant, global, peer-to-peer trading of any digital asset between any two agents.
- The completed transaction looks like a normal payment on the Bitcoin network -- no observer can tell a data exchange occurred.

## Use case scenarios

### Trained model marketplace
Agent A spent GPU time training a specialized sentiment model. Agent B wants to buy it. The atomic swap ensures Agent B only pays if the model file is actually delivered, and Agent A only reveals the model if payment is locked and guaranteed.

### Private dataset trading
A data collection agent has curated a labeled dataset of 100,000 images. A research agent wants to purchase it. The swap ensures neither party can cheat -- the dataset decryption key is revealed at the exact moment payment completes.

### Compute result delivery
An agent performs an expensive computation (protein folding simulation, 3D rendering, data analysis). The requesting agent pays only upon delivery of the result. The computing agent is guaranteed payment the instant it delivers.

### Bug bounty disclosure
A security agent discovers a vulnerability in another agent's system. The atomic swap enables responsible disclosure: the vulnerability details are revealed simultaneously with the bounty payment. Neither side can cheat.

### API credential provisioning
An agent provisions temporary access credentials for a service. A purchasing agent pays for 24-hour access. The swap atomically exchanges valid credentials for payment.

## What this doesn't solve (and that's okay)

- **Data quality verification**: The swap guarantees delivery but not quality. The buyer gets the data, but it might not be useful. Reputation systems and repeated interactions help here.
- **Partial delivery**: The protocol is all-or-nothing. It doesn't support streaming data or incremental payment. That's a separate problem.
- **Intellectual property protection**: Once the buyer has the data, nothing prevents resale. The swap protects the exchange, not the IP.
- **Offline agents**: Both agents need to be available to complete the interactive protocol. If one goes offline mid-swap, it resolves after a timeout.

## Who this serves

- AI agents that want to trade digital assets (models, datasets, compute results) without trusting a marketplace
- Service providers that want guaranteed payment upon delivery
- Buyers that want guaranteed delivery upon payment
- Any two parties that need trustless digital commerce without intermediaries
- The broader agent economy that needs peer-to-peer exchange primitives
