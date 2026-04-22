import { defineJob } from "@platform/jobs";
import { z } from "zod";

export const jobDefinitionKeys = [
  "ai.runs.intake",
  "ai.runs.verify",
  "ai.approvals.remind",
  "ai.approvals.escalate"
] as const;

export const jobDefinitions = {
  "ai.runs.intake": defineJob({
    id: "ai.runs.intake",
    queue: "ai-intake",
    payload: z.object({
      tenantId: z.string().min(2),
      runId: z.string().min(2)
    }),
    concurrency: 4,
    retryPolicy: {
      attempts: 3,
      backoff: "linear",
      delayMs: 2_000
    },
    timeoutMs: 60_000,
    handler: () => undefined
  }),
  "ai.runs.verify": defineJob({
    id: "ai.runs.verify",
    queue: "ai-verify",
    payload: z.object({
      tenantId: z.string().min(2),
      runId: z.string().min(2)
    }),
    concurrency: 2,
    retryPolicy: {
      attempts: 4,
      backoff: "exponential",
      delayMs: 2_000
    },
    timeoutMs: 90_000,
    handler: () => undefined
  }),
  "ai.approvals.remind": defineJob({
    id: "ai.approvals.remind",
    queue: "ai-approvals",
    payload: z.object({
      tenantId: z.string().min(2),
      runId: z.string().min(2),
      checkpointId: z.string().min(2).optional()
    }),
    concurrency: 3,
    retryPolicy: {
      attempts: 3,
      backoff: "linear",
      delayMs: 5_000
    },
    timeoutMs: 60_000,
    handler: () => undefined
  }),
  "ai.approvals.escalate": defineJob({
    id: "ai.approvals.escalate",
    queue: "ai-escalations",
    payload: z.object({
      tenantId: z.string().min(2),
      runId: z.string().min(2),
      checkpointId: z.string().min(2).optional()
    }),
    concurrency: 2,
    retryPolicy: {
      attempts: 5,
      backoff: "exponential",
      delayMs: 5_000
    },
    timeoutMs: 60_000,
    handler: () => undefined
  })
} as const;

export type AiCoreJobDefinitionKey = (typeof jobDefinitionKeys)[number];
