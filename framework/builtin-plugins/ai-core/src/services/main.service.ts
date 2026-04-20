import type { ToolContract } from "@platform/ai";
import { defineGuardrailPolicy, moderateOutput, sanitizePrompt } from "@platform/ai-guardrails";
import {
  appendAgentStep,
  approveCheckpoint,
  completeAgentRun,
  consumeBudget,
  createAgentRunRecord,
  defineAgent,
  pauseAgentRunForApproval,
  rejectCheckpoint,
  resumeAgentRun,
  loadJsonState,
  updateJsonState,
  type AgentRunRecord,
  type PromptTemplate,
  type PromptVersion
} from "@platform/ai-runtime";
import { normalizeActionInput } from "@platform/schema";

export type SubmitAgentRunInput = {
  tenantId: string;
  actorId: string;
  agentId: string;
  promptVersionId: string;
  goal: string;
  allowedToolIds: string[];
  modelId?: string | undefined;
};

export type ApprovalDecisionInput = {
  tenantId: string;
  actorId: string;
  runId: string;
  checkpointId: string;
  approved: boolean;
  note?: string | undefined;
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
const financeApprovalTool = availableTools[1]!;
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
    maxSteps: 10,
    maxToolCalls: 4,
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
  promptTemplateId: promptFixtures.template.id
});

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
      tools: [safeReadTool],
      modelRoutingProfileId: "routing:ops-default",
      memorySnapshotRefs: ["memory-snapshot:ops-2026-04-18"],
      policyDecisions: ["tool:crm.contacts.list:allow", "guardrail:prompt:pass"]
    },
    {
      runId: "run:ops-triage:001",
      startedAt: "2026-04-18T09:30:00.000Z"
    }
  );
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
  run = consumeBudget(run, {
    inputTokens: 1280,
    outputTokens: 420,
    estimatedCostUsd: 0.084,
    runtimeMs: 8_400
  });
  return completeAgentRun(run, "2026-04-18T09:30:08.000Z");
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
      tools: [safeReadTool, financeApprovalTool],
      modelRoutingProfileId: "routing:ops-finance",
      memorySnapshotRefs: ["memory-snapshot:finance-2026-04-18"],
      policyDecisions: ["tool:finance.invoices.approve:require-approval", "guardrail:prompt:pass"]
    },
    {
      runId: "run:ops-triage:002",
      startedAt: "2026-04-18T11:05:00.000Z"
    }
  );
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
  run = consumeBudget(run, {
    inputTokens: 940,
    outputTokens: 180,
    estimatedCostUsd: 0.051,
    runtimeMs: 4_100
  });
  return run;
}

export const runFixtures = Object.freeze([buildCompletedRun(), buildPendingRun()]);
const aiCoreStateFile = "ai-control-plane-core.json";

type AiCoreState = {
  promptVersions: PromptVersion[];
  agentRuns: AgentRunRecord[];
};

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
    memorySnapshotRefs: run.memorySnapshotRefs
  }))
);

function seedAiCoreState(): AiCoreState {
  return {
    promptVersions: [...promptFixtures.versions],
    agentRuns: [...runFixtures]
  };
}

function loadAiCoreState(): AiCoreState {
  return loadJsonState(aiCoreStateFile, seedAiCoreState);
}

function persistAiCoreState(updater: (state: AiCoreState) => AiCoreState): AiCoreState {
  return updateJsonState(aiCoreStateFile, seedAiCoreState, updater);
}

export function listAgentRuns(): AgentRunRecord[] {
  return loadAiCoreState().agentRuns.sort((left, right) => right.startedAt.localeCompare(left.startedAt));
}

export function listReplaySnapshots() {
  return listAgentRuns().map((run) => ({
    runId: run.id,
    fingerprint: run.replayFingerprint,
    promptVersionId: run.promptVersionId,
    policyDecisions: run.policyDecisions,
    memorySnapshotRefs: run.memorySnapshotRefs
  }));
}

export function listPromptVersionCatalog(): PromptVersion[] {
  return loadAiCoreState().promptVersions.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
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
  return listAgentRuns().map((run) => ({
    id: run.id,
    tenantId: run.tenantId,
    agentId: run.agentId,
    status: run.status,
    modelId: run.modelId,
    stepCount: run.steps.length,
    startedAt: run.startedAt
  }));
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
        requestedAt: approval.requestedAt
      }))
  );
}

