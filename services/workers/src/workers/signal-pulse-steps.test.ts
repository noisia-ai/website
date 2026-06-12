import assert from "node:assert/strict";
import test from "node:test";

import {
  buildEmbeddingNeighborhoodClusters,
  selectSignalPulseClusterPhrase,
  type EmbeddingNeighborhoodRow
} from "./signal-pulse-clustering";
import { buildSignalPulseDeterministicRead, buildSignalPulseMarketingMove } from "./signal-pulse-copy";

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

test("Signal Pulse deterministic copy sounds like a marketing read, not a placeholder", () => {
  const copy = buildSignalPulseDeterministicRead({
    canonicalTitle: "Territorio botana crujiente con chile",
    term: "botana crujiente con chile",
    signalType: "opportunity",
    mentionCount: 64,
    sentimentAvg: 0.31,
    platforms: ["tiktok", "instagram"],
    rank: 1
  });

  assert.equal(copy.title, "Oportunidad: Botana Crujiente Con Chile");
  assert.match(copy.description, /64 menciones/);
  assert.match(copy.marketingRead, /angulo creativo/);
  assert.match(copy.actionHint, /claim o hook/);
  assert.doesNotMatch(copy.description, /La conversacion esta agrupando/i);
  assert.doesNotMatch(copy.marketingRead, /Probar contenido o pauta alrededor/i);
});

test("Signal Pulse deterministic copy changes posture for risks and weak signals", () => {
  const risk = buildSignalPulseDeterministicRead({
    canonicalTitle: "Territorio empaque roto",
    term: "empaque roto",
    signalType: "risk",
    mentionCount: 18,
    sentimentAvg: -0.34,
    platforms: ["facebook"],
    rank: 2
  });
  const directional = buildSignalPulseDeterministicRead({
    canonicalTitle: "Territorio merch especial",
    term: "merch especial",
    signalType: "marketing_signal",
    mentionCount: 6,
    sentimentAvg: 0.02,
    platforms: [],
    rank: 5
  });

  assert.equal(risk.title, "Friccion: Empaque Roto");
  assert.match(risk.marketingRead, /contener/);
  assert.match(risk.actionHint, /reduzca duda/);
  assert.equal(directional.title, "Merch Especial");
  assert.match(directional.description, /apenas alcanzan para monitoreo/);
  assert.match(directional.actionHint, /prueba de bajo costo/);
});

test("Signal Pulse marketing moves reuse the signal action hint and define measurement", () => {
  const move = buildSignalPulseMarketingMove({
    title: "Oportunidad: Botana Crujiente Con Chile",
    moveType: "amplify",
    lifecycle: "rising",
    confidence: "alta",
    impact: 72,
    volume: 96,
    marketingRead: "La senal trae energia positiva suficiente para probarla como angulo creativo.",
    actionHint: "Testear botana crujiente con chile como hook principal en una celda pequena de pauta"
  });

  assert.match(move.actionText, /Testear botana crujiente con chile/);
  assert.match(move.actionText, /distribucion controlada/);
  assert.equal(move.ownerSuggestion, "Paid media + Brand");
  assert.equal(move.timing, "este mes");
  assert.match(move.measurementSuggestion, /CTR/);
  assert.equal(move.noGoNotes, null);
  assert.doesNotMatch(move.actionText, /Amplificar .* en pauta y comparar contra el territorio actual/);
});

test("Signal Pulse marketing moves keep weak signals as bounded experiments", () => {
  const move = buildSignalPulseMarketingMove({
    title: "Merch Especial",
    moveType: "create_content",
    lifecycle: "stable",
    confidence: "baja",
    impact: 28,
    volume: 7,
    marketingRead: "",
    actionHint: ""
  });

  assert.match(move.actionText, /Bajarlo a una serie corta de contenido/);
  assert.equal(move.ownerSuggestion, "Social + Content");
  assert.equal(move.timing, "siguiente sprint");
  assert.match(move.measurementSuggestion, /7 menciones/);
  assert.match(move.noGoNotes ?? "", /No convertirlo en promesa fuerte/);
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
