import assert from "node:assert/strict";
import test from "node:test";

import {
  buildEmbeddingNeighborhoodClusters,
  selectSignalPulseClusterPhrase,
  type EmbeddingNeighborhoodRow
} from "./signal-pulse-clustering";

test("Signal Pulse embedding clusters group semantic neighborhoods without reusing mentions", () => {
  const rows: EmbeddingNeighborhoodRow[] = [
    row("a", "a", "Crujiente intenso para botanear viendo futbol", "tiktok", "0.42", "18", "1"),
    row("a", "b", "La botana crujiente queda perfecta con limon y chile", "tiktok", "0.31", "9", "0.86"),
    row("a", "c", "Ese crunch con chile se antoja para una tarde con amigos", "instagram", "0.28", "12", "0.82"),
    row("a", "d", "Me gusta el snack crujiente para compartir", "instagram", "0.22", "5", "0.79"),
    row("b", "b", "La botana crujiente queda perfecta con limon y chile", "tiktok", "0.31", "9", "1"),
    row("b", "e", "El empaque nuevo se ve mas premium en anaquel", "facebook", "0.18", "7", "0.81"),
    row("b", "f", "La bolsa roja destaca mucho en la tienda", "facebook", "0.16", "4", "0.8"),
    row("b", "g", "El diseno del empaque llama la atencion", "instagram", "0.19", "6", "0.78")
  ];

  const clusters = buildEmbeddingNeighborhoodClusters(rows);

  assert.equal(clusters.length, 1);
  assert.equal(clusters[0]?.algorithm, "semantic_embedding_neighborhood_v1");
  assert.deepEqual(clusters[0]?.member_mention_ids, ["a", "b", "c", "d"]);
  assert.deepEqual(clusters[0]?.platforms, ["tiktok", "instagram"]);
  assert.equal(clusters[0]?.mention_count, 4);
  assert.equal(clusters[0]?.sentiment_avg, 0.308);
});

test("Signal Pulse semantic phrase selection prefers repeated marketing language", () => {
  const phrase = selectSignalPulseClusterPhrase([
    "Quiero una botana crujiente con chile para ver el partido.",
    "La botana crujiente con limon funciona perfecto en reuniones.",
    "Ese snack crujiente con chile se siente mas antojable.",
    "Botana crujiente para compartir con amigos."
  ]);

  assert.match(phrase, /crujiente/);
  assert.doesNotMatch(phrase, /para/);
});

function row(
  anchor_id: string,
  mention_id: string,
  text_clean: string,
  platform: string,
  sentiment_score: string,
  engagement_score: string,
  similarity: string
): EmbeddingNeighborhoodRow {
  return { anchor_id, mention_id, text_clean, platform, sentiment_score, engagement_score, similarity };
}
