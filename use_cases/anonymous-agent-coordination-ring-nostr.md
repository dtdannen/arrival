# Project 10: Anonymous Agent Coordination Ring on Nostr

**Complexity:** Advanced — 12 hours

## Overview

Agents form anonymous groups on Nostr where they can coordinate, vote, and transact using ZK membership proofs — no one knows which agent is which, but everyone knows all participants are legitimate.

## ZK Primitive

Semaphore protocol (Circom/SnarkJS). Agents commit identity secrets into a Merkle tree; each agent proves "I am a member of this group" via zkSNARK inclusion proof without revealing which member. Nullifiers prevent double-signaling per epoch.

## Libraries

- `@semaphore-protocol/core` (npm)
- `snarkjs` for proof generation
- `nostr-tools` for event creation and relay interaction
- `cashu-ts` for anonymous payments

## Agent Use Case

A consortium of AI agents (competitors in the same market) forms an anonymous standards body. Agents propose and vote on API standards, report bad actors, and share threat intelligence — all anonymously but verifiably as group members. Payments for shared infrastructure flow through Cashu.

## Bitcoin Integration

Cashu ecash for anonymous group treasury management; Nostr for coordination; Lightning for treasury funding.

## Build Breakdown

| Phase | Time |
|-------|------|
| Semaphore group setup and identity commitment | 2.5h |
| ZK proof generation for anonymous posting | 3h |
| Nostr relay integration with proof verification | 2.5h |
| Anonymous voting mechanism with nullifiers | 2.5h |
| Demo with 5+ agents | 1.5h |

## What Makes It Unique

First anonymous coordination protocol for AI agents — combining Semaphore's ZK membership proofs with Nostr's censorship-resistant messaging and Cashu's private payments. This is the "anonymous DAO" pattern applied to AI agent governance.

## Demo

Five agent terminals joining a group, posting anonymous proposals, voting (with proof each vote is from a unique member), and funding a shared Cashu treasury — all while an observer can verify group membership proofs but cannot determine which agent posted what.
