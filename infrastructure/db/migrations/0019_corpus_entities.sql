CREATE TABLE IF NOT EXISTS "corpus_entities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "study_corpus_id" uuid NOT NULL,
  "competitor_id" uuid,
  "entity_kind" text NOT NULL,
  "name" text NOT NULL,
  "aliases" text[] DEFAULT ARRAY[]::text[],
  "handles" text[] DEFAULT ARRAY[]::text[],
  "query_seeds" text[] DEFAULT ARRAY[]::text[],
  "notes" text,
  "is_category_baseline" boolean DEFAULT false,
  "priority" integer,
  "status" text DEFAULT 'active' NOT NULL,
  "created_by_user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'corpus_entities_study_corpus_id_study_corpora_id_fk'
  ) THEN
    ALTER TABLE "corpus_entities"
      ADD CONSTRAINT "corpus_entities_study_corpus_id_study_corpora_id_fk"
      FOREIGN KEY ("study_corpus_id") REFERENCES "public"."study_corpora"("id")
      ON DELETE cascade ON UPDATE no action;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'corpus_entities_competitor_id_competitors_id_fk'
  ) THEN
    ALTER TABLE "corpus_entities"
      ADD CONSTRAINT "corpus_entities_competitor_id_competitors_id_fk"
      FOREIGN KEY ("competitor_id") REFERENCES "public"."competitors"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'corpus_entities_created_by_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "corpus_entities"
      ADD CONSTRAINT "corpus_entities_created_by_user_id_users_id_fk"
      FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;

ALTER TABLE "import_batches"
  ADD COLUMN IF NOT EXISTS "corpus_entity_id" uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'import_batches_corpus_entity_id_corpus_entities_id_fk'
  ) THEN
    ALTER TABLE "import_batches"
      ADD CONSTRAINT "import_batches_corpus_entity_id_corpus_entities_id_fk"
      FOREIGN KEY ("corpus_entity_id") REFERENCES "public"."corpus_entities"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_corpus_entities_corpus"
  ON "corpus_entities" ("study_corpus_id");

CREATE INDEX IF NOT EXISTS "idx_corpus_entities_kind"
  ON "corpus_entities" ("study_corpus_id", "entity_kind");

CREATE INDEX IF NOT EXISTS "idx_corpus_entities_competitor"
  ON "corpus_entities" ("competitor_id");

CREATE INDEX IF NOT EXISTS "idx_import_batches_corpus_entity"
  ON "import_batches" ("study_corpus_id", "corpus_entity_id");
