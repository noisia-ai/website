-- The corpus dashboard / engine summary runs:
--   SELECT count(*), sum(... inclusion_status = 'included' ...), ...
--   FROM mentions WHERE study_corpus_id = $1
-- With only the (study_corpus_id, text_hash) index, Postgres had to heap-fetch
-- every matching row to read inclusion_status. mentions rows are wide (text_raw
-- + raw_metadata jsonb), so on large corpora this took seconds and timed out
-- under load — taking down both local and production (shared DB).
-- A composite index on (study_corpus_id, inclusion_status) lets the aggregate be
-- served by an index-only scan (~125ms vs ~4.7s for 60k rows).
CREATE INDEX IF NOT EXISTS idx_mentions_corpus_inclusion
  ON mentions (study_corpus_id, inclusion_status);
