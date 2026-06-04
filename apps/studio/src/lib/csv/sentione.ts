import crypto from "node:crypto";

import { mentions } from "@noisia/db";
import { db } from "@/lib/db";

type CsvRow = Record<string, string>;

type NormalizedMention = {
  externalId: string;
  textRaw: string;
  textClean: string;
  textSnippet: string;
  title: string | null;
  textLength: number;
  language: string | null;
  publishedAt: Date;
  platform: string;
  contentType: string | null;
  url: string | null;
  country: string | null;
  engagement: Record<string, number>;
  sentimentSource: string | null;
  sentimentScore: string | null;
  inclusionStatus: "included" | "excluded";
  exclusionReason: string | null;
  qualityFlags: Record<string, boolean>;
  rawMetadata: Record<string, unknown>;
  textHash: string;
};

export type CsvImportStats = {
  record_count: number;
  included_count: number;
  excluded_count: number;
  duplicate_count: number;
};

const textKeys = ["text", "content", "body", "mention", "snippet", "description", "post content", "content of posts"];
const titleKeys = ["title", "headline", "subject"];
const dateKeys = ["date", "published at", "published_at", "created at", "created_at", "created", "time"];
const urlKeys = ["url", "link", "source url", "source_url", "link to the source"];
const platformKeys = ["platform", "channel", "network", "social network", "service", "domain group", "source", "source type", "medium", "specific type"];
const contentTypeKeys = ["content type", "type", "source type", "specific type", "media type", "post type", "kind"];
const authorKeys = ["author", "author name", "author_name", "user", "username", "handle"];
const sentimentKeys = ["sentiment", "sentiment label", "sentiment_label"];
const sentimentScoreKeys = ["sentiment score", "sentiment_score", "score"];
const languageKeys = ["language", "lang"];
const countryKeys = ["country", "location country", "country_code"];
const idKeys = ["id", "mention id", "mention_id", "external id", "external_id", "url"];
const engagementKeys = [
  "likes",
  "comments",
  "shares",
  "reposts",
  "views",
  "engagement",
  "interactions",
  "reach"
];

// Larger batch for the streaming path: 500 rows × ~22 cols ≈ 11k params, well
// under Postgres' 65535 limit, and fewer round-trips to the remote pooler.
const STREAM_BATCH_SIZE = 500;

