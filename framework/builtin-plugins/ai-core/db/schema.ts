import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const agentRuns = pgTable("ai_agent_runs", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  agentId: text("agent_id").notNull(),
  status: text("status").notNull(),
  modelId: text("model_id").notNull(),
  stepCount: integer("step_count").notNull(),
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
  requestedAt: timestamp("requested_at").notNull().defaultNow()
});
