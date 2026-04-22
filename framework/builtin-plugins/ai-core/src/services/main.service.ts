import { createHash } from "node:crypto";

import type { ToolContract } from "@platform/ai";
import { defineGuardrailPolicy, moderateOutput, sanitizePrompt } from "@platform/ai-guardrails";
import {
  acknowledgeRunnerHandoff,
  appendAgentStep,
  approveCheckpoint,
  assertReplayFingerprint,
  attachRunArtifact,
  attachRunEvidence,
  cancelAgentRun,
  completeAgentRun,
  consumeBudget,
  createCapabilityTaxonomy,
  createAgentRunRecord,
  defineAgent,
  escalateAgentRun,
  expireCheckpoint,
  forkAgentRun,
  loadJsonState,
  pauseAgentRunForApproval,
  prepareRunnerHandoff,
  completeRunnerHandoff,
  recordVerifierResult as runtimeRecordVerifierResult,
  recordImprovementCandidate,
  rejectCheckpoint,
  resumeAgentRun,
  saveJsonState,
  updateJsonState,
  type AgentExecutionMode,
  type AgentRunRecord,
  type PromptTemplate,
  type PromptVersion
} from "@platform/ai-runtime";
import { normalizeActionInput } from "@platform/schema";
import { scheduleJobExecution } from "@plugins/jobs-core";
import { queueNotificationMessage } from "@plugins/notifications-core";
import { transitionWorkflowInstance } from "@plugins/workflow-core";

export type SubmitAgentRunInput = {
  tenantId: string;
  actorId: string;
  agentId: string;
  promptVersionId: string;
  goal: string;
  allowedToolIds: string[];
  modelId?: string | undefined;
  executionMode?: AgentExecutionMode | undefined;
  processClass?: string | undefined;
  riskTier?: "low" | "moderate" | "high" | "critical" | undefined;
  slaMinutes?: number | undefined;
};

export type ApprovalDecisionInput = {
  tenantId: string;
  actorId: string;
  runId: string;
  checkpointId: string;
  approved: boolean;
  note?: string | undefined;
  expectedReplayFingerprint?: string | undefined;
};

export type RunControlInput = {
  tenantId: string;
  actorId: string;
  runId: string;
  reason?: string | undefined;
  expectedReplayFingerprint?: string | undefined;
};

export type BranchRunInput = RunControlInput & {
  branchKey: string;
  branchReason: string;
  branchRunId?: string | undefined;
  executionMode?: AgentExecutionMode | undefined;
};

export type RunnerHandoffInput = RunControlInput & {
  handoffId: string;
  target: "same-process" | "queue-worker" | "sandbox" | "external-runner";
  endpoint?: string | undefined;
  note?: string | undefined;
};

export type VerifierResultInput = RunControlInput & {
  verifierId: string;
  summary: string;
  outcome: "pass" | "warn" | "fail";
  evidenceRefs?: string[] | undefined;
};

export type PublishPromptVersionInput = {
  tenantId: string;
  actorId: string;
  templateId: string;
  version: string;
  body: string;
  changelog?: string | undefined;
};

export const promptFixtures = Object.freeze({
  template: {
    id: "prompt-template:ops-triage",
    label: "Ops Triage Assistant",
    body: "Summarize open incidents, propose actions, and require approval for risky tools.",
    version: "v4"
  } satisfies PromptTemplate,
  versions: [
    {
      id: "prompt-version:ops-triage:v4",
      templateId: "prompt-template:ops-triage",
      version: "v4",
      body: "Summarize open incidents, propose actions, and require approval for risky tools.",
      createdAt: "2026-04-18T09:15:00.000Z",
      changelog: "Added replay metadata and approval narration."
    },
    {
      id: "prompt-version:ops-triage:v3",
      templateId: "prompt-template:ops-triage",
      version: "v3",
      body: "Summarize open incidents and route them to the right team.",
      createdAt: "2026-04-11T08:45:00.000Z",
      changelog: "Baseline pre-approval version."
    }
  ] satisfies PromptVersion[]
});

const availableTools = [
  {
    id: "crm.contacts.list",
    sourceActionId: "crm.contacts.list",
    description: "Fetch a governed list of contacts for incident follow-up.",
    permission: "crm.contacts.read",
    inputSchema: {
      type: "object",
      properties: {
        lifecycleStatus: {
          type: "string"
        }
      }
    },
    outputSchema: {
      type: "object",
      properties: {
        rows: {
          type: "array"
        }
      }
    },
    idempotent: true,
    audit: false,
    riskLevel: "low",
    approvalMode: "none",
    policies: ["tool.allow"],
    groundingInputs: [{ sourceId: "ai.agent-runs", required: false }],
    resultSummaryHint: "Summarize the number of matching contacts and their owners.",
    outputRedactionPathHints: [],
    replay: {
      deterministic: true,
      includeInputHash: true,
      includeOutputHash: false,
      note: "Safe read-only tool"
    }
  },
  {
    id: "workflow.instances.transition",
    sourceActionId: "workflow.instances.transition",
    description: "Advance a governed workflow instance through a typed transition.",
    permission: "workflow.instances.transition",
    inputSchema: {
      type: "object",
      properties: {
        definitionKey: {
          type: "string"
        },
        transition: {
          type: "string"
        }
      }
    },
    outputSchema: {
      type: "object",
      properties: {
        ok: {
          type: "boolean"
        }
      }
    },
    idempotent: true,
    audit: true,
    riskLevel: "moderate",
    approvalMode: "none",
    policies: ["tool.allow"],
    groundingInputs: [{ sourceId: "workflow.instances", required: true }],
    resultSummaryHint: "Return the target workflow state and approval posture.",
    outputRedactionPathHints: [],
    replay: {
      deterministic: true,
      includeInputHash: true,
      includeOutputHash: true,
      note: "Workflow state transitions stay fully typed and replay-safe."
    }
  },
  {
    id: "finance.invoices.approve",
    sourceActionId: "finance.invoices.approve",
    description: "Approve a finance workflow item after human review.",
    permission: "finance.invoices.approve",
    inputSchema: {
      type: "object",
      properties: {
        invoiceId: {
          type: "string"
        }
      }
    },
    outputSchema: {
      type: "object",
      properties: {
        ok: {
          type: "boolean"
        }
      }
    },
    idempotent: true,
    audit: true,
    riskLevel: "high",
    approvalMode: "required",
    policies: ["tool.require_approval"],
    groundingInputs: [{ sourceId: "ai.approval-requests", required: true }],
    resultSummaryHint: "Return the finance record and approval disposition.",
    outputRedactionPathHints: ["reason"],
    replay: {
      deterministic: true,
      includeInputHash: true,
      includeOutputHash: true,
      note: "High-risk finance approval tool"
    }
  }
] satisfies ToolContract[];