// Streaming ingest for very large CSVs (hundreds of MB). The whole-string
// ingestSentioneCsv buffers the file + parsed array in memory and OOMs the
// server on ~0.5GB exports. This variant consumes the upload as a byte stream,
// parses row-by-row, and inserts in bounded batches — memory stays flat
// regardless of file size. It also computes the file hash incrementally.
export async function ingestSentioneCsvStream(params: {
  corpusId: string;
  importBatchId: string;
  sourceFileName: string;
  entityLabel?: string | null;
  stream: ReadableStream<Uint8Array>;
}): Promise<{ stats: CsvImportStats; fileHash: string }> {
  const hash = crypto.createHash("sha256");
  const decoder = new TextDecoder("utf-8");
  const seenHashes = new Set<string>();
  // mentions has TWO unique constraints: (study_corpus_id, text_hash) and
  // (source_system, external_id). ON CONFLICT can only target one, so we also
  // dedup external_id in-file — otherwise a CSV with repeated mention IDs makes
  // the whole batch INSERT fail on uq_mentions_source_external.
  const seenExternalIds = new Set<string>();
  const stats: CsvImportStats = {
    record_count: 0,
    included_count: 0,
    excluded_count: 0,
    duplicate_count: 0
  };

  let normalizedHeader: string[] | null = null;
  let delimiter = "";
  let headBuffer = "";
  let delimiterReady = false;

  // Cross-chunk CSV parser state.
  let cell = "";
  let row: string[] = [];
  let inQuotes = false;
  let heldQuote = false; // saw a `"`, deferring escaped-vs-toggle decision
  let lastWasCR = false;
  let bomStripped = false;

  // Insert batches concurrently — a single connection to the remote pooler tops
  // out near ~600 rows/s (latency-bound); a handful in parallel reaches a few
  // thousand rows/s, which is what makes ~0.5GB files finish in minutes.
  const INSERT_CONCURRENCY = 6;
  let batch: NormalizedMention[] = [];
  const inFlight = new Set<Promise<void>>();

  function dispatch(rows: NormalizedMention[]) {
    const task = insertMentionChunk(rows, params, stats).finally(() => {
      inFlight.delete(task);
    });
    inFlight.add(task);
  }

  async function dispatchBatch() {
    if (batch.length === 0) return;
    const rows = batch;
    batch = [];
    dispatch(rows);
    if (inFlight.size >= INSERT_CONCURRENCY) await Promise.race(inFlight);
  }

  async function emitRow(cells: string[]) {
    if (normalizedHeader === null) {
      normalizedHeader = cells.map((cssll) => normalizeKey(cssll));
      return;
    }
    if (!cells.some((value) => value.trim().length > 0)) return;
    stats.record_count += 1;
    const header = normalizedHeader;
    const rowObj = header.reduce<CsvRow>((acc, key, index) => {
      acc[key || `column_${index + 1}`] = cells[index]?.trim() ?? "";
      return acc;
    }, {});
    const mention = normalizeMention(rowObj, params.sourceFileName);
    // Dedup on either unique key before it can blow up a batch insert.
    if (seenHashes.has(mention.textHash) || seenExternalIds.has(mention.externalId)) {
      stats.duplicate_count += 1;
      return;
    }
    seenHashes.add(mention.textHash);
    seenExternalIds.add(mention.externalId);
    batch.push(mention);
    if (batch.length >= STREAM_BATCH_SIZE) await dispatchBatch();
  }

  async function feed(text: string) {
    for (let index = 0; index < text.length; index += 1) {
      const char = text[index] as string;

      if (!bomStripped) {
        bomStripped = true;
        if (char === "﻿") continue;
      }

      if (heldQuote) {
        heldQuote = false;
        if (char === '"') {
          cell += '"'; // escaped quote ("")
          continue;
        }
        inQuotes = !inQuotes; // the held quote was a real toggle
      }

      if (lastWasCR) {
        lastWasCR = false;
        if (char === "\n") continue; // swallow the \n of a \r\n pair
      }

      if (char === '"') {
        heldQuote = true;
        continue;
      }

      if (!inQuotes && char === delimiter) {
        row.push(cell);
        cell = "";
        continue;
      }

      if (!inQuotes && (char === "\n" || char === "\r")) {
        row.push(cell);
        await emitRow(row);
        row = [];
        cell = "";
        if (char === "\r") lastWasCR = true;
        continue;
      }

      cell += char;
    }
  }

  const reader = params.stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value || value.length === 0) continue;
    hash.update(value);
    const text = decoder.decode(value, { stream: true });
    if (text.length === 0) continue;

    if (!delimiterReady) {
      headBuffer += text;
      const newlineIndex = headBuffer.search(/\r|\n/);
      if (newlineIndex >= 0 || headBuffer.length > 16_384) {
        delimiter = detectDelimiter(headBuffer);
        delimiterReady = true;
        const pending = headBuffer;
        headBuffer = "";
        await feed(pending);
      }
      continue;
    }

    await feed(text);
  }

  // Flush decoder + any buffered head that never hit a newline (single-line file).
  const tail = decoder.decode();
  if (!delimiterReady) {
    headBuffer += tail;
    delimiter = detectDelimiter(headBuffer || ",");
    delimiterReady = true;
    await feed(headBuffer);
    headBuffer = "";
  } else if (tail.length > 0) {
    await feed(tail);
  }

  // Resolve a deferred trailing quote and emit the final row if present.
  if (heldQuote) {
    heldQuote = false;
    inQuotes = !inQuotes;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    await emitRow(row);
  }

  if (batch.length > 0) {
    dispatch(batch);
    batch = [];
  }
  await Promise.all(inFlight);

  return { stats, fileHash: hash.digest("hex") };
}

