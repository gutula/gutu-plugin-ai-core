import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  branchAgentRunControl,
  approveAgentCheckpointDecision,
  cancelAgentRunControl,
  completeRunnerHandoffControl,
  escalateAgentRunControl,
  getActivePromptTemplate,
  getAiRuntimeOverview,
  listAgentRuns,
  listPendingApprovals,
  listPromptVersions,
  listRunArtifacts,
  listRunEvidence,
  listRunEvents,
  listRunnerHandoffs,
  listVerifierResults,
  prepareRunnerHandoffControl,
  publishPromptVersion,
  recordVerifierResultControl,
  resumeAgentRunControl,
  submitAgentRun
} from "../../src/services/main.service";

describe("ai-core services", () => {
  let stateDir = "";
  const previousStateDir = process.env.GUTU_STATE_DIR;

  beforeEach(() => {
    stateDir = mkdtempSync(join(tmpdir(), "gutu-ai-core-state-"));
    process.env.GUTU_STATE_DIR = stateDir;
  });

  afterEach(() => {
    rmSync(stateDir, { recursive: true, force: true });
    if (previousStateDir === undefined) {
      delete process.env.GUTU_STATE_DIR;
      return;
    }
    process.env.GUTU_STATE_DIR = previousStateDir;
  });

  it("persists approval-driven agent runs and clears pending approvals after resolution", () => {
    const pendingBefore = listPendingApprovals().length;
    const submission = submitAgentRun({
      tenantId: "tenant-platform",
      actorId: "actor-admin",
      agentId: "ops-triage-agent",
      promptVersionId: "prompt-version:ops-triage:v4",
      goal: "Review the finance exception and stop for approval.",
      allowedToolIds: ["crm.contacts.list", "finance.invoices.approve"]
    });

    expect(submission.status).toBe("waiting-approval");
    expect(listPendingApprovals()).toHaveLength(pendingBefore + 1);

    const approval = approveAgentCheckpointDecision({
      tenantId: "tenant-platform",
      actorId: "actor-admin",
      runId: submission.runId,
      checkpointId: submission.pendingCheckpointId ?? "",
      approved: true,
      note: "Approved for the finance desk."
    });

    expect(approval.status).toBe("completed");
    expect(approval.checkpointState).toBe("approved");
    expect(listPendingApprovals()).toHaveLength(pendingBefore);
    expect(listAgentRuns().find((run) => run.id === submission.runId)?.status).toBe("completed");
    expect(listRunArtifacts().some((artifact) => artifact.runId === submission.runId)).toBe(true);
    expect(listRunEvidence().some((evidence) => evidence.runId === submission.runId)).toBe(true);
  });

  it("persists published prompt versions and updates the active template body", () => {
    const published = publishPromptVersion({
      tenantId: "tenant-platform",
      actorId: "actor-admin",
      templateId: "prompt-template:ops-triage",
      version: "v5",
      body: "Summarize the queue, cite grounded sources, and require approvals for risky tools.",
      changelog: "Adds queue summarization guidance."
    });

    expect(published.status).toBe("published");
    expect(listPromptVersions()[0]?.id).toBe(published.promptVersionId);
    expect(getActivePromptTemplate().body).toContain("require approvals for risky tools");
  });

  it("supports run escalation, resume, cancellation, and runtime overview counters", () => {
    const submission = submitAgentRun({
      tenantId: "tenant-platform",
      actorId: "actor-admin",
      agentId: "ops-triage-agent",
      promptVersionId: "prompt-version:ops-triage:v4",
      goal: "Review the finance exception and stop for approval.",
      allowedToolIds: ["crm.contacts.list", "finance.invoices.approve"]
    });

    const resumed = resumeAgentRunControl({
      tenantId: "tenant-platform",
      actorId: "actor-admin",
      runId: submission.runId,
      reason: "Resume after manual packet inspection."
    });
    const escalated = escalateAgentRunControl({
      tenantId: "tenant-platform",
      actorId: "actor-admin",
      runId: submission.runId,
      reason: "Escalate the approval queue before timeout."
    });
    const cancelled = cancelAgentRunControl({
      tenantId: "tenant-platform",
      actorId: "actor-admin",
      runId: submission.runId,
      reason: "Cancel stale approval run."
    });
    const overview = getAiRuntimeOverview();

    expect(resumed.status).toBe("running");
    expect(escalated.status).toBe("escalated");
    expect(cancelled.status).toBe("cancelled");
    expect(overview.totals.artifacts).toBeGreaterThan(0);
    expect(overview.totals.evidence).toBeGreaterThan(0);
  });

  it("supports branching, runner handoffs, and verifier result recording", () => {
    const submission = submitAgentRun({
      tenantId: "tenant-platform",
      actorId: "actor-admin",
      agentId: "ops-triage-agent",
      promptVersionId: "prompt-version:ops-triage:v4",
      goal: "Prepare a sandbox branch for release verification.",
      allowedToolIds: ["crm.contacts.list"]
    });

    const parentRun = listAgentRuns().find((run) => run.id === submission.runId);
    const branch = branchAgentRunControl({
      tenantId: "tenant-platform",
      actorId: "actor-admin",
      runId: submission.runId,
      branchKey: "sandbox-verification",
      branchReason: "Fork for sandbox verification.",
      executionMode: "sandbox",
      expectedReplayFingerprint: parentRun?.replayFingerprint
    });
    const branchRun = listAgentRuns().find((run) => run.id === branch.runId);
    const handoff = prepareRunnerHandoffControl({
      tenantId: "tenant-platform",
      actorId: "actor-admin",
      runId: branch.runId,
      handoffId: "handoff:sandbox",
      target: "sandbox",
      endpoint: "sandbox://worker/release",
      expectedReplayFingerprint: branchRun?.replayFingerprint
    });
    const verifier = recordVerifierResultControl({
      tenantId: "tenant-platform",
      actorId: "actor-admin",
      runId: branch.runId,
      verifierId: "completion",
      summary: "Sandbox verification passed.",
      outcome: "pass",
      expectedReplayFingerprint: branchRun?.replayFingerprint
    });
    const completed = completeRunnerHandoffControl({
      tenantId: "tenant-platform",
      actorId: "actor-admin",
      runId: branch.runId,
      handoffId: "handoff:sandbox",
      expectedReplayFingerprint: branchRun?.replayFingerprint
    });

    expect(branch.status).toBe("queued");
    expect(handoff.state).toBe("prepared");
    expect(verifier.outcome).toBe("pass");
    expect(completed.state).toBe("completed");
    expect(listRunEvents().some((event) => event.runId === branch.runId && event.type === "branch")).toBe(true);
    expect(listRunnerHandoffs().some((entry) => entry.runId === branch.runId && entry.state === "completed")).toBe(true);
    expect(listVerifierResults().some((entry) => entry.runId === branch.runId && entry.outcome === "pass")).toBe(true);
  });

  it("expires overdue approval checkpoints and records timeout recovery guidance", () => {
    const expiredRun = listAgentRuns().find((run) => run.id === "run:ops-triage:002");

    expect(expiredRun?.status).toBe("failed");
    expect(expiredRun?.checkpoints[0]?.state).toBe("expired");
    expect(listPendingApprovals().some((request) => request.runId === "run:ops-triage:002")).toBe(false);
    expect(expiredRun?.improvementCandidates.some((candidate) => candidate.id.includes("approval-timeout"))).toBe(true);
  });
});
