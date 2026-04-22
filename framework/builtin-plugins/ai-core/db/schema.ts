import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const agentRuns = pgTable("ai_agent_runs", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  agentId: text("agent_id").notNull(),
  status: text("status").notNull(),
  modelId: text("model_id").notNull(),
  executionMode: text("execution_mode").notNull(),
  processClass: text("process_class").notNull(),
  riskTier: text("risk_tier").notNull(),
  slaMinutes: integer("sla_minutes").notNull(),
  stepCount: integer("step_count").notNull(),
  artifactCount: integer("artifact_count").notNull(),
  evidenceCount: integer("evidence_count").notNull(),
  replayFingerprint: text("replay_fingerprint").notNull(),
  escalationQueue: text("escalation_queue"),
  startedAt: timestamp("started_at").notNull().defaultNow()
});

export const promptVersions = pgTable("ai_prompt_versions", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  templateId: text("template_id").notNull(),
  version: text("version").notNull(),
  status: text("status").notNull(),
  publishedAt: timestamp("published_at").notNull().defaultNow()
});

export const approvalRequests = pgTable("ai_approval_requests", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  runId: text("run_id").notNull(),
  toolId: text("tool_id"),
  state: text("state").notNull(),
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at")
});

export const runArtifacts = pgTable("ai_run_artifacts", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  runId: text("run_id").notNull(),
  kind: text("kind").notNull(),
  label: text("label").notNull(),
  uri: text("uri"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const runEvidence = pgTable("ai_run_evidence", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  runId: text("run_id").notNull(),
  kind: text("kind").notNull(),
  label: text("label").notNull(),
  passed: text("passed").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const runEvents = pgTable("ai_run_events", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  runId: text("run_id").notNull(),
  type: text("type").notNull(),
  summary: text("summary").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const runnerHandoffs = pgTable("ai_runner_handoffs", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  runId: text("run_id").notNull(),
  target: text("target").notNull(),
  state: text("state").notNull(),
  endpoint: text("endpoint"),
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at")
});

export const verifierResults = pgTable("ai_verifier_results", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  runId: text("run_id").notNull(),
  hookId: text("hook_id").notNull(),
  outcome: text("outcome").notNull(),
  summary: text("summary").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
