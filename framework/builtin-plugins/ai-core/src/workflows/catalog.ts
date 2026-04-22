import { defineWorkflow } from "@platform/jobs";

export const workflowDefinitionKeys = ["ai-run-lifecycle", "ai-run-approval"] as const;

export const workflowDefinitions = {
  "ai-run-lifecycle": defineWorkflow({
    id: "ai-run-lifecycle",
    description: "End-to-end lifecycle for governed AI work execution.",
    businessPurpose: "Keep intake, planning, approval, verification, and recovery states explicit and auditable.",
    actors: ["requester", "approver", "operator", "admin"],
    initialState: "intake",
    states: {
      intake: { on: { classify: "classified" } },
      classified: { on: { plan: "planned" } },
      planned: { on: { execute: "executing", request_approval: "waiting_approval" } },
      executing: { on: { verify: "verifying", fail: "failed", cancel: "cancelled" } },
      waiting_approval: { on: { approve: "executing", reject: "failed", escalate: "escalated" } },
      verifying: { on: { complete: "completed", fail: "failed" } },
      escalated: { on: { resume: "executing", cancel: "cancelled" } },
      completed: {},
      failed: {},
      cancelled: {}
    }
  }),
  "ai-run-approval": defineWorkflow({
    id: "ai-run-approval",
    description: "Approval wait, reminder, and escalation lifecycle for sensitive AI mutations.",
    businessPurpose: "Track approval deadlines and escalation paths as explicit workflow state.",
    actors: ["requester", "approver", "operator", "admin"],
    initialState: "draft",
    states: {
      draft: { on: { submit: "pending" } },
      pending: { on: { remind: "pending", approve: "approved", reject: "rejected", expire: "expired", escalate: "escalated" } },
      escalated: { on: { approve: "approved", reject: "rejected", cancel: "cancelled" } },
      approved: {},
      rejected: {},
      expired: {},
      cancelled: {}
    }
  })
} as const;

export type AiCoreWorkflowDefinitionKey = (typeof workflowDefinitionKeys)[number];
