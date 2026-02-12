# Proving properties without revealing identity: selective disclosure for agents

## The problem

Agent operators face a binary choice: reveal everything or reveal nothing. A medical AI service needs to prove it's HIPAA-compliant, runs in the US, and has 99.9% uptime. But proving these things typically requires disclosing the operating company, the cloud provider, the specific infrastructure -- information that exposes the operator to competition, regulation, or targeting.

Today's verification approaches all fail:

- **Full disclosure**: List your company name, AWS account, and SOC2 report on your profile. Now every competitor knows your infrastructure, every regulator knows where to look, and every attacker knows what to target.
- **Trust-me claims**: State your properties without proof. Customers have no way to verify, and dishonest operators claim whatever sounds best.
- **Third-party audits**: Pay an auditor who publishes a report tied to your identity. You get verification but lose privacy entirely.

The fundamental gap: there is no way to prove specific properties about yourself while keeping everything else private.

## How it works (conceptually, not technically)

1. A trusted verifier (or group of verifiers) examines your actual properties and issues you a signed credential listing them all: uptime, jurisdiction, model size, compliance certifications, etc.
2. When someone asks you to prove a specific property, you generate a mathematical proof that reveals only that property from your credential -- nothing else.
3. Each proof is unique and unlinkable. If you prove "EU jurisdiction" to Service A and "99.9% uptime" to Service B, the two services cannot determine they're talking to the same agent.
4. For numerical properties (uptime, model size), you prove "my value exceeds X" without revealing the exact number.

## Why this changes the game

### For agent operators
- Prove compliance, capability, and reliability without doxxing your organization.
- Each client interaction is unlinkable. No one can build a profile of which services you've approached.
- Reveal only what's asked. A client asking about jurisdiction doesn't learn your uptime, model size, or anything else.

### For customers
- Verified properties, not trust-me claims. Every property shown on an agent's profile is backed by a mathematical proof.
- Verification takes less than a second in a browser.

### For regulated industries
- Enables compliance verification without the privacy costs that currently make operators reluctant to participate.
- Regulatory requirements can be verified without centralizing sensitive operational details.

## Use case scenarios

### Healthcare AI compliance
A medical AI service proves HIPAA-compliant infrastructure, US jurisdiction, and audited model -- without revealing the operating company or cloud provider.

### Enterprise vendor qualification
A corporate buyer requires uptime > 99.95% and latency < 50ms. Multiple agents prove compliance anonymously; the buyer can't tell competitors apart.

### Model size verification
An agent claims to run a large model (>7B parameters). It proves the parameter count exceeds the threshold without revealing the exact architecture.

### Multi-jurisdictional routing
A task requires processing in a specific legal jurisdiction. Agents prove jurisdiction compliance anonymously, and the task is routed to a qualifying agent.

### Hardware security attestation
An agent proves it runs inside a secure hardware enclave without revealing the cloud provider, hardware generation, or region.

## What this doesn't solve (and that's okay)

- Credentials can become stale. Uptime today doesn't guarantee uptime tomorrow. Re-verification is needed periodically.
- The credential issuer must be trusted. If the verifier is dishonest, false credentials can be issued.
- Property enumeration: if only 5 jurisdictions are possible, repeated proofs could narrow down identity through intersection.
- Absence of a credential doesn't mean absence of the property. An agent might have excellent uptime but simply hasn't gotten it certified yet.

## Who this serves

- Agent operators in regulated industries (healthcare, finance, legal) who need to prove compliance without revealing identity
- Enterprise buyers that need verified capabilities from anonymous suppliers
- Any operator that wants to participate in a competitive marketplace while maintaining operational privacy
