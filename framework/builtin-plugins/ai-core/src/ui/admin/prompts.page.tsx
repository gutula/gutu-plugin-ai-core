import React from "react";

import { formatPlatformDateTime } from "@platform/ui";

import { getActivePromptTemplate, listPromptVersions } from "../../services/main.service";

export function PromptsPage() {
  const activeTemplate = getActivePromptTemplate();
  const promptVersions = listPromptVersions();

  return (
    <section data-plugin-page="ai-core-prompts" className="awb-surface-stack">
      <div className="awb-inline-banner">
        <strong>Prompt registry</strong>
        <span>Versioned prompts stay auditable, replay-safe, and ready for regression review.</span>
      </div>
      <div className="awb-form-card">
        <h3 className="awb-panel-title">Active template</h3>
        <p className="awb-muted-copy">{activeTemplate.label}</p>
        <pre className="awb-code-panel">{activeTemplate.body}</pre>
      </div>
      <div className="awb-form-card">
        <h3 className="awb-panel-title">Published versions</h3>
        <div className="awb-table">
          {promptVersions.map((promptVersion) => (
            <div key={promptVersion.id} className="awb-table-row">
              <strong>{promptVersion.version}</strong>
              <span>{promptVersion.templateId}</span>
              <span>{promptVersion.status}</span>
              <span>{formatPlatformDateTime(promptVersion.publishedAt)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
