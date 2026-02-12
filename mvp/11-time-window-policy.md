# Time-Window Privacy Policy

## Purpose

This document specifies the time-window proof system: what it proves, how windows are calculated, and the policy rules that protect reviewer timing anonymity.

The time-window proof is separate from WoT cohort membership anonymity (`k_min`). Cohort anonymity protects against the question "which WoT member wrote this?" Time-window anonymity protects against the question "which of the people who interacted during this period wrote this?" These are independent anonymity dimensions with independent thresholds.

## Threat Model

The primary attacker for time-window privacy is the **reviewed subject** (seller, service provider). This attacker:

1. Knows who interacted with them and when (order records, payment logs, appointment history)
2. Wants to identify who left a negative review (retaliation motive)
3. Correlates review publication timing with their interaction records

WoT cohort size does not protect against this attacker. Even with `k_min=50` in the cohort, if the attacker knows only 3 people bought their product this week, the time window narrows identification to those 3 regardless of cohort size.

## Circuit Design

The time-window proof is a custom Circom circuit using `circomlib/comparators.circom` primitives.

### Proof Statement

"My interaction timestamp `t` falls within the bounds of the declared time window `[window_start, window_end]`."

### Circuit

```
LessEqThan(32): window_start <= t
LessEqThan(32): t <= window_end
```

Uses two `LessEqThan(32)` comparators from circomlib. Each comparator uses `Num2Bits(33)` internally.

### Constraint Cost

- `Num2Bits(33)`: 34 constraints (33 bit-checks + 1 reconstruction) per comparator
- Total: ~68 constraints for the range proof
- Negligible relative to Semaphore's membership circuit

### Public Inputs

1. `time_window_id` (identifies the window period)
2. `window_start` (unix timestamp, beginning of window)
3. `window_end` (unix timestamp, end of window)

### Private Inputs (Witness)

1. `interaction_timestamp` (unix timestamp from the interaction receipt)

### Timestamp Source

The private timestamp `t` must come from the interaction receipt, not be client-asserted. The receipt issuer embeds the issuance timestamp at the time of the interaction (purchase, service completion, etc.). The circuit proves this receipt-embedded timestamp falls within the declared window.

If the timestamp were client-asserted, the proof would only show "the user chose a valid window," which is trivially satisfiable and proves nothing about when the interaction actually occurred.

## Adaptive Window Calculation

Time windows are **system-calculated and uniform per subject**. All reviewers for a given subject in a given period use the same window. Per-reviewer window variation is not allowed because:

1. The `time_window_id` is a public proof input; varying windows across reviewers leaks information about each reviewer's perception of the subject's volume
2. Different window sizes fragment the anonymity set (10 reviewers split across 3 window sizes = three smaller sets instead of one large set)

### Window Size Rules

The system determines window size based on interaction receipt volume for each subject:

| Receipt volume (rolling period) | Window size |
|---------------------------------|-------------|
| 100+ receipts/week              | Weekly      |
| 20-99 receipts/week             | Biweekly    |
| 20+ receipts/month              | Monthly     |
| < 20 receipts/month             | Quarterly, or suppress with warning |

Window size is published as part of the cohort root metadata and remains fixed for the duration of each window period.

### `t_min` Threshold

Analogous to `k_min` for cohort membership, `t_min` defines the minimum number of interaction receipts that must exist for a `(subject_id, time_window)` before any reviews in that window become publishable.

Default: `t_min = 20`

If a window has fewer than `t_min` receipts issued, reviews are held until either:

1. The threshold is met (more interactions accumulate)
2. The window is merged into a longer window that meets the threshold

`t_min` is enforced server-side. The receipt volume used for enforcement is the count of receipts issued (interactions that occurred), not the count of reviews submitted. This is important because a subject could have many interactions but few reviews, and the anonymity set is based on interactions, not reviews.

## Batch Release Policy

Reviews are never published individually. All reviews for a `(subject_id, time_window)` are published simultaneously as a batch at the end of the window period, in randomized order.

This prevents an attacker from correlating review submission time with publication time. Even if an attacker observes when a review was submitted to the gateway, the publication delay and batching break that correlation.

### Batch release rules

1. Hold all admitted reviews until the time window closes
2. Verify `t_min` is met before releasing the batch
3. Randomize review ordering within the batch
4. All reviews in a batch share the same `time_window_id` (public)
5. No exact `created_at` timestamp is exposed in published reviews; only the `time_window_id`

## API Surface

### Cohort Root Endpoint (updated)

```
GET /v1/subjects/{subject_id}/cohort-root

Returns:
  cohort_root_hash    (string)
  cohort_size         (int, from server-side roots table)
  time_window_id      (string, current active window)
  time_window_policy  (string, e.g. "weekly" | "biweekly" | "monthly" | "quarterly")
  window_start        (unix timestamp)
  window_end          (unix timestamp)
  receipt_volume_bucket (string, "low" | "medium" | "high")
  k_min               (int)
  t_min               (int)
```

`receipt_volume_bucket` is deliberately coarse to avoid leaking exact sales data for the subject. Mapping:

- `low`: < 20 receipts in current window
- `medium`: 20-99
- `high`: 100+

### Pre-Submission Disclosure

Before generating a proof, the client must display to the reviewer:

1. The current time window size for this subject
2. The approximate anonymity set size (from `receipt_volume_bucket`)
3. Whether `t_min` is currently met (if not, the review will be held)
4. A clear statement: "Your review will be published in a batch with other reviews at the end of this window period"

The reviewer can choose not to proceed if the anonymity set is too small for their comfort.

## Interaction With Other Spec Components

### Relationship to `epoch_id`

Whether `time_window_id` and `epoch_id` are the same or independent is an open design decision (see `INCONSISTENCIES.md` issue 8). If unified, the nullifier scope and time-window scope are identical, which is simpler but means changing window size also changes when users can re-review. If independent, the interaction must be defined.

### Relationship to `k_min`

`k_min` and `t_min` are independent thresholds that must both be met before publication:

- `k_min`: minimum WoT cohort size (membership anonymity)
- `t_min`: minimum interaction receipt count per window (timing anonymity)

A review is publishable only when `k >= k_min` AND `t >= t_min`.

### Relationship to Receipt Design

The receipt must embed an issuance timestamp for this circuit to work. The blind-signed receipt system uses keyset rotation for temporal binding: the keyset used to sign a receipt encodes the time period of the interaction. The reviewer uses a timestamp within the keyset's validity period as the private witness. See `12-receipt-spec.md` for the full receipt lifecycle and temporal binding flow.

## Test Requirements

1. Valid timestamp within window: proof accepted
2. Timestamp before `window_start`: proof rejected
3. Timestamp after `window_end`: proof rejected
4. Window with fewer than `t_min` receipts: review held, not published
5. Batch release contains all reviews for window, in non-submission order
6. Published reviews do not contain exact `created_at` timestamps
7. `receipt_volume_bucket` does not leak exact receipt counts
8. All reviewers for a subject in a period use the same `time_window_id`
