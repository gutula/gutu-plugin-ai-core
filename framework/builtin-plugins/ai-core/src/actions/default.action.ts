import { defineAction } from "@platform/schema";
import { z } from "zod";
import {
  approveAgentCheckpointDecision,
  publishPromptVersion,
  submitAgentRun
} from "../services/main.service";

export const submitAgentRunAction = defineAction({
  id: "ai.agent-runs.submit",
  description: "Submit a governed AI run against approved tools and prompt versions.",
  businessPurpose: "Start durable agent work without bypassing tenant, tool, prompt, or replay governance.",
  preconditions: [
    "The tenant, actor, and agent identifiers must be valid.",
    "At least one allowed tool id must be provided."
  ],
  mandatorySteps: [
    "Pin the prompt version before execution begins.",
    "Record replay-safe inputs and tool permissions for the run."
  ],
  sideEffects: [
    "Creates a durable run record.",
    "May create an approval checkpoint before completion."
  ],
  postconditions: [
    "A stable run id is returned.",
    "The run status reflects whether approval is needed or execution completed."
  ],
  failureModes: [
    "Validation fails if the prompt version, actor, or tool inputs are incomplete."
  ],
  forbiddenShortcuts: [
    "Do not invoke undeclared tools outside the allowed tool list.",
    "Do not run with an unpublished or untracked prompt version."
  ],
  input: z.object({
    tenantId: z.string().min(2),
    actorId: z.string().min(2),
    agentId: z.string().min(2),
    promptVersionId: z.string().min(2),
    goal: z.string().min(12),
    allowedToolIds: z.array(z.string().min(2)).min(1),
    modelId: z.string().min(2).optional()
  }),
  output: z.object({
    ok: z.literal(true),
    runId: z.string(),
    status: z.enum(["waiting-approval", "completed"]),
    pendingCheckpointId: z.string().optional()
  }),
  permission: "ai.runs.submit",
  idempotent: true,
  audit: true,
  ai: {
    purpose: "Queue a durable AI agent run against governed tools and prompt versions.",
    riskLevel: "moderate",
    approvalMode: "none",
    toolPolicies: ["tool.allow"],
    groundingInputs: [{ sourceId: "ai.agent-runs", required: false }],
    resultSummaryHint: "Return the run id, current state, and whether a human approval checkpoint was created.",
    replay: {
      deterministic: true,
      includeInputHash: true,
      includeOutputHash: true,
      note: "Replay is anchored to prompt version, tool schema, policy decisions, and memory snapshots."
    }
  },
  handler: ({ input }) => submitAgentRun(input)
});

export const approveAgentCheckpointAction = defineAction({
  id: "ai.approvals.approve",
  description: "Resolve an AI approval checkpoint with an explicit human decision.",
  businessPurpose: "Allow sensitive AI steps to continue only after accountable human review.",
  preconditions: [
    "The checkpoint must belong to the supplied run and tenant.",
    "The acting user must hold ai.approvals.approve permission."
  ],
  mandatorySteps: [
    "Record whether the checkpoint was approved or rejected.",
    "Preserve the reviewer note whenever one is supplied."
  ],
  sideEffects: [
    "Resumes or terminates the associated run based on the decision."
  ],
  forbiddenShortcuts: [
    "Agents must not self-approve their own checkpoints."
  ],
  input: z.object({
    tenantId: z.string().min(2),
    actorId: z.string().min(2),
    runId: z.string().min(2),
    checkpointId: z.string().min(2),
    approved: z.boolean(),
    note: z.string().min(3).optional()
  }),
  output: z.object({
    ok: z.literal(true),
    status: z.enum(["completed", "failed"]),
    checkpointState: z.enum(["approved", "rejected"])
  }),
  permission: "ai.approvals.approve",
  idempotent: true,
  audit: true,
  ai: {
    purpose: "Resolve a human approval checkpoint for a durable AI run.",
    riskLevel: "high",
    approvalMode: "required",
    toolPolicies: ["tool.deny"],
    resultSummaryHint: "Return whether the checkpoint was approved or rejected and the final run state.",
    replay: {
      deterministic: true,
      includeInputHash: true,
      includeOutputHash: true,
      note: "Approval decisions are replay-sensitive and cannot be self-issued by agents."
    }
  },
  handler: ({ input }) => approveAgentCheckpointDecision(input)
});

export const publishPromptVersionAction = defineAction({
  id: "ai.prompts.publish",
  description: "Publish a reviewed prompt version for governed use.",
  businessPurpose: "Move prompt changes into an auditable, replay-safe published state before agents depend on them.",
  preconditions: [
    "The prompt body must pass validation and review before publication."
  ],
  mandatorySteps: [
    "Publish prompt versions with a changelog when behavior changes.",
    "Keep prompt versions diffable for later replay and incident review."
  ],
  sideEffects: [
    "Creates a published prompt version record."
  ],
  forbiddenShortcuts: [
    "Do not overwrite an existing published prompt body in place."
  ],
  input: z.object({
    tenantId: z.string().min(2),
    actorId: z.string().min(2),
    templateId: z.string().min(2),
    version: z.string().min(1),
    body: z.string().min(20),
    changelog: z.string().min(3).optional()
  }),
  output: z.object({
    ok: z.literal(true),
    promptVersionId: z.string(),
    status: z.literal("published")
  }),
  permission: "ai.prompts.publish",
  idempotent: false,
  audit: true,
  ai: {
    purpose: "Publish a governed prompt version for replay-safe AI execution.",
    riskLevel: "moderate",
    approvalMode: "required",
    toolPolicies: ["tool.require_approval"],
    resultSummaryHint: "Return the new prompt version id and publication status.",
    replay: {
      deterministic: true,
      includeInputHash: true,
      includeOutputHash: true,
      note: "Prompt publications must remain diffable and replay-safe."
    }
  },
  handler: ({ input }) => publishPromptVersion(input)
});

export const aiCoreActions = [
  submitAgentRunAction,
  approveAgentCheckpointAction,
  publishPromptVersionAction
] as const;
