import { definePolicy } from "@platform/permissions";

export const aiPolicy = definePolicy({
  id: "ai-core.default",
  rules: [
    {
      permission: "ai.runs.read",
      allowIf: ["role:admin", "role:operator", "role:support"]
    },
    {
      permission: "ai.runs.submit",
      allowIf: ["role:admin", "role:operator"],
      audit: true
    },
    {
      permission: "ai.prompts.read",
      allowIf: ["role:admin", "role:operator"]
    },
    {
      permission: "ai.prompts.publish",
      allowIf: ["role:admin"],
      requireReason: true,
      audit: true
    },
    {
      permission: "ai.approvals.read",
      allowIf: ["role:admin", "role:operator", "role:support"]
    },
    {
      permission: "ai.approvals.approve",
      allowIf: ["role:admin"],
      requireReason: true,
      audit: true
    },
    {
      permission: "ai.replay.read",
      allowIf: ["role:admin", "role:support"],
      audit: true
    },
    {
      permission: "ai.reports.read",
      allowIf: ["role:admin", "role:operator", "role:support"]
    },
    {
      permission: "ai.memory.read",
      allowIf: ["role:admin", "role:operator", "role:support"]
    },
    {
      permission: "ai.evals.read",
      allowIf: ["role:admin", "role:operator"]
    },
    {
      permission: "ai.evals.run",
      allowIf: ["role:admin"],
      requireReason: true,
      audit: true
    }
  ]
});
