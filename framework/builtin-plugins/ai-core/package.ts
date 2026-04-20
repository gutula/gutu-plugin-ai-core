import { definePackage } from "@platform/kernel";

export default definePackage({
  id: "ai-core",
  kind: "ai-pack",
  version: "0.1.0",
  displayName: "AI Core",
  description: "Durable agent runtime, prompt governance, approval queues, and replay controls.",
  extends: [],
  dependsOn: [
    "auth-core",
    "org-tenant-core",
    "role-policy-core",
    "audit-core",
    "jobs-core",
    "workflow-core",
    "notifications-core"
  ],
  optionalWith: [],
  conflictsWith: [],
  providesCapabilities: ["ai.runtime", "ai.prompts", "ai.approvals"],
  requestedCapabilities: [
    "ui.register.admin",
    "api.rest.mount",
    "data.write.ai",
    "jobs.execute.ai",
    "workflow.execute.ai",
    "notifications.enqueue.ai",
    "ai.model.invoke",
    "ai.tool.execute"
  ],
  ownsData: ["ai.agent-runs", "ai.prompt-versions", "ai.approval-requests"],
  extendsData: [],
  slotClaims: [],
  trustTier: "first-party",
  reviewTier: "R1",
  isolationProfile: "same-process-trusted",
  compatibility: {
    framework: "^0.1.0",
    runtime: "bun>=1.3.12",
    db: ["postgres", "sqlite"]
  }
});
