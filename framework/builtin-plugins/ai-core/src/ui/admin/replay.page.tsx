import React from "react";

import { listReplaySnapshots } from "../../services/main.service";

export function ReplayConsolePage() {
  const replaySnapshots = listReplaySnapshots();

  return (
    <section data-plugin-page="ai-core-replay" className="awb-surface-stack">
      <div className="awb-inline-banner">
        <strong>Replay console</strong>
        <span>Every run carries prompt, policy, tool-schema, and memory snapshot fingerprints.</span>
      </div>
      {replaySnapshots.map((fixture) => (
        <div key={fixture.runId} className="awb-form-card">
          <h3 className="awb-panel-title">{fixture.runId}</h3>
          <p className="awb-muted-copy">Prompt version: {fixture.promptVersionId}</p>
          <p className="awb-muted-copy">Artifacts: {fixture.artifactCount} | Evidence: {fixture.evidenceCount}</p>
          <pre className="awb-code-panel">{fixture.fingerprint}</pre>
          <ul className="awb-check-list">
            {fixture.policyDecisions.map((decision) => (
              <li key={decision}>{decision}</li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
