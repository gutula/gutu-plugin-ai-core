import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  approveAgentCheckpointDecision,
  getActivePromptTemplate,
  listAgentRuns,
  listPendingApprovals,
  listPromptVersions,
  publishPromptVersion,
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
});
