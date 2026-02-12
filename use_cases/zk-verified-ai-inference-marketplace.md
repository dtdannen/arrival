# Project 5: ZK-Verified AI Inference Marketplace

**Complexity:** Medium — 11 hours

## Overview

An agent runs a sentiment classifier on private input data, generates a ZK proof that inference was correct, and gets paid via Cashu only if the proof verifies.

## ZK Primitive

EZKL (ONNX → Halo2 zkSNARK). The agent compiles a PyTorch model into a ZK circuit, runs inference producing both the output and a cryptographic proof. The proof demonstrates "model M with committed weights produced output Y on input X" without revealing the weights.

## Libraries

- `ezkl` (Python/Rust/JS)
- PyTorch for model training
- Cashu CDK or `cashu-ts` for payment escrow

## Agent Use Case

A client agent needs sentiment analysis but doesn't trust the service agent's claimed model. The service agent generates a zkSNARK proof alongside the inference result. The client verifies the proof (instant, ~10ms) before releasing Cashu payment.

## Bitcoin Integration

Cashu ecash for conditional payment (released upon proof verification), backed by Lightning.

## Build Breakdown

| Phase | Time |
|-------|------|
| Train small classifier in PyTorch, export ONNX | 2h |
| EZKL circuit compilation and trusted setup | 2h |
| Proof generation pipeline | 2h |
| Cashu conditional payment integration | 3h |
| Demo API endpoint | 2h |

## What Makes It Unique

First verifiable AI inference marketplace with cryptographic guarantees and privacy-preserving payments — the agent proves its work is correct without revealing its model, and gets paid without either party revealing identity.

## Demo

Client submits text, service agent returns sentiment + ZK proof, client verifies proof in-browser, Cashu payment auto-releases upon verification.
