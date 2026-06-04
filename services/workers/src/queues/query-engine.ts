import { Worker } from "bullmq";
import Redis from "ioredis";

import { QUERY_ENGINE_QUEUE_NAME } from "@noisia/query-engine";
import { applyQueryAdjustmentsJob } from "../workers/apply-query-adjustments";
import { assessCorpusJob } from "../workers/assess-corpus";
import { cleanupApplyJob } from "../workers/cleanup-apply";
import { cleanupPreviewJob } from "../workers/cleanup-preview";
import { composeInitialQueryJob } from "../workers/compose-initial-query";
import { evaluateSampleJob } from "../workers/evaluate-sample";
import { ingestMentionsCsvJob } from "../workers/mentions-csv-ingest";
import { processKnowledgeSourcesJob } from "../workers/process-knowledge-sources";
import { semanticEmbeddingsJob } from "../workers/semantic-embeddings";

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL is required.");
}

export const redisConnection = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  tls: process.env.REDIS_URL.startsWith("rediss://") ? {} : undefined
});

export function startQueryEngineWorker() {
  // TODO mejora-futura: mover concurrency a env por ambiente y agregar
  // BullMQ dashboard cuando Railway quede conectado.
  return new Worker(
    resolveQueueName(QUERY_ENGINE_QUEUE_NAME),
    async (job) => {
      if (job.name === "compose_initial_query") {
        return composeInitialQueryJob(job);
      }

      if (job.name === "evaluate_sample") {
        return evaluateSampleJob(job);
      }

      if (job.name === "apply_query_adjustments") {
        return applyQueryAdjustmentsJob(job);
      }

      if (job.name === "assess_corpus") {
        return assessCorpusJob(job);
      }

      if (job.name === "cleanup_preview") {
        return cleanupPreviewJob(job);
      }

      if (job.name === "cleanup_apply") {
        return cleanupApplyJob(job);
      }

      if (job.name === "process_knowledge_sources") {
        return processKnowledgeSourcesJob(job);
      }

      if (job.name === "ingest_mentions_csv") {
        return ingestMentionsCsvJob(job);
      }

      if (job.name === "embed_corpus_semantics") {
        return semanticEmbeddingsJob(job);
      }

      throw new Error(`Unsupported query-engine job: ${job.name}`);
    },
    {
      connection: redisConnection,
      concurrency: 2
    }
  );
}

function resolveQueueName(baseName: string) {
  if (process.env.NOISIA_QUERY_ENGINE_QUEUE_NAME) return process.env.NOISIA_QUERY_ENGINE_QUEUE_NAME;
  const runtimeEnv = process.env.RAILWAY_ENVIRONMENT || process.env.VERCEL_ENV || process.env.NODE_ENV;
  return runtimeEnv && runtimeEnv !== "development" ? baseName : `${baseName}-local`;
}

// Heartbeat key shared with the Studio API so it can reliably detect whether a
// worker is alive. getWorkers()/CLIENT LIST is unreliable on managed Redis
// (e.g. Upstash returns 0 even when a worker is connected), so we use an
// explicit TTL key written by the worker instead.
export const QUERY_ENGINE_HEARTBEAT_KEY = `noisia:worker-alive:${resolveQueueName(QUERY_ENGINE_QUEUE_NAME)}`;
export const QUERY_ENGINE_HEARTBEAT_TTL_SECONDS = 45;

export function startQueryEngineHeartbeat() {
  const write = () => {
    redisConnection
      .set(QUERY_ENGINE_HEARTBEAT_KEY, String(Date.now()), "EX", QUERY_ENGINE_HEARTBEAT_TTL_SECONDS)
      .catch((error) => console.warn(`[heartbeat] write failed: ${error instanceof Error ? error.message : String(error)}`));
  };
  write();
  return setInterval(write, 15_000);
}
