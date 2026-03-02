-- Arrival MVP schema
-- Sources: 02-architecture.md (Storage Model), 12-receipt-spec.md (Issuer Registry)

-- 1. roots — cohort Merkle tree metadata
-- One row per (subject_id, distance_bucket) per validity period
CREATE TABLE IF NOT EXISTS roots (
  root_id          TEXT PRIMARY KEY,
  subject_id       TEXT NOT NULL,
  root_hash        TEXT NOT NULL,
  k_size           INTEGER NOT NULL,
  distance_bucket  INTEGER NOT NULL,
  graph_snapshot_hash TEXT NOT NULL,
  valid_from       BIGINT NOT NULL,
  valid_to         BIGINT NOT NULL,
  created_at       BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT)
);

CREATE INDEX IF NOT EXISTS idx_roots_subject_active
  ON roots (subject_id, root_hash)
  WHERE valid_to > EXTRACT(EPOCH FROM NOW());

-- 2. reviews — admitted and published reviews
-- status: 'admitted' (held, not visible) or 'published' (batch-released, visible)
-- created_at is internal only — never exposed in API responses
CREATE TABLE IF NOT EXISTS reviews (
  review_id        TEXT PRIMARY KEY,
  subject_id       TEXT NOT NULL,
  epoch_id         TEXT NOT NULL,
  content_ref      TEXT NOT NULL,
  proof_ref        TEXT NOT NULL,
  distance_bucket  INTEGER NOT NULL,
  status           TEXT NOT NULL DEFAULT 'admitted' CHECK (status IN ('admitted', 'published')),
  time_window_id   TEXT NOT NULL,
  created_at       BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT)
);

CREATE INDEX IF NOT EXISTS idx_reviews_subject_status
  ON reviews (subject_id, status);

CREATE INDEX IF NOT EXISTS idx_reviews_window
  ON reviews (time_window_id, status);

-- 3. nullifiers — one review per subject per epoch
CREATE TABLE IF NOT EXISTS nullifiers (
  subject_id       TEXT NOT NULL,
  epoch_id         TEXT NOT NULL,
  nullifier_hash   TEXT NOT NULL,
  first_seen_at    BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
  PRIMARY KEY (subject_id, epoch_id, nullifier_hash)
);

-- 4. spent_receipts — one receipt per review enforcement
-- receipt_hash = Hash(r) from interaction receipt
CREATE TABLE IF NOT EXISTS spent_receipts (
  receipt_hash     TEXT PRIMARY KEY,
  first_seen_at    BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT)
);

-- 5. issuer_registry — accepted issuers and their keysets
-- Admin-managed for MVP (per 12-receipt-spec.md Issuer Registry Governance)
CREATE TABLE IF NOT EXISTS issuer_registry (
  keyset_id        TEXT PRIMARY KEY,
  subject_id       TEXT NOT NULL,
  issuer_id        TEXT NOT NULL,
  public_key       TEXT NOT NULL,
  keyset_start     BIGINT NOT NULL,
  keyset_end       BIGINT NOT NULL,
  created_at       BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT)
);

CREATE INDEX IF NOT EXISTS idx_issuer_registry_subject
  ON issuer_registry (subject_id, keyset_start, keyset_end);
