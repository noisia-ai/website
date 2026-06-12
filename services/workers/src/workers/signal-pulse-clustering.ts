export type TermCluster = {
  term: string;
  mention_count: number;
  platforms: string[];
  sample_mention_ids: string[];
  member_mention_ids: string[];
  sentiment_avg: number | null;
  engagement_sum: number;
  algorithm: "semantic_embedding_neighborhood_v1" | "term_cluster_v2";
};

export type EmbeddingNeighborhoodRow = {
  anchor_id: string;
  mention_id: string;
  text_clean: string;
  platform: string | null;
  sentiment_score: string | null;
  engagement_score: string | null;
  similarity: string | null;
};

const STOPWORDS_ES_MX = new Set([
  "para", "pero", "como", "con", "que", "por", "una", "uno", "los", "las", "del", "este", "esta",
  "esto", "muy", "mas", "menos", "porque", "cuando", "todo", "toda", "todos", "todas", "solo", "bien",
  "mal", "sin", "hay", "son", "soy", "fue", "ser", "mis", "sus", "me", "mi", "ya", "no", "si",
  "tambien", "marca", "producto", "personas", "gente", "hacer", "dice", "dicen", "video", "comentario"
]);

export function buildEmbeddingNeighborhoodClusters(rows: EmbeddingNeighborhoodRow[]): TermCluster[] {
  const byAnchor = new Map<string, EmbeddingNeighborhoodRow[]>();
  for (const row of rows) {
    if (!row.anchor_id || !row.mention_id || !row.text_clean) continue;
    const current = byAnchor.get(row.anchor_id) ?? [];
    current.push(row);
    byAnchor.set(row.anchor_id, current);
  }

  const assigned = new Set<string>();
  const clusters: TermCluster[] = [];
  for (const [anchorId, group] of byAnchor.entries()) {
    if (assigned.has(anchorId)) continue;
    const members = group
      .slice()
      .sort((a, b) => Number(b.similarity ?? 0) - Number(a.similarity ?? 0))
      .filter((row) => !assigned.has(row.mention_id));
    if (members.length < 4) continue;

    members.forEach((row) => assigned.add(row.mention_id));
    const term = selectSignalPulseClusterPhrase(members.map((row) => row.text_clean));
    const sentiments = members.map((row) => numberOrNull(row.sentiment_score)).filter((value): value is number => value !== null);
    clusters.push({
      term,
      mention_count: members.length,
      platforms: Array.from(new Set(members.map((row) => row.platform).filter(Boolean) as string[])).slice(0, 8),
      member_mention_ids: members.map((row) => row.mention_id),
      sample_mention_ids: members
        .slice()
        .sort((a, b) => Number(b.engagement_score ?? 0) - Number(a.engagement_score ?? 0))
        .map((row) => row.mention_id)
        .slice(0, 12),
      sentiment_avg: sentiments.length > 0 ? round(sentiments.reduce((sum, item) => sum + item, 0) / sentiments.length, 3) : null,
      engagement_sum: members.reduce((sum, row) => sum + Number(row.engagement_score ?? 0), 0),
      algorithm: "semantic_embedding_neighborhood_v1"
    });
  }

  return clusters
    .sort((a, b) => b.mention_count - a.mention_count || b.engagement_sum - a.engagement_sum || a.term.localeCompare(b.term))
    .slice(0, 120);
}

export function selectSignalPulseClusterPhrase(texts: string[]) {
  const scores = new Map<string, number>();
  for (const text of texts) {
    const tokens = tokenize(text).slice(0, 42);
    const seen = new Set<string>();
    for (let i = 0; i < tokens.length; i += 1) {
      const unigram = tokens[i];
      if (unigram) seen.add(unigram);
      const bigram = tokens[i + 1] ? `${tokens[i]} ${tokens[i + 1]}` : "";
      if (bigram && !tooGenericPhrase(bigram)) seen.add(bigram);
      const trigram = tokens[i + 2] ? `${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}` : "";
      if (trigram && !tooGenericPhrase(trigram)) seen.add(trigram);
    }
    for (const phrase of seen) {
      const words = phrase.split(" ").length;
      scores.set(phrase, (scores.get(phrase) ?? 0) + words);
    }
  }
  const [best] = Array.from(scores.entries())
    .filter(([phrase, score]) => score >= 2 && phrase.length <= 46)
    .sort((a, b) => b[1] - a[1] || b[0].split(" ").length - a[0].split(" ").length || a[0].localeCompare(b[0]))[0] ?? [];
  return best ?? "senal de conversacion";
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 4 && !STOPWORDS_ES_MX.has(term));
}

function tooGenericPhrase(phrase: string) {
  const words = phrase.split(" ");
  return words.every((word) => STOPWORDS_ES_MX.has(word) || word.length < 5);
}

function numberOrNull(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
