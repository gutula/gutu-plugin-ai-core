import {
  BuilderCanvas,
  BuilderHost,
  BuilderInspector,
  BuilderPalette,
  createBuilderPanelLayout
} from "@platform/admin-builders";

import { listAgentRuns, listRunEvents } from "../../services/main.service";

export function WorkflowBuilderPage() {
  const runs = listAgentRuns().slice(0, 6);
  const events = listRunEvents().slice(0, 6);

  return (
    <BuilderHost
      layout={createBuilderPanelLayout({
        left: "palette",
        center: "canvas",
        right: "inspector"
      })}
      palette={<BuilderPalette items={runs.map((run) => ({ id: run.id, label: run.prompt.slice(0, 48) }))} />}
      canvas={
        <BuilderCanvas title="Workflow topology">
          <div className="awb-form-card">
            <h3 className="awb-panel-title">Governed stages</h3>
            <ul className="awb-check-list">
              <li>Intake and planning stay deterministic before bounded agent execution starts.</li>
              <li>Approval waits, verifier hooks, handoffs, and replay evidence are preserved as first-class run events.</li>
              <li>Branching and recovery remain visible so out-of-process runners can attach later without API drift.</li>
            </ul>
          </div>
        </BuilderCanvas>
      }
      inspector={
        <BuilderInspector title="Recent run events">
          <div className="awb-form-card">
            <div className="awb-table">
              {events.map((event) => (
                <div key={event.id} className="awb-table-row">
                  <strong>{event.type}</strong>
                  <span>{event.runId}</span>
                </div>
              ))}
            </div>
          </div>
        </BuilderInspector>
      }
    />
  );
}
