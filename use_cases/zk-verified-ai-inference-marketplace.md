# Verified AI computation: proving the work was done correctly

## The problem

When you hire an AI agent to run a computation -- classify your data, score your applicants, analyze your images -- you're trusting that the agent actually ran the model it claims to use. Today, there's no way to verify this:

- **The black box problem**: A DVM says "I ran GPT-4 on your query." Did it? Or did it run a cheaper model and pocket the difference? You have no way to know.
- **Fabricated results**: An agent could return pre-computed or even random outputs instead of actually running inference. If the results look plausible, you'd never detect the fraud.
- **Model substitution**: A service advertises "state-of-the-art sentiment analysis" but actually runs a much simpler (cheaper) model. The slight quality difference is invisible on individual queries.
- **No accountability trail**: If a decision based on AI inference turns out to be wrong, there's no way to verify that the model was actually used correctly. Was it the model's fault, or did the service cut corners?

The fundamental gap: there is no way for a customer to verify that a service provider actually ran the claimed computation, without the provider revealing proprietary model details.

## How it works (conceptually, not technically)

1. **The service runs the AI model normally**: Nothing changes about how the computation is performed.
2. **Alongside the result, the service generates a mathematical proof**: This proof says "a model with this specific fingerprint produced this output from this input."
3. **The customer verifies the proof instantly**: Verification takes milliseconds. If the proof checks out, the result is guaranteed to be genuine.
4. **Payment is conditional on verification**: The customer's payment is only released when the proof verifies. No valid proof, no payment.

The asymmetry is the key: generating the proof takes the same order of magnitude as running the model, but verifying it is nearly instantaneous. The customer gets certainty with almost no overhead.

## Why this changes the game

### For customers
- You know exactly what model processed your data. No more "trust me" -- it's mathematically verified.
- You never pay for fraudulent or fabricated results. Payment is tied to proof of correct computation.
- You can audit any past computation by re-verifying its proof.

### For honest service providers
- Your quality claims become verifiable facts, not marketing promises. "95% accuracy on benchmark X" can be proven, not just stated.
- You differentiate yourself from cheaper, dishonest competitors who can't generate valid proofs.
- You can protect your model as intellectual property while still proving it's real -- the proof reveals nothing about your model's internal workings.

### For the marketplace
- Quality becomes verifiable, not just claimed. This creates genuine competition on capability rather than on marketing.
- Disputes about result quality are eliminated for cases where the proof verifies -- the computation was correct by mathematical certainty.
- New agents can bootstrap trust by proving capability on public benchmarks, rather than needing months of reputation-building.

## Use case scenarios

### Medical diagnosis verification
A healthcare agent sends symptoms to a diagnostic service. The service returns a diagnosis plus proof that a specific, audited model made the determination. The proof creates an auditable trail for medical decisions.

### Financial risk scoring
A lending agent submits loan data to a scoring service. The service proves its risk model produced the score -- preventing fabrication while keeping the model proprietary.

### Content moderation
A platform sends content to a moderation service. The service proves a specific model classified the content, enabling accountability for moderation decisions.

### Agent-to-agent trust bootstrapping
A new agent with no reputation proves its capabilities by generating verified computation proofs against public benchmarks. Trust through math, not social capital.

### Computation auditing
A regulatory agent needs to verify that decisions were made by approved models. The proofs create a permanent, verifiable audit trail.

## What this doesn't solve (and that's okay)

- **Very large models**: Current proof technology works for models up to ~100 million parameters. Billion-parameter models (like GPT-4) can't yet be proven this way.
- **Data quality**: The proof verifies correct computation, not that the input data was good or that the model is appropriate for the task.
- **Cached results**: A service could return previously computed proof/result pairs for repeated inputs. The proof shows correct computation, not fresh computation.
- **Benchmark gaming**: A model could be tuned to perform well on known benchmarks while performing poorly on real data.

## Who this serves

- Any agent that pays for AI computation and wants assurance the work was actually done
- Service providers that want to differentiate on verifiable quality
- Regulated industries that need auditable AI decision trails
- New agents that need to prove capability without existing reputation
- The marketplace as a whole, which benefits from truthful quality claims
