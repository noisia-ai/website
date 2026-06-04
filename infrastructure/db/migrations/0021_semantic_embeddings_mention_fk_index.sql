-- The only index covering semantic_embeddings.mention_id was the PARTIAL unique
-- index uq_semantic_embedding_mention_chunk (WHERE scope_type = 'mention'), which
-- Postgres cannot use for the FK ON DELETE CASCADE generated query
-- (DELETE FROM semantic_embeddings WHERE mention_id = $1) because that query does
-- not filter scope_type. As a result, deleting mentions seq-scanned the whole
-- semantic_embeddings table per row, making corpus cleanup / large re-imports
-- effectively hang. A plain btree index on mention_id fixes cascade performance.
CREATE INDEX IF NOT EXISTS idx_semantic_embeddings_mention_id_all
  ON semantic_embeddings (mention_id);