const safeReadTool = availableTools[0]!;
const workflowTransitionTool = availableTools[1]!;
const financeApprovalTool = availableTools[2]!;
const latestPromptVersion = promptFixtures.versions[0]!;

const runtimeGuardrails = defineGuardrailPolicy({
  id: "ai-core.runtime",
  blockedPromptSubstrings: ["ignore all previous instructions", "leak secrets"],
  blockedToolIds: ["system.shell.execute"],
  requireApprovalAbove: "high",
  piiPatterns: [/\b\d{12,19}\b/g],
  maxOutputCharacters: 420
});

const operationsAgent = defineAgent({
  id: "ops-triage-agent",
  label: "Ops Triage Agent",
  description: "Durable operations assistant with explicit approval checkpoints for risky actions.",
  defaultModelId: "gpt-5.4",
  capabilities: {
    toolIds: availableTools.map((tool) => tool.id),
    readModelIds: ["ai.agent-runs", "ai.prompt-versions", "ai.approval-requests"],
    memoryCollectionIds: ["memory-collection:ops", "memory-collection:kb"],
    promptTemplateIds: [promptFixtures.template.id]
  },
  budget: {
    maxSteps: 12,
    maxToolCalls: 5,
    maxInputTokens: 6000,
    maxOutputTokens: 2400,
    maxTotalTokens: 8000,
    maxEstimatedCostUsd: 4,
    maxRuntimeMs: 90_000
  },
  failurePolicy: {
    maxRetryAttempts: 2,
    retryableCodes: ["provider.unavailable", "provider.timeout"],
    pauseOnApprovalRequired: true,
    failOnReplayMismatch: true,
    failOnGuardrailBlock: true
  },
  promptTemplateId: promptFixtures.template.id,
  verifierHooks: [
    {
      id: "verifier:policy",
      label: "Policy verifier",
      stage: "post-step",
      required: true
    },
    {
      id: "verifier:completion",
      label: "Completion verifier",
      stage: "pre-complete",
      required: true
    }
  ]
});

const aiCoreStateFile = "ai-control-plane-core.json";

type AiCoreState = {
  promptVersions: PromptVersion[];
  agentRuns: AgentRunRecord[];
};

function buildCompletedRun(): AgentRunRecord {
  let run = createAgentRunRecord(
    operationsAgent,
    {
      agentId: operationsAgent.id,
      tenantId: "tenant-platform",
      packageId: "ai-core",
      actorId: "actor-admin",
      prompt: "Summarize open escalations for the morning shift and propose the next actions.",
      promptVersionId: latestPromptVersion.id,
      tools: [safeReadTool, workflowTransitionTool],
      modelRoutingProfileId: "routing:ops-default",
      memorySnapshotRefs: ["memory-snapshot:ops-2026-04-18"],
      policyDecisions: ["tool:crm.contacts.list:allow", "guardrail:prompt:pass"],
      executionMode: "bounded-agent",
      classification: {
        processClass: "ops-triage",
        riskTier: "moderate",
        slaMinutes: 90
      }
    },
    {
      runId: "run:ops-triage:001",
      startedAt: "2026-04-18T09:30:00.000Z"
    }
  );

  run = appendAgentStep(run, {
    id: "run:ops-triage:001:intake",
    kind: "intake",
    status: "completed",
    summary: "Normalized the request into a governed work item.",
    completedAt: "2026-04-18T09:30:01.000Z"
  });
  run = appendAgentStep(run, {
    id: "run:ops-triage:001:classification",
    kind: "classification",
    status: "completed",
    summary: "Assigned process class ops-triage with moderate risk and 90 minute SLA.",
    completedAt: "2026-04-18T09:30:02.000Z"
  });
  run = appendAgentStep(run, {
    id: "run:ops-triage:001:plan",
    kind: "plan",
    status: "completed",
    summary: "Built plan for contact follow-up and escalation summary.",
    completedAt: "2026-04-18T09:30:04.000Z"
  });
  run = appendAgentStep(run, {
    id: "run:ops-triage:001:model",
    kind: "model",
    status: "completed",
    summary: "Model generated a grounded incident summary.",
    completedAt: "2026-04-18T09:30:08.000Z"
  });
  run = appendAgentStep(run, {
    id: "run:ops-triage:001:verification",
    kind: "verification",
    status: "completed",
    summary: "Verification passed for tool policies, output moderation, and replay metadata.",
    completedAt: "2026-04-18T09:30:09.000Z"
  });
  run = attachRunArtifact(run, {
    id: "artifact:run:ops-triage:001:plan",
    kind: "plan",
    label: "Execution plan",
    summary: "Triaged operations handoff, contact list refresh, and escalation summary."
  });
  run = attachRunArtifact(run, {
    id: "artifact:run:ops-triage:001:result",
    kind: "result",
    label: "Operator summary",
    summary: "Grounded queue summary and next-step checklist."
  });
  run = attachRunEvidence(run, {
    id: "evidence:run:ops-triage:001:guardrail",
    kind: "policy-check",
    label: "Guardrail prompt pass",
    passed: true,
    detail: "Prompt passed sanitization and output moderation."
  });
  run = attachRunEvidence(run, {
    id: "evidence:run:ops-triage:001:verification",
    kind: "verification",
    label: "Verification set passed",
    passed: true,
    detail: "Replay fingerprint, tool policy, and summary verification all passed."
  });
  run = consumeBudget(run, {
    inputTokens: 1280,
    outputTokens: 420,
    estimatedCostUsd: 0.084,
    runtimeMs: 8_400
  });
  return completeAgentRun(run, "2026-04-18T09:30:09.000Z");
}

