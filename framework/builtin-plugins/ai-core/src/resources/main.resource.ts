import { defineResource } from "@platform/schema";
import { z } from "zod";
import { agentRuns, approvalRequests, promptVersions, runArtifacts, runEvidence, runEvents, runnerHandoffs, verifierResults } from "../../db/schema";

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
    status: z.enum(["queued", "running", "waiting-approval", "completed", "failed", "cancelled", "escalated"]),
    modelId: z.string().min(2),
    executionMode: z.enum(["deterministic", "bounded-agent", "human-task", "sandbox", "strict-process", "exploratory"]),
    processClass: z.string().min(2),
    riskTier: z.enum(["low", "moderate", "high", "critical"]),
    slaMinutes: z.number().int().positive(),
    stepCount: z.number().int().nonnegative(),
    artifactCount: z.number().int().nonnegative(),
    evidenceCount: z.number().int().nonnegative(),
    replayFingerprint: z.string().min(8),
    escalationQueue: z.string().nullable(),
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
    executionMode: {
      filter: "select",
      label: "Mode",
      description: "Execution posture applied to the run.",
      businessMeaning: "Shows whether the run used deterministic, strict-process, bounded-agent, or exploratory execution."
    },
    processClass: {
      searchable: true,
      sortable: true,
      label: "Process class",
      description: "Normalized process classification for the intake.",
      businessMeaning: "Lets operators route and compare runs by operating procedure."
    },
    riskTier: {
      filter: "select",
      label: "Risk",
      description: "Risk tier assigned during classification.",
      businessMeaning: "Highlights runs that need tighter governance and human checkpoints."
    },
    slaMinutes: {
      sortable: true,
      filter: "number",
      label: "SLA",
      description: "Response or completion SLA in minutes for the run.",
      businessMeaning: "Supports approval deadlines, escalation, and operator prioritization."
    },
    stepCount: {
      sortable: true,
      filter: "number",
      label: "Steps",
      description: "Number of persisted execution steps recorded for the run.",
      businessMeaning: "Indicates how much work the agent performed and how deep the execution went."
    },
    artifactCount: {
      sortable: true,
      filter: "number",
      label: "Artifacts",
      description: "Number of persisted artifacts attached to the run.",
      businessMeaning: "Shows how much inspectable output the run produced."
    },
    evidenceCount: {
      sortable: true,
      filter: "number",
      label: "Evidence",
      description: "Number of evidence records attached to the run.",
      businessMeaning: "Shows how much verification and policy proof the run captured."
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
    defaultColumns: ["agentId", "status", "executionMode", "riskTier", "artifactCount", "evidenceCount", "startedAt"]
  },
  portal: { enabled: false },
  ai: {
    curatedReadModel: true,
    purpose: "Replay-safe view of durable AI runs and their final states.",
    citationLabelField: "agentId",
    allowedFields: [
      "agentId",
      "status",
      "modelId",
      "executionMode",
      "processClass",
      "riskTier",
      "slaMinutes",
      "stepCount",
      "artifactCount",
      "evidenceCount",
      "replayFingerprint",
      "startedAt"
    ]
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
    requestedAt: z.string(),
    expiresAt: z.string().nullable()
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
    },
    expiresAt: {
      sortable: true,
      label: "Expires",
      description: "Timestamp when the checkpoint automatically fails and escalates."
    }
  },
  admin: {
    autoCrud: true,
    defaultColumns: ["runId", "toolId", "state", "requestedAt", "expiresAt"]
  },
  portal: { enabled: false },
  ai: {
    curatedReadModel: true,
    purpose: "Approval checkpoints raised by AI runs before sensitive tool execution.",
    citationLabelField: "runId",
    allowedFields: ["runId", "toolId", "state", "requestedAt", "expiresAt"]
  }
});

export const RunArtifactResource = defineResource({
  id: "ai.run-artifacts",
  description: "Inspectable artifacts emitted by durable AI runs.",
  businessPurpose: "Keep plans, result packets, approval packets, and handoff artifacts visible and queryable.",
  table: runArtifacts,
  contract: z.object({
    id: z.string().min(2),
    tenantId: z.string().min(2),
    runId: z.string().min(2),
    kind: z.enum(["plan", "result", "approval-packet", "handoff", "report", "release-candidate"]),
    label: z.string().min(2),
    uri: z.string().nullable(),
    createdAt: z.string()
  }),
  fields: {
    runId: { searchable: true, sortable: true, label: "Run" },
    kind: { filter: "select", label: "Kind" },
    label: { searchable: true, sortable: true, label: "Label" },
    createdAt: { sortable: true, label: "Created" }
  },
  admin: {
    autoCrud: true,
    defaultColumns: ["runId", "kind", "label", "createdAt"]
  },
  portal: { enabled: false },
  ai: {
    curatedReadModel: true,
    purpose: "Inspectable run artifacts produced by the governed AI runtime.",
    citationLabelField: "label",
    allowedFields: ["runId", "kind", "label", "createdAt"]
  }
});

