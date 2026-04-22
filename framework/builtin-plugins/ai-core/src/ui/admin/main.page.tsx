import React from "react";

import { ChartSurface, createLineChartOption } from "@platform/chart";
import { formatPlatformDateTime, formatPlatformRelativeTime } from "@platform/ui";

import { getAiRuntimeOverview, listAgentRuns, listAgentRunSummaries } from "../../services/main.service";

export function AiCoreAdminPage() {
  const runs = listAgentRuns();
  const runSummaries = listAgentRunSummaries();
  const overview = getAiRuntimeOverview();
  const completedRuns = runSummaries.filter((run) => run.status === "completed").length;
  const waitingApprovals = runSummaries.filter((run) => run.status === "waiting-approval").length;
  const escalatedRuns = runSummaries.filter((run) => run.status === "escalated").length;

  return (
    <section data-plugin-page="ai-core-runs" className="awb-surface-stack">
      <div className="awb-inline-banner">
        <strong>Agent runtime control room</strong>
        <span>Durable runs carry classification, replay fingerprints, artifacts, evidence, approvals, and escalation signals.</span>
      </div>
      <div className="awb-inline-grid awb-inline-grid-4">
        <div className="awb-mini-stat">
          <span className="awb-mini-stat-label">Completed runs</span>
          <strong className="awb-mini-stat-value">{completedRuns}</strong>
        </div>
        <div className="awb-mini-stat">
          <span className="awb-mini-stat-label">Waiting approvals</span>
          <strong className="awb-mini-stat-value">{waitingApprovals}</strong>
        </div>
        <div className="awb-mini-stat">
          <span className="awb-mini-stat-label">Escalated runs</span>
          <strong className="awb-mini-stat-value">{escalatedRuns}</strong>
        </div>
        <div className="awb-mini-stat">
          <span className="awb-mini-stat-label">Evidence records</span>
          <strong className="awb-mini-stat-value">{overview.totals.evidence}</strong>
        </div>
      </div>
      <ChartSurface
        title="Runtime latency"
        option={createLineChartOption({
          title: "Runtime latency",
          labels: runSummaries.map((run) => run.id.split(":").slice(-1)[0] ?? run.id),
          series: [
            {
              name: "Runtime ms",
              data: runs.map((run) => run.usage.runtimeMs)
            }
          ]
        })}
        drilldown={{
          href: "/admin/reports/ai-run-usage",
          label: "Open usage report"
        }}
      />
      <div className="awb-inline-grid awb-inline-grid-2">
        {runs.map((run) => (
          <div key={run.id} className="awb-form-card">
            <h3 className="awb-panel-title">{run.agentId}</h3>
            <dl className="awb-detail-grid">
              <div>
                <dt>Status</dt>
                <dd>{run.status}</dd>
              </div>
              <div>
                <dt>Model</dt>
                <dd>{run.modelId}</dd>
              </div>
              <div>
                <dt>Mode</dt>
                <dd>{run.executionMode}</dd>
              </div>
              <div>
                <dt>Process</dt>
                <dd>{run.classification.processClass}</dd>
              </div>
              <div>
                <dt>Started</dt>
                <dd>{formatPlatformDateTime(run.startedAt)}</dd>
              </div>
              <div>
                <dt>Completed</dt>
                <dd>{run.completedAt ? formatPlatformRelativeTime(run.completedAt) : "Awaiting approval"}</dd>
              </div>
              <div>
                <dt>Artifacts</dt>
                <dd>{run.artifacts.length}</dd>
              </div>
              <div>
                <dt>Evidence</dt>
                <dd>{run.evidence.length}</dd>
              </div>
            </dl>
            <ul className="awb-check-list">
              {run.policyDecisions.map((decision) => (
                <li key={decision}>{decision}</li>
              ))}
            </ul>
            {run.escalation ? (
              <p className="awb-muted-copy">Escalated to {run.escalation.queue}: {run.escalation.reason}</p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