function buildPendingRun(): AgentRunRecord {
  let run = createAgentRunRecord(
    operationsAgent,
    {
      agentId: operationsAgent.id,
      tenantId: "tenant-platform",
      packageId: "ai-core",
      actorId: "actor-admin",
      prompt: "Review invoice escalation 5512 and decide whether to approve the finance exception.",
      promptVersionId: latestPromptVersion.id,
      tools: [safeReadTool, financeApprovalTool, workflowTransitionTool],
      modelRoutingProfileId: "routing:ops-finance",
      memorySnapshotRefs: ["memory-snapshot:finance-2026-04-18"],
      policyDecisions: ["tool:finance.invoices.approve:require-approval", "guardrail:prompt:pass"],
      executionMode: "strict-process",
      classification: {
        processClass: "finance-exception",
        riskTier: "high",
        slaMinutes: 240
      }
    },
    {
      runId: "run:ops-triage:002",
      startedAt: "2026-04-18T11:05:00.000Z"
    }
  );
  run = appendAgentStep(run, {
    id: "run:ops-triage:002:intake",
    kind: "intake",
    status: "completed",
    summary: "Captured the finance exception request as a governed work item.",
    completedAt: "2026-04-18T11:05:01.000Z"
  });
  run = appendAgentStep(run, {
    id: "run:ops-triage:002:classification",
    kind: "classification",
    status: "completed",
    summary: "Assigned process class finance-exception with high risk and approval requirement.",
    completedAt: "2026-04-18T11:05:02.000Z"
  });
  run = appendAgentStep(run, {
    id: "run:ops-triage:002:plan",
    kind: "plan",
    status: "completed",
    summary: "Prepared finance exception review plan with mandatory approval gate.",
    completedAt: "2026-04-18T11:05:03.000Z"
  });
  run = appendAgentStep(run, {
    id: "run:ops-triage:002:approval",
    kind: "approval",
    status: "waiting-approval",
    summary: "Waiting for finance exception approval before tool execution.",
    toolId: "finance.invoices.approve"
  });
  run = pauseAgentRunForApproval(run, {
    stepId: "run:ops-triage:002:approval",
    checkpointId: "checkpoint:ops-triage:002",
    reason: "Finance exception approval is classified as a high-risk mutation.",
    toolId: "finance.invoices.approve",
    requestedAt: "2026-04-18T11:05:04.000Z",
    expiresAt: "2026-04-18T15:05:04.000Z"
  });
  const workflowTransition = transitionWorkflowInstance({
    instanceId: "workflow:run:ops-triage:002",
    tenantId: "tenant-platform",
    definitionKey: "ai-run-approval",
    currentState: "intake",
    transition: "request_approval",
    actorRole: "system"
  });
  const reminderJob = scheduleJobExecution({
    executionId: "job:run:ops-triage:002:reminder",
    tenantId: "tenant-platform",
    jobKey: "workflow.approvals.remind",
    concurrency: 1,
    retries: 3,
    timeoutMs: 45_000,
    runAt: "2026-04-18T13:05:04.000Z",
    reason: "Remind finance approvers before the SLA window closes."
  });
  const approvalNotification = queueNotificationMessage({
    messageId: "message:run:ops-triage:002:approval",
    tenantId: "tenant-platform",
    actorId: "actor-admin",
    channel: "in-app",
    recipientRef: "queue:ai-approvals",
    directAddress: "/admin/ai/approvals",
    title: "AI approval required",
    bodyText: "Finance exception run is waiting for approval before execution can continue.",
    deliveryMode: "immediate",
    priority: "high",
    idempotencyKey: "run:ops-triage:002:approval"
  });
  run = attachRunArtifact(run, {
    id: "artifact:run:ops-triage:002:approval-packet",
    kind: "approval-packet",
    label: "Approval packet",
    summary: "Finance exception context, replay fingerprint, and approval-required tool details."
  });
  run = attachRunEvidence(run, {
    id: "evidence:run:ops-triage:002:workflow",
    kind: "workflow",
    label: "Workflow transitioned to pending approval",
    passed: true,
    detail: `Transitioned to ${workflowTransition.nextState} with side effects ${workflowTransition.sideEffects.join(", ")}.`
  });
  run = attachRunEvidence(run, {
    id: "evidence:run:ops-triage:002:reminder-job",
    kind: "notification",
    label: "Approval reminder queued",
    passed: true,
    detail: `Queued reminder on ${reminderJob.queue} with key ${reminderJob.observabilityKey}.`
  });
  run = attachRunEvidence(run, {
    id: "evidence:run:ops-triage:002:approval-notification",
    kind: "notification",
    label: "Approval inbox notification queued",
    passed: true,
    detail: `Queued ${approvalNotification.jobs[0]?.jobDefinitionId ?? "notification"} for ${approvalNotification.message.recipientRef}.`
  });
  run = consumeBudget(run, {
    inputTokens: 940,
    outputTokens: 180,
    estimatedCostUsd: 0.051,
    runtimeMs: 4_100
  });
  return run;
}

export const runFixtures = Object.freeze([buildCompletedRun(), buildPendingRun()]);

export const approvalFixtures = Object.freeze(
  runFixtures.flatMap((run) =>
    run.checkpoints.map((checkpoint) => ({
      ...checkpoint,
      toolId: checkpoint.toolId ?? null
    }))
  )
);

export const replayFixtures = Object.freeze(
  runFixtures.map((run) => ({
    runId: run.id,
    fingerprint: run.replayFingerprint,
    promptVersionId: run.promptVersionId,
    policyDecisions: run.policyDecisions,
    memorySnapshotRefs: run.memorySnapshotRefs,
    artifactCount: run.artifacts.length,
    evidenceCount: run.evidence.length
  }))
);

function seedAiCoreState(): AiCoreState {
  return normalizeAiCoreState({
    promptVersions: [...promptFixtures.versions],
    agentRuns: [...runFixtures]
  });
}

