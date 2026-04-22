import React from "react";

import { PlatformIcon } from "@platform/ui";

import { listAgentRunSummaries } from "../../services/main.service";

export function ActiveRunsWidget() {
  const runs = listAgentRunSummaries();
  const activeRuns = runs.filter((run) => run.status === "waiting-approval" || run.status === "running").length;
  const escalatedRuns = runs.filter((run) => run.status === "escalated").length;

  return (
    <section data-plugin-widget="ai-active-runs" className="awb-form-card">
      <div className="awb-inline-banner">
        <PlatformIcon name="bot" size={16} />
        <strong>{activeRuns} live runs</strong>
        <span>{runs.length} durable runs are tracked in the replay-safe ledger, including {escalatedRuns} escalated runs.</span>
      </div>
    </section>
  );
}