// Shared chunk-insert used by both the buffered and streaming ingest paths.
function toInsertValue(
  m: NormalizedMention,
  params: { corpusId: string; importBatchId: string; entityLabel?: string | null }
) {
  return {
    studyCorpusId: params.corpusId,
    externalId: `${params.corpusId}:${m.externalId}`.slice(0, 500),
    sourceSystem: "sentione_csv",
    sourceFileId: params.importBatchId,
    textHash: m.textHash,
    textRaw: m.textRaw,
    textClean: m.textClean,
    textSnippet: m.textSnippet,
    title: m.title,
    textLength: m.textLength,
    language: m.language,
    publishedAt: m.publishedAt,
    platform: m.platform,
    // Materialized columns for fast Signal aggregates (see migration 0023).
    resolvedPlatform: m.platform,
    contentType: m.contentType,
    batchEntityLabel: params.entityLabel ?? null,
    url: m.url,
    country: m.country,
    engagement: m.engagement,
    sentimentSource: m.sentimentSource,
    sentimentScore: m.sentimentScore,
    qualityScore: m.inclusionStatus === "included" ? 7 : 2,
    inclusionStatus: m.inclusionStatus,
    exclusionReason: m.exclusionReason,
    qualityFlags: m.qualityFlags,
    rawMetadata: m.rawMetadata
  };
}

async function insertMentionChunk(
  chunk: NormalizedMention[],
  params: { corpusId: string; importBatchId: string; entityLabel?: string | null },
  stats: CsvImportStats
) {
  if (chunk.length === 0) return;
  const values = chunk.map((m) => toInsertValue(m, params));

  try {
    const inserted = await db
      .insert(mentions)
      .values(values)
      .onConflictDoNothing({ target: [mentions.studyCorpusId, mentions.textHash] })
      .returning({ id: mentions.id, inclusionStatus: mentions.inclusionStatus });

    stats.duplicate_count += chunk.length - inserted.length;
    for (const inserted_row of inserted) {
      if (inserted_row.inclusionStatus === "included") stats.included_count += 1;
      else stats.excluded_count += 1;
    }
  } catch (err) {
    // A batch can fail on the OTHER unique constraint (source_system,
    // external_id) when an id already exists in the DB. Don't lose the whole
    // chunk — retry row by row so only the genuinely conflicting rows are skipped.
    const msg = err instanceof Error ? err.message.slice(0, 160) : String(err).slice(0, 160);
    console.warn(`[csv-ingest] batch failed, retrying ${chunk.length} rows individually: ${msg}`);
    for (const m of chunk) {
      try {
        const inserted = await db
          .insert(mentions)
          .values([toInsertValue(m, params)])
          .onConflictDoNothing({ target: [mentions.studyCorpusId, mentions.textHash] })
          .returning({ id: mentions.id, inclusionStatus: mentions.inclusionStatus });
        if (inserted.length === 0) {
          stats.duplicate_count += 1;
        } else if (inserted[0]?.inclusionStatus === "included") {
          stats.included_count += 1;
        } else {
          stats.excluded_count += 1;
        }
      } catch {
        // Conflicts with the source/external unique key or a bad row — skip it.
        stats.duplicate_count += 1;
      }
    }
  }
}

function normalizeMention(row: CsvRow, sourceFileName: string): NormalizedMention {
  const textRaw = pick(row, textKeys) || pick(row, titleKeys) || "";
  const textClean = cleanText(textRaw);
  const textHash = hashText(textClean);
  const title = pick(row, titleKeys) || null;
  const publishedAt = parseDate(pick(row, dateKeys)) ?? new Date(0);
  const url = pick(row, urlKeys) || null;
  const platform = normalizePlatform(row, url);
  const contentType = normalizeContentType(pick(row, contentTypeKeys));
  const sentimentSource = normalizeSentiment(pick(row, sentimentKeys));
  const sentimentScore = parseSentimentScore(pick(row, sentimentScoreKeys) || sentimentSource);
  const country = normalizeCountry(pick(row, countryKeys));
  const language = normalizeLanguage(pick(row, languageKeys));
  const tooShort = textClean.length < 30;

  return {
    externalId: buildExternalId(row, textHash),
    textRaw,
    textClean,
    textSnippet: textClean.slice(0, 220),
    title,
    textLength: textClean.length,
    language,
    publishedAt,
    platform,
    contentType,
    url,
    country,
    engagement: extractEngagement(row),
    sentimentSource,
    sentimentScore,
    inclusionStatus: tooShort ? "excluded" : "included",
    exclusionReason: tooShort ? "text_under_30_chars" : null,
    qualityFlags: {
      text_under_30_chars: tooShort,
      missing_date: publishedAt.getTime() === 0,
      missing_platform: platform === "unknown"
    },
    rawMetadata: {
      source_file_name: sourceFileName,
      author: pick(row, authorKeys) || null,
      content_type: contentType,
      row
    },
    textHash
  };
}