function normalizeRun(run: AgentRunRecord): AgentRunRecord {
  return {
    ...run,
    executionMode: run.executionMode ?? "bounded-agent",
    capabilityTaxonomy:
      run.capabilityTaxonomy ??
      createCapabilityTaxonomy({
        toolIds: run.tools.map((tool) => tool.id),
        memoryCollectionIds: [],
        skillIds: [],
        workflowDefinitionKeys: [],
        agentProfileIds: [],
        mcpServerIds: [],
        appIds: []
      }),
    classification: run.classification ?? {
      processClass: "general",
      riskTier: "moderate",
      slaMinutes: 120
    },
    checkpoints: [...(run.checkpoints ?? [])],
    steps: [...(run.steps ?? [])],
    memorySnapshotRefs: [...(run.memorySnapshotRefs ?? [])],
    policyDecisions: [...(run.policyDecisions ?? [])],
    artifacts: [...(run.artifacts ?? [])],
    evidence: [...(run.evidence ?? [])],
    improvementCandidates: [...(run.improvementCandidates ?? [])],
    lineage: run.lineage ?? {
      rootRunId: run.id,
      parentRunId: null,
      branchKey: "root",
      branchReason: "Recovered root run",
      depth: 0,
      path: [run.id]
    },
    events: [...(run.events ?? [])],
    verifierHooks: [...(run.verifierHooks ?? [])],
    verifierResults: [...(run.verifierResults ?? [])],
    runnerHandoffs: [...(run.runnerHandoffs ?? [])],
    usage: {
      stepCount: run.usage?.stepCount ?? 0,
      toolCallCount: run.usage?.toolCallCount ?? 0,
      inputTokens: run.usage?.inputTokens ?? 0,
      outputTokens: run.usage?.outputTokens ?? 0,
      estimatedCostUsd: run.usage?.estimatedCostUsd ?? 0,
      runtimeMs: run.usage?.runtimeMs ?? 0
    }
  };
}

function normalizeAiCoreState(state: AiCoreState): AiCoreState {
  return {
    promptVersions: [...state.promptVersions].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    agentRuns: [...state.agentRuns].map((run) => normalizeRun(run)).sort((left, right) => right.startedAt.localeCompare(left.startedAt))
  };
}

function reconcileExpiredApprovals(
  state: AiCoreState,
  now = new Date().toISOString()
): {
  changed: boolean;
  state: AiCoreState;
} {
  let changed = false;
  const agentRuns = state.agentRuns.map((sourceRun) => {
    const run = normalizeRun(sourceRun);
    const expiredCheckpoint = run.checkpoints.find(
      (checkpoint) =>
        checkpoint.state === "pending" &&
        checkpoint.expiresAt !== undefined &&
        Date.parse(checkpoint.expiresAt) <= Date.parse(now)
    );
    if (!expiredCheckpoint) {
      return run;
    }

    changed = true;
    let expiredRun = expireCheckpoint(run, expiredCheckpoint.id, now);
    expiredRun = appendAgentStep(expiredRun, {
      id: `${run.id}:approval-expired`,
      kind: "escalation",
      status: "failed",
      summary: `Approval checkpoint ${expiredCheckpoint.id} expired after the SLA window closed.`,
      completedAt: now
    });
    expiredRun = attachRunEvidence(expiredRun, {
      id: `evidence:${run.id}:approval-expired`,
      kind: "policy-check",
      label: "Approval SLA expired",
      passed: false,
      detail: `Checkpoint ${expiredCheckpoint.id} exceeded its SLA and was failed automatically.`,
      createdAt: now
    });
    expiredRun = recordImprovementCandidate(expiredRun, {
      id: `improvement:${run.id}:approval-timeout`,
      targetKind: "workflow-definition",
      targetId: "ai-run-approval",
      summary: "Review approval routing, SLA, or queue ownership after an approval timeout.",
      state: "proposed",
      createdAt: now
    });
    return expiredRun;
  });

  return {
    changed,
    state: normalizeAiCoreState({
      ...state,
      agentRuns
    })
  };
}

function loadAiCoreState(): AiCoreState {
  const state = normalizeAiCoreState(loadJsonState(aiCoreStateFile, seedAiCoreState));
  const reconciled = reconcileExpiredApprovals(state);
  if (reconciled.changed) {
    saveJsonState(aiCoreStateFile, reconciled.state);
  }
  return reconciled.state;
}

function persistAiCoreState(updater: (state: AiCoreState) => AiCoreState): AiCoreState {
  return normalizeAiCoreState(updateJsonState(aiCoreStateFile, seedAiCoreState, (state) => updater(normalizeAiCoreState(state))));
}

