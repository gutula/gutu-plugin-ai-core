import React from "react";

import { formatPlatformDateTime } from "@platform/ui";

import { listPendingApprovals } from "../../services/main.service";

export function ApprovalsPage() {
  const approvals = listPendingApprovals();

  return (
    <section data-plugin-page="ai-core-approvals" className="awb-surface-stack">
      <div className="awb-inline-banner">
        <strong>Approval queue</strong>
        <span>High-risk tools pause here before the runtime can continue.</span>
      </div>
      <div className="awb-inline-grid awb-inline-grid-2">
        {approvals.map((approval) => (
          <div key={approval.id} className="awb-form-card">
            <h3 className="awb-panel-title">{approval.toolId ?? "Tool checkpoint"}</h3>
            <dl className="awb-detail-grid">
              <div>
                <dt>Run</dt>
                <dd>{approval.runId}</dd>
              </div>
              <div>
                <dt>State</dt>
                <dd>{approval.state}</dd>
              </div>
              <div>
                <dt>Requested</dt>
                <dd>{formatPlatformDateTime(approval.requestedAt)}</dd>
              </div>
              <div>
                <dt>Expires</dt>
                <dd>{approval.expiresAt ? formatPlatformDateTime(approval.expiresAt) : "No expiry"}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}