export const RunEvidenceResource = defineResource({
  id: "ai.run-evidence",
  description: "Verification, policy, workflow, and notification evidence linked to durable AI runs.",
  businessPurpose: "Make completion proof, policy checks, and escalation signals queryable by operators and downstream packs.",
  table: runEvidence,
  contract: z.object({
    id: z.string().min(2),
    tenantId: z.string().min(2),
    runId: z.string().min(2),
    kind: z.enum(["citation", "policy-check", "verification", "eval-gate", "notification", "workflow"]),
    label: z.string().min(2),
    passed: z.boolean(),
    createdAt: z.string()
  }),
  fields: {
    runId: { searchable: true, sortable: true, label: "Run" },
    kind: { filter: "select", label: "Kind" },
    label: { searchable: true, sortable: true, label: "Label" },
    passed: { filter: "select", label: "Passed" },
    createdAt: { sortable: true, label: "Created" }
  },
  admin: {
    autoCrud: true,
    defaultColumns: ["runId", "kind", "label", "passed", "createdAt"]
  },
  portal: { enabled: false },
  ai: {
    curatedReadModel: true,
    purpose: "Query evidence and verification records for durable AI runs.",
    citationLabelField: "label",
    allowedFields: ["runId", "kind", "label", "passed", "createdAt"]
  }
});

export const RunEventResource = defineResource({
  id: "ai.run-events",
  description: "Streamable lifecycle events emitted by durable AI runs.",
  businessPurpose: "Expose status, branch, verifier, and handoff events for consoles and future webhook listeners.",
  table: runEvents,
  contract: z.object({
    id: z.string().min(2),
    tenantId: z.string().min(2),
    runId: z.string().min(2),
    type: z.enum(["status", "step", "approval", "artifact", "evidence", "branch", "verifier", "handoff"]),
    summary: z.string().min(2),
    createdAt: z.string()
  }),
  fields: {
    runId: { searchable: true, sortable: true, label: "Run" },
    type: { filter: "select", label: "Type" },
    summary: { searchable: true, sortable: true, label: "Summary" },
    createdAt: { sortable: true, label: "Created" }
  },
  admin: {
    autoCrud: true,
    defaultColumns: ["runId", "type", "summary", "createdAt"]
  },
  portal: { enabled: false }
});

export const RunnerHandoffResource = defineResource({
  id: "ai.runner-handoffs",
  description: "Out-of-process or sandbox runner handoff records for governed runs.",
  businessPurpose: "Track planned execution handoffs before same-process assumptions are removed.",
  table: runnerHandoffs,
  contract: z.object({
    id: z.string().min(2),
    tenantId: z.string().min(2),
    runId: z.string().min(2),
    target: z.enum(["same-process", "queue-worker", "sandbox", "external-runner"]),
    state: z.enum(["prepared", "accepted", "completed", "failed"]),
    endpoint: z.string().nullable(),
    requestedAt: z.string(),
    completedAt: z.string().nullable()
  }),
  fields: {
    runId: { searchable: true, sortable: true, label: "Run" },
    target: { filter: "select", label: "Target" },
    state: { filter: "select", label: "State" },
    requestedAt: { sortable: true, label: "Requested" }
  },
  admin: {
    autoCrud: true,
    defaultColumns: ["runId", "target", "state", "requestedAt"]
  },
  portal: { enabled: false }
});

export const VerifierResultResource = defineResource({
  id: "ai.verifier-results",
  description: "Verifier results attached to governed AI runs.",
  businessPurpose: "Make verifier hook outcomes queryable for release gates, run review, and future webhook streams.",
  table: verifierResults,
  contract: z.object({
    id: z.string().min(2),
    tenantId: z.string().min(2),
    runId: z.string().min(2),
    hookId: z.string().min(2),
    outcome: z.enum(["pass", "warn", "fail"]),
    summary: z.string().min(2),
    createdAt: z.string()
  }),
  fields: {
    runId: { searchable: true, sortable: true, label: "Run" },
    hookId: { searchable: true, sortable: true, label: "Hook" },
    outcome: { filter: "select", label: "Outcome" },
    createdAt: { sortable: true, label: "Created" }
  },
  admin: {
    autoCrud: true,
    defaultColumns: ["runId", "hookId", "outcome", "createdAt"]
  },
  portal: { enabled: false }
});

export const aiCoreResources = [
  AgentRunResource,
  PromptVersionResource,
  ApprovalRequestResource,
  RunArtifactResource,
  RunEvidenceResource,
  RunEventResource,
  RunnerHandoffResource,
  VerifierResultResource
] as const;