function detectDelimiter(input: string) {
  const firstLine = input.split(/\r?\n/, 1)[0] ?? "";
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  return semicolons >= commas ? ";" : ",";
}

function pick(row: CsvRow, keys: string[]) {
  for (const key of keys) {
    const value = row[normalizeKey(key)];
    if (value) {
      return value;
    }
  }

  return "";
}

function normalizeKey(key: string) {
  return key
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function cleanText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function hashText(text: string) {
  return crypto.createHash("sha256").update(text.toLowerCase()).digest("hex");
}

function buildExternalId(row: CsvRow, textHash: string) {
  const sourceId = pick(row, idKeys);
  return sourceId ? sourceId.slice(0, 500) : `csv_${textHash.slice(0, 24)}`;
}

function parseDate(value: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizePlatform(row: CsvRow, url: string | null) {
  const haystack = [
    url ?? "",
    ...platformKeys.map((key) => pick(row, [key])),
    ...Object.values(row)
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const known = detectKnownPlatform(haystack);
  if (known) return known;

  const candidate = pick(row, platformKeys);
  const normalized = normalizeToken(candidate);
  if (!normalized || isContentTypeToken(normalized)) return "unknown";
  return normalized;
}

function detectKnownPlatform(value: string) {
  const rules: Array<[RegExp, string]> = [
    [/\btik\s*tok\b|tiktok\.com|douyin/i, "tiktok"],
    [/\btwitter\b|\bx\b|x\.com|twitter\.com/i, "x"],
    [/\binstagram\b|instagram\.com/i, "instagram"],
    [/\bfacebook\b|facebook\.com|fb\.com/i, "facebook"],
    [/\byoutube\b|youtu\.be|youtube\.com/i, "youtube"],
    [/\breddit\b|reddit\.com/i, "reddit"],
    [/\blinkedin\b|linkedin\.com/i, "linkedin"],
    [/\bthreads\b|threads\.net/i, "threads"],
    [/\btelegram\b|t\.me/i, "telegram"],
    [/\bwhatsapp\b|wa\.me/i, "whatsapp"],
    [/\btrustpilot\b|trustpilot\./i, "trustpilot"],
    [/\bgoogle\b|google\./i, "google"],
    [/\bnews\b|newspaper|article|press|media outlet/i, "news"],
    [/\bblog\b|blogspot|wordpress|medium\.com/i, "blog"],
    [/\bforum\b|community/i, "forum"]
  ];
  return rules.find(([regex]) => regex.test(value))?.[1] ?? null;
}

function normalizeContentType(value: string) {
  const token = normalizeToken(value);
  return token || null;
}

function normalizeToken(value: string) {
  return value
    ? value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
    : "";
}

function isContentTypeToken(value: string) {
  return /^(comment|comments|comentario|comentarios|video|short|shorts|post|posts|tweet|tweets|article|articles|news|reel|reels|story|stories|image|photo|photos|forum_post)$/.test(value);
}

function normalizeSentiment(value: string) {
  return value ? value.toLowerCase() : null;
}

function parseSentimentScore(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value.toLowerCase();
  const numeric = Number(normalized.replace(",", "."));

  if (Number.isFinite(numeric)) {
    return String(Math.max(-1, Math.min(1, numeric)));
  }

  if (normalized.includes("positive") || normalized.includes("positivo")) {
    return "1";
  }

  if (normalized.includes("negative") || normalized.includes("negativo")) {
    return "-1";
  }

  if (normalized.includes("neutral")) {
    return "0";
  }

  return null;
}

function normalizeCountry(value: string) {
  return value ? value.trim().slice(0, 2).toUpperCase() : null;
}

function normalizeLanguage(value: string) {
  return value ? value.trim().slice(0, 2).toLowerCase() : null;
}

function extractEngagement(row: CsvRow) {
  return engagementKeys.reduce<Record<string, number>>((acc, key) => {
    const value = row[normalizeKey(key)];
    const parsed = Number(value?.replace(/,/g, ""));

    if (Number.isFinite(parsed)) {
      acc[normalizeKey(key).replace(/\s+/g, "_")] = parsed;
    }

    return acc;
  }, {});
}
