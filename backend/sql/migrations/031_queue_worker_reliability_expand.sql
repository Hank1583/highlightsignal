-- V11-02: MySQL Queue Worker Reliability -- expand phase on the EXISTING,
-- already-live `queue_jobs` table (migrations/010). No application code has
-- ever written to this table (grep confirms zero call sites before this
-- task) -- but it may already have rows if any manual/experimental insert
-- happened on the real host, so this follows the same nullable/opt-in
-- expand discipline as every other live-table migration, not the
-- brand-new-table convention.
--
--   * `idempotency_key`: opt-in per-workspace dedup for ENQUEUEING --
--     mirrors `decisions.idempotency_key`'s design exactly (MySQL treats
--     every NULL as distinct in a unique index, so a caller that doesn't
--     supply one is unaffected; a caller that does gets a real
--     duplicate-enqueue guard, e.g. a retried HTTP request that already
--     successfully enqueued a job returns the existing job instead of
--     enqueueing a second one).
--   * `handler_version`: which version of the job_type's handler produced/
--     expects this payload shape -- lets a future handler rewrite detect
--     and reject (or migrate) an old-shape payload instead of guessing.
--
-- Everything else this task needs (status/priority/scheduled_at for
-- backoff scheduling/locked_at+locked_by for claim+stuck-detection/
-- attempts+max_attempts+last_error for retry+dead-letter) already exists in
-- migrations/010 -- this expand is intentionally small.

ALTER TABLE queue_jobs
  ADD COLUMN idempotency_key VARCHAR(191) NULL AFTER job_type,
  ADD COLUMN handler_version VARCHAR(50) NULL AFTER payload_TEXT,
  ADD UNIQUE KEY uk_queue_jobs_workspace_idempotency (workspace_id, idempotency_key);
