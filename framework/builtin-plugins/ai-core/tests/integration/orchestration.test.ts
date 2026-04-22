import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  approveAgentCheckpointDecision,
  cancelAgentRunControl,
  listAgentRuns,
  listPendingApprovals,
  listRunArtifacts,
  listRunEvidence,
  submitAgentRun
} from "../../src/services/main.service";

describe("ai-core integration", () => {
  let stateDir = "";
  const previousStateDir = process.env.GUTU_STATE_DIR;

  beforeEach(() => {
    stateDir = mkdtempSync(join(tmpdir(), "gutu-ai-core-integration-"));
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

  it("runs submit -> approval -> verification with durable orchestration evidence", () => {
    const pendingBefore = listPendingApprovals().length;
    const submission = submitAgentRun({
      tenantId: "tenant-platform",
      actorId: "actor-admin",
      agentId: "ops-triage-agent",
      promptVersionId: "prompt-version:ops-triage:v4",
      goal: "Review the escalated finance packet and stop for governed approval.",
      allowedToolIds: ["crm.contacts.list", "finance.invoices.approve"],
      executionMode: "strict-process",
      processClass: "finance-exception",
      riskTier: "high",
      slaMinutes: 120
    });

    expect(submission.status).toBe("waiting-approval");
    expect(listPendingApprovals()).toHaveLength(pendingBefore + 1);

    const waitingRun = listAgentRuns().find((run) => run.id === submission.runId);
    const checkpoint = waitingRun?.checkpoints.find((entry) => entry.state === "pending");

    expect(waitingRun).toBeDefined();
    expect(checkpoint?.id).toBeDefined();

    const approval = approveAgentCheckpointDecision({
      tenantId: "tenant-platform",
      actorId: "actor-admin",
      runId: submission.runId,
      checkpointId: checkpoint?.id ?? "",
      approved: true,
      note: "Approved after operator review.",
      expectedReplayFingerprint: waitingRun?.replayFingerprint
    });

    expect(approval.status).toBe("completed");
    expect(listPendingApprovals()).toHaveLength(pendingBefore);

    const completedRun = listAgentRuns().find((run) => run.id === submission.runId);
    expect(completedRun?.status).toBe("completed");
    expect(completedRun?.steps.some((step) => step.kind === "verification" && step.status === "completed")).toBe(true);
    expect(listRunArtifacts().some((artifact) => artifact.runId === submission.runId && artifact.kind === "approval-packet")).toBe(true);
    expect(listRunEvidence().some((evidence) => evidence.runId === submission.runId && evidence.label === "Approval workflow completed")).toBe(true);
  });

  it("guards replay fingerprints and records rejected approvals as failed governed runs", () => {
    const submission = submitAgentRun({
      tenantId: "tenant-platform",
      actorId: "actor-admin",
      agentId: "ops-triage-agent",
      promptVersionId: "prompt-version:ops-triage:v4",
      goal: "Review a risky finance mutation and wait for approval.",
      allowedToolIds: ["crm.contacts.list", "finance.invoices.approve"],
      executionMode: "strict-process",
      processClass: "finance-exception",
      riskTier: "high",
      slaMinutes: 180
    });

    const waitingRun = listAgentRuns().find((run) => run.id === submission.runId);
    const checkpoint = waitingRun?.checkpoints.find((entry) => entry.state === "pending");

    expect(() =>
      approveAgentCheckpointDecision({
        tenantId: "tenant-platform",
        actorId: "actor-admin",
        runId: submission.runId,
        checkpointId: checkpoint?.id ?? "",
        approved: true,
        expectedReplayFingerprint: "replay:wrong"
      })
    ).toThrow(/Replay mismatch/);

    const rejection = approveAgentCheckpointDecision({
      tenantId: "tenant-platform",
      actorId: "actor-admin",
      runId: submission.runId,
      checkpointId: checkpoint?.id ?? "",
      approved: false,
      note: "Rejected because the packet lacked finance evidence.",
      expectedReplayFingerprint: waitingRun?.replayFingerprint
    });

    expect(rejection.status).toBe("failed");

    const failedRun = listAgentRuns().find((run) => run.id === submission.runId);
    expect(failedRun?.status).toBe("failed");
    expect(failedRun?.evidence.some((entry) => entry.label === "Approval workflow rejected")).toBe(true);
    expect(failedRun?.improvementCandidates.length).toBeGreaterThan(0);
  });

  it("deduplicates repeated high-risk submissions and keeps a single pending checkpoint", () => {
    const runsBefore = listAgentRuns().length;
    const pendingBefore = listPendingApprovals().length;

    const first = submitAgentRun({
      tenantId: "tenant-platform",
      actorId: "actor-admin",
      agentId: "ops-triage-agent",
      promptVersionId: "prompt-version:ops-triage:v4",
      goal: "Review the same finance packet twice and ensure the run is deduplicated.",
      allowedToolIds: ["crm.contacts.list", "finance.invoices.approve"],
      executionMode: "strict-process",
      processClass: "finance-exception",
      riskTier: "high",
      slaMinutes: 120
    });
    const second = submitAgentRun({
      tenantId: "tenant-platform",
      actorId: "actor-admin",
      agentId: "ops-triage-agent",
      promptVersionId: "prompt-version:ops-triage:v4",
      goal: "Review the same finance packet twice and ensure the run is deduplicated.",
      allowedToolIds: ["crm.contacts.list", "finance.invoices.approve"],
      executionMode: "strict-process",
      processClass: "finance-exception",
      riskTier: "high",
      slaMinutes: 120
    });

    expect(second.runId).toBe(first.runId);
    expect(second.pendingCheckpointId).toBe(first.pendingCheckpointId);
    expect(listAgentRuns()).toHaveLength(runsBefore + 1);
    expect(listPendingApprovals()).toHaveLength(pendingBefore + 1);
    expect(
      listAgentRuns()
        .find((run) => run.id === first.runId)
        ?.checkpoints.filter((entry) => entry.state === "pending")
    ).toHaveLength(1);
  });

  it("treats repeated approval decisions as idempotent and enforces tenant isolation on controls", () => {
    const submission = submitAgentRun({
      tenantId: "tenant-platform",
      actorId: "actor-admin",
      agentId: "ops-triage-agent",
      promptVersionId: "prompt-version:ops-triage:v4",
      goal: "Approve once and ensure repeated decisions are stable.",
      allowedToolIds: ["crm.contacts.list", "finance.invoices.approve"],
      executionMode: "strict-process",
      processClass: "finance-exception",
      riskTier: "high",
      slaMinutes: 120
    });

    const waitingRun = listAgentRuns().find((run) => run.id === submission.runId);
    const checkpoint = waitingRun?.checkpoints.find((entry) => entry.state === "pending");
    const firstApproval = approveAgentCheckpointDecision({
      tenantId: "tenant-platform",
      actorId: "actor-admin",
      runId: submission.runId,
      checkpointId: checkpoint?.id ?? "",
      approved: true,
      note: "Approve the packet once.",
      expectedReplayFingerprint: waitingRun?.replayFingerprint
    });
    const evidenceCount = listAgentRuns().find((run) => run.id === submission.runId)?.evidence.length ?? 0;
    const secondApproval = approveAgentCheckpointDecision({
      tenantId: "tenant-platform",
      actorId: "actor-admin",
      runId: submission.runId,
      checkpointId: checkpoint?.id ?? "",
      approved: true,
      note: "A duplicate operator click should be idempotent."
    });

    expect(firstApproval.status).toBe("completed");
    expect(secondApproval).toEqual({
      ok: true,
      status: "completed",
      checkpointState: "approved"
    });
    expect(listAgentRuns().find((run) => run.id === submission.runId)?.evidence.length).toBe(evidenceCount);
    expect(() =>
      cancelAgentRunControl({
        tenantId: "tenant-other",
        actorId: "actor-admin",
        runId: submission.runId
      })
    ).toThrow(/does not belong to tenant/);
  });
});
