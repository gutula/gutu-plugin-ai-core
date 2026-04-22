import {
  BuilderCanvas,
  BuilderHost,
  BuilderInspector,
  BuilderPalette,
  createBuilderPanelLayout
} from "@platform/admin-builders";

import { listPendingApprovals, listVerifierResults } from "../../services/main.service";

export function ApprovalBuilderPage() {
  const approvals = listPendingApprovals().slice(0, 6);
  const verifierResults = listVerifierResults().slice(0, 6);

  return (
    <BuilderHost
      layout={createBuilderPanelLayout({
        left: "palette",
        center: "canvas",
        right: "inspector"
      })}
      palette={<BuilderPalette items={approvals.map((approval) => ({ id: approval.id, label: approval.toolId ?? approval.id }))} />}
      canvas={
        <BuilderCanvas title="Approval routing">
          <div className="awb-form-card">
            <h3 className="awb-panel-title">Human checkpoint rules</h3>
            <ul className="awb-check-list">
              <li>High-risk tools pause into explicit approval states instead of optimistic retries.</li>
              <li>Approval SLAs, escalation, and resume paths share the same durable run control state.</li>
              <li>Verifier outcomes can block publish even after a human approves a step.</li>
            </ul>
          </div>
        </BuilderCanvas>
      }
      inspector={
        <BuilderInspector title="Verifier posture">
          <div className="awb-form-card">
            <div className="awb-table">
              {verifierResults.map((result) => (
                <div key={result.id} className="awb-table-row">
                  <strong>{result.hookId}</strong>
                  <span>{result.outcome}</span>
                </div>
              ))}
            </div>
          </div>
        </BuilderInspector>
      }
    />
  );
}