export function submitAgentRun(input: SubmitAgentRunInput): {
  ok: true;
  runId: string;
  status: "waiting-approval" | "completed";
  pendingCheckpointId?: string | undefined;
} {
  normalizeActionInput(input);
  const promptCheck = sanitizePrompt(input.goal, runtimeGuardrails);
  const selectedTools = availableTools.filter((tool) => input.allowedToolIds.includes(tool.id));
  const effectiveTools = selectedTools.length > 0 ? selectedTools : [safeReadTool];
  const reviewTool = selectedTools.find((tool) => tool.approvalMode === "required");

  let run = createAgentRunRecord(operationsAgent, {
    agentId: input.agentId,
    tenantId: input.tenantId,
    packageId: "ai-core",
    actorId: input.actorId,
    prompt: promptCheck.sanitizedPrompt,
    promptVersionId: input.promptVersionId,
    tools: effectiveTools,
    modelId: input.modelId,
    modelRoutingProfileId: "routing:ops-default",
    memorySnapshotRefs: ["memory-snapshot:ops-latest"],
    policyDecisions: promptCheck.checks.map((check) => check.code)
  });

  run = appendAgentStep(run, {
    id: `${run.id}:plan`,
    kind: "plan",
    status: "completed",
    summary: "Created run plan from prompt and allowed tool set."
  });

  if (reviewTool) {
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
      toolId: reviewTool.id
    });

    persistAiCoreState((state) => ({
      ...state,
      agentRuns: [run, ...state.agentRuns.filter((existingRun) => existingRun.id !== run.id)]
    }));

    return {
      ok: true,
      runId: run.id,
      status: "waiting-approval",
      pendingCheckpointId: run.checkpoints[0]?.id
    };
  }

  run = appendAgentStep(run, {
    id: `${run.id}:model`,
    kind: "model",
    status: "completed",
    summary: moderateOutput("Prepared grounded summary and next-step checklist for the operator.", runtimeGuardrails)
      .outputText
  });
  run = consumeBudget(run, {
    inputTokens: 820,
    outputTokens: 210,
    estimatedCostUsd: 0.041,
    runtimeMs: 3_200
  });
  run = completeAgentRun(run);

  persistAiCoreState((state) => ({
    ...state,
    agentRuns: [run, ...state.agentRuns.filter((existingRun) => existingRun.id !== run.id)]
  }));

  return {
    ok: true,
    runId: run.id,
    status: "completed"
  };
}

export function approveAgentCheckpointDecision(input: ApprovalDecisionInput): {
  ok: true;
  status: "completed" | "failed";
  checkpointState: "approved" | "rejected";
} {
  normalizeActionInput(input);
  const nextState = persistAiCoreState((state) => {
    const sourceRun = state.agentRuns.find((run) => run.id === input.runId);
    if (!sourceRun) {
      throw new Error(`Unknown AI run '${input.runId}'.`);
    }

    const checkpoint = sourceRun.checkpoints.find((entry) => entry.id === input.checkpointId);
    if (!checkpoint) {
      throw new Error(`Unknown approval checkpoint '${input.checkpointId}'.`);
    }

    if (checkpoint.state === "approved" || checkpoint.state === "rejected") {
      return state;
    }

    const updatedRun = input.approved
      ? completeAgentRun(
          resumeAgentRun(
            approveCheckpoint(sourceRun, input.checkpointId, {
              approverId: input.actorId,
              approvedAt: "2026-04-18T11:15:00.000Z",
              decisionNote: input.note
            })
          ),
          "2026-04-18T11:15:02.000Z"
        )
      : rejectCheckpoint(sourceRun, input.checkpointId, {
          approverId: input.actorId,
          rejectedAt: "2026-04-18T11:15:00.000Z",
          decisionNote: input.note
        });

    return {
      ...state,
      agentRuns: state.agentRuns.map((run) => (run.id === updatedRun.id ? updatedRun : run))
    };
  });
  const updated = nextState.agentRuns.find((run) => run.id === input.runId);
  if (!updated) {
    throw new Error(`Unknown AI run '${input.runId}'.`);
  }
  const checkpointState = updated.checkpoints.find((entry) => entry.id === input.checkpointId)?.state;
  if (checkpointState !== "approved" && checkpointState !== "rejected") {
    throw new Error(`Approval checkpoint '${input.checkpointId}' was not resolved.`);
  }

  return {
    ok: true,
    status: updated.status === "completed" ? "completed" : "failed",
    checkpointState
  };
}

export function publishPromptVersion(input: PublishPromptVersionInput): {
  ok: true;
  promptVersionId: string;
  status: "published";
} {
  normalizeActionInput(input);
  const sanitized = sanitizePrompt(input.body, runtimeGuardrails);
  const moderated = moderateOutput(sanitized.sanitizedPrompt, runtimeGuardrails);
  const createdAt = new Date().toISOString();
  const promptVersionId = input.templateId.startsWith("prompt-template:")
    ? input.templateId.replace("prompt-template:", "prompt-version:") + `:${input.version}`
    : `prompt-version:${input.templateId}:${input.version}`;

  persistAiCoreState((state) => ({
    ...state,
    promptVersions: [
      {
        id: promptVersionId,
        templateId: input.templateId,
        version: input.version,
        body: moderated.outputText,
        createdAt,
        ...(input.changelog ? { changelog: input.changelog } : {})
      },
      ...state.promptVersions.filter((version) => version.id !== promptVersionId)
    ]
  }));

  return {
    ok: true,
    promptVersionId,
    status: "published"
  };
}
