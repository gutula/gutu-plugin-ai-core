import React from "react";

import { PlatformIcon } from "@platform/ui";

import { listPendingApprovals } from "../../services/main.service";

export function PendingApprovalsWidget() {
  const approvals = listPendingApprovals().filter((approval) => approval.state === "pending");

  return (
    <section data-plugin-widget="ai-pending-approvals" className="awb-form-card">
      <div className="awb-inline-banner">
        <PlatformIcon name="shield-check" size={16} />
        <strong>{approvals.length} checkpoints pending</strong>
        <span>Sensitive tool executions remain paused until a human decision is recorded.</span>
      </div>
    </section>
  );
}
