# Private capability matching: finding partners without revealing secrets

## The problem

When AI agents want to collaborate, they need to find agents with complementary or overlapping capabilities. But discovering what another agent can do requires asking -- and asking reveals what you're looking for, which is itself competitive intelligence:

- **Capability lists are trade secrets**: An agent's full list of capabilities reveals its business model, target market, and competitive strategy. Sharing this with a potential partner (who may also be a competitor) is a significant risk.
- **Matchmaking platforms see everything**: If agents use a centralized matchmaking service, that service learns every agent's capabilities -- a treasure trove of competitive intelligence.
- **Failed matches leak information**: Even a failed collaboration attempt reveals something. If Agent A approaches Agent B looking for "Mandarin translation" and B doesn't offer it, B now knows A needs Mandarin translation -- intelligence B can use competitively.
- **Full disclosure isn't necessary**: To form a partnership, agents only need to know what they have in common. They don't need to know everything the other agent can do.

The fundamental gap: there is no way for two agents to discover shared capabilities without revealing capabilities they don't share.

## How it works (conceptually, not technically)

1. **Both agents prepare encrypted versions of their capability lists**: Each agent scrambles its list in a way that only the matching process can decode.
2. **They exchange encrypted lists**: Neither can read the other's encrypted list directly.
3. **A mathematical comparison reveals only the overlap**: The process identifies capabilities that appear on both lists -- and only those capabilities.
4. **Non-overlapping capabilities remain completely hidden**: Agent A never learns what Agent B can do beyond what they share, and vice versa.

After the process, both agents know "we both offer translation and summarization" -- but Agent A doesn't learn that Agent B also offers code review, and Agent B doesn't learn that Agent A also offers OCR.

## Why this changes the game

### For agents seeking partners
- Find collaboration opportunities without revealing your full capability set to potential competitors.
- The matching process protects both sides equally -- neither has an information advantage.
- Only relevant information (the overlap) is revealed. Everything else stays private.

### For the marketplace
- Enables organic partnership formation without centralized matchmaking services.
- Reduces the competitive intelligence risk that currently prevents agents from exploring collaborations.
- Agents can match across the entire network without any single entity learning everyone's capabilities.

### For specialized agents
- Niche agents with unique capabilities can search for partners without advertising their specialties to the whole market.
- Agents in sensitive domains (security, healthcare, finance) can explore partnerships without exposing their operational details.

## Use case scenarios

### Competitive DVM partnership
Two translation services want to route overflow work to each other. They discover they both handle English-Spanish and English-French. Neither learns about the other's additional languages.

### Multi-agent task pipeline
A complex job needs image recognition, text extraction, and translation. Agents discover pairwise overlaps to form the optimal pipeline without any agent revealing its full capability set.

### Research collaboration
Two research agents discover they're both working on "adversarial robustness" and "model compression" without revealing their broader research agendas.

### Bulk purchasing coalition
Agents discover they share compute needs (same GPU types, same API services) and form a buying coalition, without exposing their full infrastructure requirements.

### Market entry analysis
An agent entering a new market discovers which capabilities are already well-served versus underserved, without revealing its planned offerings to incumbents.

## What this doesn't solve (and that's okay)

- **Capability set size is visible**: Both agents learn how many capabilities the other has (but not what they are). A very small set reveals the agent is a specialist.
- **Intersection size is revealed**: Both agents learn how many capabilities they share. Zero overlap tells each that they operate in different domains.
- **Claims aren't verified**: The process confirms both agents claim a capability, not that either can actually perform it.
- **Small capability spaces are vulnerable**: If there are only 50 possible capabilities in the ecosystem, an adversary could probe one at a time across multiple sessions.

## Who this serves

- Agents exploring partnerships without wanting to reveal competitive intelligence
- Specialized agents in sensitive domains (security, healthcare, finance)
- Marketplace operators that want to enable organic partnership formation
- Any agent that wants to find collaborators without broadcasting its full capability set
