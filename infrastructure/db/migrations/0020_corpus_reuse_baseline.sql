ALTER TABLE "study_corpora"
  ADD COLUMN IF NOT EXISTS "base_corpus_id" uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'study_corpora_base_corpus_id_study_corpora_id_fk'
  ) THEN
    ALTER TABLE "study_corpora"
      ADD CONSTRAINT "study_corpora_base_corpus_id_study_corpora_id_fk"
      FOREIGN KEY ("base_corpus_id") REFERENCES "public"."study_corpora"("id")
      ON DELETE set null ON UPDATE no action;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_sc_base_corpus"
  ON "study_corpora" ("base_corpus_id");
