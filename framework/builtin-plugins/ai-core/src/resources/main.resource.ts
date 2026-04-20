import { defineResource } from "@platform/schema";
import { z } from "zod";
import { agentRuns, approvalRequests, promptVersions } from "../../db/schema";

export const AgentRunResource = defineResource({
  id: "ai.agent-runs",
  description: "Durable execution record for a governed AI agent run.",
  businessPurpose: "Track agent lifecycle, status, budget use, and replay-safe execution history.",
  invariants: [
    "Each run belongs to one tenant and one agent definition.",
    "Run status changes must remain auditable."
  ],
  lifecycleNotes: [
    "Runs may pause for approval checkpoints before completion.",
    "Replay-safe metadata must remain stable across investigations."
  ],
  actors: ["ai-operator", "approver", "platform-admin"],
  table: agentRuns,
  contract: z.object({
    id: z.string().min(2),
    tenantId: z.string().min(2),
    agentId: z.string().min(2),
    status: z.enum(["queued", "running", "waiting-approval", "completed", "failed", "cancelled"]),
    modelId: z.string().min(2),
    stepCount: z.number().int().nonnegative(),
    startedAt: z.string()
  }),
  fields: {
    agentId: {
      searchable: true,
      sortable: true,
      label: "Agent",
      description: "Agent definition that owns the run.",
      businessMeaning: "Lets operators group runs by agent purpose and ownership."
    },
    status: {
      filter: "select",
      label: "Status",
      description: "Current lifecycle status of the agent run.",
      businessMeaning: "Shows whether a run is active, waiting for approval, finished, or failed."
    },
    modelId: {
      searchable: true,
      sortable: true,
      label: "Model",
      description: "Model profile used for the run.",
      businessMeaning: "Helps audit routing, cost, and quality decisions."
    },
    stepCount: {
      sortable: true,
      filter: "number",
      label: "Steps",
      description: "Number of persisted execution steps recorded for the run.",
      businessMeaning: "Indicates how much work the agent performed and how deep the execution went."
    },
    startedAt: {
      sortable: true,
      label: "Started",
      description: "Timestamp when the run started execution.",
      businessMeaning: "Supports queue analysis, latency tracking, and investigation timelines."
    }
  },
  admin: {
    autoCrud: true,
    defaultColumns: ["agentId", "status", "modelId", "stepCount", "startedAt"]
  },
  portal: { enabled: false },
  ai: {
    curatedReadModel: true,
    purpose: "Replay-safe view of durable AI runs and their final states.",
    citationLabelField: "agentId",
    allowedFields: ["agentId", "status", "modelId", "stepCount", "startedAt"]
  }
});

export const PromptVersionResource = defineResource({
  id: "ai.prompt-versions",
  description: "Versioned prompt artifact used for governed AI execution.",
  businessPurpose: "Keep prompt bodies diffable, reviewable, and replay-safe across releases.",
  table: promptVersions,
  contract: z.object({
    id: z.string().min(2),
    tenantId: z.string().min(2),
    templateId: z.string().min(2),
    version: z.string().min(1),
    status: z.enum(["draft", "published"]),
    publishedAt: z.string()
  }),
  fields: {
    templateId: {
      searchable: true,
      sortable: true,
      label: "Template",
      description: "Prompt template family that this version belongs to."
    },
    version: {
      sortable: true,
      label: "Version",
      description: "Human-readable version label for the prompt body."
    },
    status: {
      filter: "select",
      label: "Status",
      description: "Publication status of the prompt version."
    },
    publishedAt: {
      sortable: true,
      label: "Published",
      description: "Timestamp when the prompt version became available for governed execution."
    }
  },
  admin: {
    autoCrud: true,
    defaultColumns: ["templateId", "version", "status", "publishedAt"]
  },
  portal: { enabled: false },
  ai: {
    curatedReadModel: true,
    purpose: "Stable prompt version registry for deterministic replay and audit.",
    citationLabelField: "templateId",
    allowedFields: ["templateId", "version", "status", "publishedAt"]
  }
});

export const ApprovalRequestResource = defineResource({
  id: "ai.approval-requests",
  description: "Approval checkpoint raised by an AI run before a sensitive tool step.",
  businessPurpose: "Make risky agent actions visible, reviewable, and explicitly resolvable by humans.",
  table: approvalRequests,
  contract: z.object({
    id: z.string().min(2),
    tenantId: z.string().min(2),
    runId: z.string().min(2),
    toolId: z.string().min(2).nullable(),
    state: z.enum(["pending", "approved", "rejected", "expired"]),
    requestedAt: z.string()
  }),
  fields: {
    runId: {
      searchable: true,
      sortable: true,
      label: "Run",
      description: "Agent run that emitted the approval request."
    },
    toolId: {
      searchable: true,
      sortable: true,
      label: "Tool",
      description: "Requested tool or action awaiting approval."
    },
    state: {
      filter: "select",
      label: "State",
      description: "Current decision state of the approval request."
    },
    requestedAt: {
      sortable: true,
      label: "Requested",
      description: "Timestamp when human review became required."
    }
  },
  admin: {
    autoCrud: true,
    defaultColumns: ["runId", "toolId", "state", "requestedAt"]
  },
  portal: { enabled: false },
  ai: {
    curatedReadModel: true,
    purpose: "Approval checkpoints raised by AI runs before sensitive tool execution.",
    citationLabelField: "runId",
    allowedFields: ["runId", "toolId", "state", "requestedAt"]
  }
});

export const aiCoreResources = [AgentRunResource, PromptVersionResource, ApprovalRequestResource] as const;
