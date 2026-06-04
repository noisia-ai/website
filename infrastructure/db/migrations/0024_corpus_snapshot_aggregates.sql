-- Cache snapshot-level dashboard aggregates so Studio does not need to
-- repeatedly group 100K+ mention snapshots through the Supabase pooler.
CREATE TABLE IF NOT EXISTS "corpus_snapshot_aggregates" (
  "snapshot_id" uuid PRIMARY KEY REFERENCES "corpus_snapshots"("id") ON DELETE CASCADE,
  "study_corpus_id" uuid NOT NULL REFERENCES "study_corpora"("id") ON DELETE CASCADE,
  "total_mentions" integer NOT NULL DEFAULT 0,
  "window_start" timestamp with time zone,
  "window_end" timestamp with time zone,
  "platform_distribution" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "content_type_distribution" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "volume_timeline" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "refreshed_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_snapshot_aggregates_corpus"
  ON "corpus_snapshot_aggregates"("study_corpus_id");