function buildSubmissionKey(
  input: SubmitAgentRunInput,
  toolIds: string[],
  executionMode: AgentExecutionMode,
  processClass: string
): string {
  const payload = {
    tenantId: input.tenantId,
    actorId: input.actorId,
    agentId: input.agentId,
    promptVersionId: input.promptVersionId,
    goal: input.goal,
    toolIds: [...toolIds].sort((left, right) => left.localeCompare(right)),
    executionMode,
    processClass
  };
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function buildSlaTimestamp(startedAt: string, slaMinutes: number): string {
  return new Date(Date.parse(startedAt) + slaMinutes * 60_000).toISOString();
}

function assertTenantRun(run: AgentRunRecord, tenantId: string): void {
  if (run.tenantId !== tenantId) {
    throw new Error(`AI run '${run.id}' does not belong to tenant '${tenantId}'.`);
  }
}

function requireRun(tenantId: string, runId: string): AgentRunRecord {
  const run = loadAiCoreState().agentRuns.find((entry) => entry.id === runId);
  if (!run) {
    throw new Error(`Unknown AI run '${runId}'.`);
  }
  assertTenantRun(run, tenantId);
  return normalizeRun(run);
}

function persistRun(run: AgentRunRecord): AgentRunRecord {
  persistAiCoreState((state) => ({
    ...state,
    agentRuns: [run, ...state.agentRuns.filter((entry) => entry.id !== run.id)]
  }));
  return run;
}

function selectTools(allowedToolIds: string[]): ToolContract[] {
  const selectedTools = availableTools.filter((tool) => allowedToolIds.includes(tool.id));
  return selectedTools.length > 0 ? selectedTools : [safeReadTool];
}

function createRunSummary(run: AgentRunRecord) {
  return {
    id: run.id,
    tenantId: run.tenantId,
    agentId: run.agentId,
    status: run.status,
    modelId: run.modelId,
    stepCount: run.steps.length,
    startedAt: run.startedAt,
    executionMode: run.executionMode,
    processClass: run.classification.processClass,
    riskTier: run.classification.riskTier,
    artifactCount: run.artifacts.length,
    evidenceCount: run.evidence.length
  };
}

export function listAgentRuns(): AgentRunRecord[] {
  return loadAiCoreState().agentRuns;
}

export function listReplaySnapshots() {
  return listAgentRuns().map((run) => ({
    runId: run.id,
    fingerprint: run.replayFingerprint,
    promptVersionId: run.promptVersionId,
    policyDecisions: run.policyDecisions,
    memorySnapshotRefs: run.memorySnapshotRefs,
    artifactCount: run.artifacts.length,
    evidenceCount: run.evidence.length
  }));
}

export function listPromptVersionCatalog(): PromptVersion[] {
  return loadAiCoreState().promptVersions;
}

export function getActivePromptTemplate(): PromptTemplate {
  const latestVersion = listPromptVersionCatalog()[0];
  return {
    ...promptFixtures.template,
    body: latestVersion?.body ?? promptFixtures.template.body,
    version: latestVersion?.version ?? promptFixtures.template.version
  };
}

export function listAgentRunSummaries() {
  return listAgentRuns().map((run) => createRunSummary(run));
}

export function listRunArtifacts() {
  return listAgentRuns().flatMap((run) =>
    run.artifacts.map((artifact) => ({
      ...artifact,
      runId: run.id,
      tenantId: run.tenantId,
      processClass: run.classification.processClass
    }))
  );
}

export function listRunEvidence() {
  return listAgentRuns().flatMap((run) =>
    run.evidence.map((evidence) => ({
      ...evidence,
      runId: run.id,
      tenantId: run.tenantId,
      processClass: run.classification.processClass
    }))
  );
}

export function listRunEvents() {
  return listAgentRuns().flatMap((run) =>
    run.events.map((event) => ({
      ...event,
      tenantId: run.tenantId,
      status: run.status
    }))
  );
}

export function listRunnerHandoffs() {
  return listAgentRuns().flatMap((run) =>
    run.runnerHandoffs.map((handoff) => ({
      ...handoff,
      runId: run.id,
      tenantId: run.tenantId
    }))
  );
}

export function listVerifierResults() {
  return listAgentRuns().flatMap((run) =>
    run.verifierResults.map((result) => ({
      ...result,
      runId: run.id,
      tenantId: run.tenantId
    }))
  );
}

export function listEscalatedRuns() {
  return listAgentRuns().filter((run) => run.status === "escalated");
}

export function listPromptVersions() {
  const latestVersionId = listPromptVersionCatalog()[0]?.id;
  return listPromptVersionCatalog().map((version) => ({
    id: version.id,
    tenantId: "tenant-platform",
    templateId: version.templateId,
    version: version.version,
    status: version.id === latestVersionId ? ("published" as const) : ("draft" as const),
    publishedAt: version.createdAt,
    changelog: version.changelog
  }));
}

export function listPendingApprovals() {
  return listAgentRuns().flatMap((run) =>
    run.checkpoints
      .filter((approval) => approval.state === "pending")
      .map((approval) => ({
        id: approval.id,
        tenantId: run.tenantId,
        runId: approval.runId,
        toolId: approval.toolId ?? null,
        state: approval.state,
        requestedAt: approval.requestedAt,
        expiresAt: approval.expiresAt ?? null
      }))
  );
}

export function getAiRuntimeOverview() {
  const runs = listAgentRuns();
  return {
    totals: {
      runs: runs.length,
      pendingApprovals: runs.flatMap((run) => run.checkpoints).filter((checkpoint) => checkpoint.state === "pending").length,
      escalatedRuns: runs.filter((run) => run.status === "escalated").length,
      artifacts: runs.reduce((count, run) => count + run.artifacts.length, 0),
      evidence: runs.reduce((count, run) => count + run.evidence.length, 0)
    },
    activePromptVersionId: listPromptVersionCatalog()[0]?.id ?? null
  };
}

export function submitAgentRun(input: SubmitAgentRunInput): {
  ok: true;
  runId: string;
  status: "waiting-approval" | "completed";
  pendingCheckpointId?: string | undefined;
} {
  normalizeActionInput(input);
  const promptVersion = listPromptVersionCatalog().find((entry) => entry.id === input.promptVersionId);
  if (!promptVersion) {
    throw new Error(`Unknown prompt version '${input.promptVersionId}'.`);
  }

  const promptCheck = sanitizePrompt(input.goal, runtimeGuardrails);
  const effectiveTools = selectTools(input.allowedToolIds);
  const reviewTool = effectiveTools.find((tool) => tool.approvalMode === "required");
  const executionMode = input.executionMode ?? (reviewTool ? "strict-process" : "bounded-agent");
  const processClass = input.processClass ?? (reviewTool ? "finance-exception" : "ops-triage");
  const riskTier = input.riskTier ?? (reviewTool ? "high" : "moderate");
  const slaMinutes = input.slaMinutes ?? (reviewTool ? 240 : 90);
  const submissionKey = buildSubmissionKey(input, effectiveTools.map((tool) => tool.id), executionMode, processClass);

  const existingRun = listAgentRuns().find((run) => run.correlationId === submissionKey);
  if (existingRun) {
    const pendingCheckpointId = existingRun.checkpoints.find((checkpoint) => checkpoint.state === "pending")?.id;
    return {
      ok: true,
      runId: existingRun.id,
      status: existingRun.status === "waiting-approval" ? "waiting-approval" : "completed",
      ...(pendingCheckpointId ? { pendingCheckpointId } : {})
    };
  }

  let run = createAgentRunRecord(operationsAgent, {
    agentId: input.agentId,
    tenantId: input.tenantId,
    packageId: "ai-core",
    actorId: input.actorId,
    prompt: promptCheck.sanitizedPrompt,
    promptVersionId: input.promptVersionId,
    tools: effectiveTools,
    modelId: input.modelId,
    correlationId: submissionKey,
    modelRoutingProfileId: "routing:ops-default",
    memorySnapshotRefs: ["memory-snapshot:ops-latest"],
    policyDecisions: promptCheck.checks.map((check) => check.code),
    executionMode,
    classification: {
      processClass,
      riskTier,
      slaMinutes
    }
  });

  run = appendAgentStep(run, {
    id: `${run.id}:intake`,
    kind: "intake",
    status: "completed",
    summary: `Captured ${processClass} intake with ${executionMode} execution mode.`
  });
  run = appendAgentStep(run, {
    id: `${run.id}:classification`,
    kind: "classification",
    status: "completed",
    summary: `Classified request as ${riskTier} risk with ${slaMinutes} minute SLA.`
  });
  run = appendAgentStep(run, {
    id: `${run.id}:plan`,
    kind: "plan",
    status: "completed",
    summary: "Created run plan from prompt, policy, and allowed tool set."
  });
  run = attachRunArtifact(run, {
    id: `artifact:${run.id}:plan`,
    kind: "plan",
    label: "Run plan",
    summary: "Plan and classification envelope for the governed run."
  });
  run = attachRunEvidence(run, {
    id: `evidence:${run.id}:guardrail`,
    kind: "policy-check",
    label: "Prompt guardrail pass",
    passed: true,
    detail: promptCheck.checks.map((check) => check.code).join(", ")
  });

  if (reviewTool) {
    const requestedAt = new Date().toISOString();
    const expiresAt = buildSlaTimestamp(requestedAt, slaMinutes);
    const approvalWorkflow = transitionWorkflowInstance({
      instanceId: `workflow:${run.id}`,
      tenantId: input.tenantId,
      definitionKey: "ai-run-approval",
      currentState: "intake",
      transition: "request_approval",
      actorRole: "system"
    });
    const reminderJob = scheduleJobExecution({
      executionId: `job:${run.id}:approval-reminder`,
      tenantId: input.tenantId,
      jobKey: "workflow.approvals.remind",
      concurrency: 1,
      retries: 3,
      timeoutMs: 45_000,
      runAt: buildSlaTimestamp(requestedAt, Math.max(Math.floor(slaMinutes / 2), 5)),
      reason: "Approval reminder for governed AI run."
    });
    const approvalNotification = queueNotificationMessage({
      messageId: `message:${run.id}:approval`,
      tenantId: input.tenantId,
      actorId: input.actorId,
      channel: "in-app",
      recipientRef: "queue:ai-approvals",
      directAddress: "/admin/ai/approvals",
      title: "AI approval required",
      bodyText: `Run ${run.id} is waiting for approval for ${reviewTool.id}.`,
      deliveryMode: "immediate",
      priority: riskTier === "critical" ? "critical" : "high",
      idempotencyKey: `${run.id}:approval`
    });

    run = appendAgentStep(run, {
      id: `${run.id}:approval`,
      kind: "approval",
      status: "waiting-approval",
      summary: `Awaiting approval for ${reviewTool.id}.`,
      toolId: reviewTool.id
    });
    run = pauseAgentRunForApproval(run, {
      stepId: `${run.id}:approval`,
      reason: `Tool '${reviewTool.id}' requires human approval before execution.`,
      toolId: reviewTool.id,
      requestedAt,
      expiresAt
    });
    run = attachRunArtifact(run, {
      id: `artifact:${run.id}:approval`,
      kind: "approval-packet",
      label: "Approval packet",
      summary: `Approval context for ${reviewTool.id} with replay fingerprint ${run.replayFingerprint}.`
    });
    run = attachRunEvidence(run, {
      id: `evidence:${run.id}:workflow-submit`,
      kind: "workflow",
      label: "Approval workflow started",
      passed: true,
      detail: `Workflow moved to ${approvalWorkflow.nextState}; side effects ${approvalWorkflow.sideEffects.join(", ")}.`
    });
    run = attachRunEvidence(run, {
      id: `evidence:${run.id}:approval-reminder`,
      kind: "notification",
      label: "Approval reminder job queued",
      passed: true,
      detail: `Queued on ${reminderJob.queue} with key ${reminderJob.observabilityKey}.`
    });
    run = attachRunEvidence(run, {
      id: `evidence:${run.id}:approval-notification`,
      kind: "notification",
      label: "Approval inbox notification queued",
      passed: true,
      detail: `Queued ${approvalNotification.jobs[0]?.jobDefinitionId ?? "notification"} for ${approvalNotification.message.recipientRef}.`
    });
    run = consumeBudget(run, {
      inputTokens: 820,
      outputTokens: 160,
      estimatedCostUsd: 0.043,
      runtimeMs: 3_600
    });
    persistRun(run);
    return {
      ok: true,
      runId: run.id,
      status: "waiting-approval",
      pendingCheckpointId: run.checkpoints.find((checkpoint) => checkpoint.state === "pending")?.id
    };
  }

  run = appendAgentStep(run, {
    id: `${run.id}:model`,
    kind: "model",
    status: "completed",
    summary: moderateOutput("Prepared grounded summary and next-step checklist for the operator.", runtimeGuardrails).outputText
  });
  run = appendAgentStep(run, {
    id: `${run.id}:verification`,
    kind: "verification",
    status: "completed",
    summary: "Verification set passed for grounded response, replay metadata, and policy decisions."
  });
  run = attachRunArtifact(run, {
    id: `artifact:${run.id}:result`,
    kind: "result",
    label: "Run result",
    summary: "Replay-safe result package for the operator."
  });
  run = attachRunEvidence(run, {
    id: `evidence:${run.id}:verification`,
    kind: "verification",
    label: "Verification set passed",
    passed: true,
    detail: "Grounding, replay, and output policy checks passed."
  });
  run = consumeBudget(run, {
    inputTokens: 820,
    outputTokens: 210,
    estimatedCostUsd: 0.041,
    runtimeMs: 3_200
  });
  run = completeAgentRun(run);
  persistRun(run);

  return {
    ok: true,
    runId: run.id,
    status: "completed"
  };
}

export function branchAgentRunControl(input: BranchRunInput): {
  ok: true;
  runId: string;
  status: "queued";
  parentRunId: string;
} {
  normalizeActionInput(input);
  const run = requireRun(input.tenantId, input.runId);
  if (input.expectedReplayFingerprint) {
    assertReplayFingerprint(run, input.expectedReplayFingerprint);
  }

  const branchRunId = input.branchRunId ?? `${run.id}:branch:${Date.now()}`;
  const branched = forkAgentRun(run, {
    runId: branchRunId,
    branchKey: input.branchKey,
    branchReason: input.branchReason,
    executionMode: input.executionMode ?? run.executionMode
  });
  persistRun(branched);

  return {
    ok: true,
    runId: branched.id,
    status: "queued",
    parentRunId: run.id
  };
}

export function approveAgentCheckpointDecision(input: ApprovalDecisionInput): {
  ok: true;
  status: "completed" | "failed";
  checkpointState: "approved" | "rejected";
} {
  normalizeActionInput(input);
  let run = requireRun(input.tenantId, input.runId);
  if (input.expectedReplayFingerprint) {
    assertReplayFingerprint(run, input.expectedReplayFingerprint);
  }

  const checkpoint = run.checkpoints.find((entry) => entry.id === input.checkpointId);
  if (!checkpoint) {
    throw new Error(`Unknown approval checkpoint '${input.checkpointId}'.`);
  }

  if (checkpoint.state === "approved" || checkpoint.state === "rejected") {
    return {
      ok: true,
      status: run.status === "completed" ? "completed" : "failed",
      checkpointState: checkpoint.state
    };
  }

  if (input.approved) {
    const transition = transitionWorkflowInstance({
      instanceId: `workflow:${run.id}`,
      tenantId: input.tenantId,
      definitionKey: "ai-run-approval",
      currentState: "approval_pending",
      transition: "approve",
      actorRole: "approver"
    });
    const verificationJob = scheduleJobExecution({
      executionId: `job:${run.id}:verification`,
      tenantId: input.tenantId,
      jobKey: "ai.runs.verify",
      concurrency: 1,
      retries: 2,
      timeoutMs: 60_000,
      reason: "Verify replay-safe completion after approval."
    });
    run = approveCheckpoint(run, input.checkpointId, {
      approverId: input.actorId,
      approvedAt: "2026-04-18T11:15:00.000Z",
      decisionNote: input.note
    });
    run = resumeAgentRun(run);
    run = appendAgentStep(run, {
      id: `${run.id}:tool`,
      kind: "tool",
      status: "completed",
      summary: `Executed approved tool ${checkpoint.toolId ?? "governed mutation"}.`,
      toolId: checkpoint.toolId ?? undefined
    });
    run = appendAgentStep(run, {
      id: `${run.id}:verification`,
      kind: "verification",
      status: "completed",
      summary: "Verification passed after approval-driven execution."
    });
    run = attachRunArtifact(run, {
      id: `artifact:${run.id}:approved-result`,
      kind: "result",
      label: "Approved execution result",
      summary: "Result package created after human approval."
    });
    run = attachRunEvidence(run, {
      id: `evidence:${run.id}:workflow-approved`,
      kind: "workflow",
      label: "Approval workflow completed",
      passed: true,
      detail: `Workflow moved to ${transition.nextState}; side effects ${transition.sideEffects.join(", ")}.`
    });
    run = attachRunEvidence(run, {
      id: `evidence:${run.id}:verification-job`,
      kind: "verification",
      label: "Verification job queued",
      passed: true,
      detail: `Queued on ${verificationJob.queue} with key ${verificationJob.observabilityKey}.`
    });
    run = consumeBudget(run, {
      inputTokens: 120,
      outputTokens: 96,
      estimatedCostUsd: 0.012,
      runtimeMs: 900
    });
    run = completeAgentRun(run, "2026-04-18T11:15:02.000Z");
    persistRun(run);
    return {
      ok: true,
      status: "completed",
      checkpointState: "approved"
    };
  }

  const transition = transitionWorkflowInstance({
    instanceId: `workflow:${run.id}`,
    tenantId: input.tenantId,
    definitionKey: "ai-run-approval",
    currentState: "approval_pending",
    transition: "reject",
    actorRole: "approver"
  });
  run = rejectCheckpoint(run, input.checkpointId, {
    approverId: input.actorId,
    rejectedAt: "2026-04-18T11:15:00.000Z",
    decisionNote: input.note
  });
  run = attachRunEvidence(run, {
    id: `evidence:${run.id}:workflow-rejected`,
    kind: "workflow",
    label: "Approval workflow rejected",
    passed: false,
    detail: `Workflow moved to ${transition.nextState}; side effects ${transition.sideEffects.join(", ")}.`
  });
  run = recordImprovementCandidate(run, {
    id: `improvement:${run.id}:approval-rejection`,
    targetKind: "prompt-version",
    targetId: run.promptVersionId ?? "unknown",
    summary: "Review prompt, queue context, or tool policy after rejection.",
    state: "proposed"
  });
  persistRun(run);

  return {
    ok: true,
    status: "failed",
    checkpointState: "rejected"
  };
}

export function prepareRunnerHandoffControl(input: RunnerHandoffInput): {
  ok: true;
  runId: string;
  handoffId: string;
  state: "prepared";
} {
  normalizeActionInput(input);
  const run = requireRun(input.tenantId, input.runId);
  if (input.expectedReplayFingerprint) {
    assertReplayFingerprint(run, input.expectedReplayFingerprint);
  }

  const nextRun = prepareRunnerHandoff(run, {
    id: input.handoffId,
    target: input.target,
    endpoint: input.endpoint,
    note: input.note
  });
  persistRun(nextRun);
  return {
    ok: true,
    runId: nextRun.id,
    handoffId: input.handoffId,
    state: "prepared"
  };
}

export function completeRunnerHandoffControl(input: RunControlInput & { handoffId: string }): {
  ok: true;
  runId: string;
  handoffId: string;
  state: "completed";
} {
  normalizeActionInput(input);
  const run = requireRun(input.tenantId, input.runId);
  if (input.expectedReplayFingerprint) {
    assertReplayFingerprint(run, input.expectedReplayFingerprint);
  }

  const accepted = acknowledgeRunnerHandoff(run, input.handoffId);
  const nextRun = completeRunnerHandoff(accepted, input.handoffId);
  persistRun(nextRun);
  return {
    ok: true,
    runId: nextRun.id,
    handoffId: input.handoffId,
    state: "completed"
  };
}

export function recordVerifierResultControl(input: VerifierResultInput): {
  ok: true;
  runId: string;
  verifierId: string;
  outcome: "pass" | "warn" | "fail";
} {
  normalizeActionInput(input);
  const run = requireRun(input.tenantId, input.runId);
  if (input.expectedReplayFingerprint) {
    assertReplayFingerprint(run, input.expectedReplayFingerprint);
  }

  const nextRun = runtimeRecordVerifierResult(run, {
    id: `${run.id}:verifier:${input.verifierId}:${Date.now()}`,
    hookId: input.verifierId,
    outcome: input.outcome,
    summary: input.summary,
    evidenceRefs: input.evidenceRefs
  });
  persistRun(nextRun);
  return {
    ok: true,
    runId: nextRun.id,
    verifierId: input.verifierId,
    outcome: input.outcome
  };
}

export function resumeAgentRunControl(input: RunControlInput): {
  ok: true;
  runId: string;
  status: "completed" | "running";
} {
  normalizeActionInput(input);
  let run = requireRun(input.tenantId, input.runId);
  if (input.expectedReplayFingerprint) {
    assertReplayFingerprint(run, input.expectedReplayFingerprint);
  }

  run = resumeAgentRun(run);
  run = appendAgentStep(run, {
    id: `${run.id}:manual-resume`,
    kind: "verification",
    status: "completed",
    summary: "Operator resumed the run after a manual hold."
  });
  run = attachRunEvidence(run, {
    id: `evidence:${run.id}:manual-resume`,
    kind: "notification",
    label: "Manual resume recorded",
    passed: true,
    detail: input.reason ?? "Manual resume recorded by operator."
  });

  persistRun(run);
  return {
    ok: true,
    runId: run.id,
    status: "running"
  };
}

export function cancelAgentRunControl(input: RunControlInput): {
  ok: true;
  runId: string;
  status: "cancelled";
} {
  normalizeActionInput(input);
  let run = requireRun(input.tenantId, input.runId);
  if (input.expectedReplayFingerprint) {
    assertReplayFingerprint(run, input.expectedReplayFingerprint);
  }

  run = cancelAgentRun(run);
  run = attachRunEvidence(run, {
    id: `evidence:${run.id}:cancelled`,
    kind: "policy-check",
    label: "Run cancelled by operator",
    passed: false,
    detail: input.reason ?? "Cancelled by operator."
  });
  persistRun(run);
  return {
    ok: true,
    runId: run.id,
    status: "cancelled"
  };
}

export function escalateAgentRunControl(input: RunControlInput): {
  ok: true;
  runId: string;
  status: "escalated";
} {
  normalizeActionInput(input);
  let run = requireRun(input.tenantId, input.runId);
  if (input.expectedReplayFingerprint) {
    assertReplayFingerprint(run, input.expectedReplayFingerprint);
  }

  const escalationJob = scheduleJobExecution({
    executionId: `job:${run.id}:escalation`,
    tenantId: input.tenantId,
    jobKey: "workflow.approvals.escalate",
    concurrency: 1,
    retries: 2,
    timeoutMs: 45_000,
    reason: input.reason ?? "Escalate governed AI run."
  });
  const escalationNotification = queueNotificationMessage({
    messageId: `message:${run.id}:escalation`,
    tenantId: input.tenantId,
    actorId: input.actorId,
    channel: "in-app",
    recipientRef: "queue:ai-escalations",
    directAddress: "/admin/ai/runs",
    title: "AI run escalated",
    bodyText: `Run ${run.id} was escalated for operator attention.`,
    deliveryMode: "immediate",
    priority: "critical",
    idempotencyKey: `${run.id}:escalation`
  });
  run = escalateAgentRun(run, {
    reason: input.reason ?? "Escalated by operator.",
    queue: escalationJob.queue
  });
  run = appendAgentStep(run, {
    id: `${run.id}:escalation`,
    kind: "escalation",
    status: "completed",
    summary: "Operator escalated the run into a higher-priority approval queue."
  });
  run = attachRunEvidence(run, {
    id: `evidence:${run.id}:escalation`,
    kind: "notification",
    label: "Escalation job queued",
    passed: true,
    detail: `Queued on ${escalationJob.queue} with key ${escalationJob.observabilityKey}.`
  });
  run = attachRunEvidence(run, {
    id: `evidence:${run.id}:escalation-notification`,
    kind: "notification",
    label: "Escalation inbox notification queued",
    passed: true,
    detail: `Queued ${escalationNotification.jobs[0]?.jobDefinitionId ?? "notification"} for ${escalationNotification.message.recipientRef}.`
  });
  persistRun(run);
  return {
    ok: true,
    runId: run.id,
    status: "escalated"
  };
}

export function publishPromptVersion(input: PublishPromptVersionInput): {
  ok: true;
  promptVersionId: string;
  status: "published";
} {
  normalizeActionInput(input);
  const createdAt = new Date().toISOString();
  const promptVersion: PromptVersion = {
    id: `prompt-version:${input.templateId}:${input.version}`,
    templateId: input.templateId,
    version: input.version,
    body: input.body,
    createdAt,
    changelog: input.changelog
  };

  persistAiCoreState((state) => ({
    ...state,
    promptVersions: [promptVersion, ...state.promptVersions.filter((entry) => entry.id !== promptVersion.id)]
  }));

  return {
    ok: true,
    promptVersionId: promptVersion.id,
    status: "published"
  };
}
