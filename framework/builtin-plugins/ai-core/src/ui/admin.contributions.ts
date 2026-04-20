import {
  defineAdminNav,
  defineCommand,
  definePage,
  defineReport,
  defineSearchProvider,
  defineWidget,
  defineWorkspace,
  type AdminContributionRegistry
} from "@platform/admin-contracts";

import { ActiveRunsWidget } from "./admin/active-runs.widget";
import { ApprovalsPage } from "./admin/approvals.page";
import { AiCoreAdminPage } from "./admin/main.page";
import { PendingApprovalsWidget } from "./admin/pending-approvals.widget";
import { PromptsPage } from "./admin/prompts.page";
import { ReplayConsolePage } from "./admin/replay.page";

export const adminContributions: Pick<
  AdminContributionRegistry,
  "workspaces" | "nav" | "pages" | "widgets" | "reports" | "commands" | "searchProviders"
> = {
  workspaces: [
    defineWorkspace({
      id: "ai",
      label: "AI",
      icon: "sparkles",
      description: "Durable agent operations, prompt governance, approvals, memory, and eval control.",
      permission: "ai.runs.read",
      homePath: "/admin/workspace/ai",
      cards: ["ai.active-runs", "ai.pending-approvals"],
      reports: ["ai.run-usage"],
      quickActions: ["ai.open.runs", "ai.open.prompts", "ai.open.approvals"]
    })
  ],
  nav: [
    defineAdminNav({
      workspace: "ai",
      group: "operations",
      items: [
        {
          id: "ai.runs",
          label: "Agent Runs",
          icon: "bot",
          to: "/admin/ai/runs",
          permission: "ai.runs.read"
        },
        {
          id: "ai.approvals",
          label: "Approval Queue",
          icon: "shield-check",
          to: "/admin/ai/approvals",
          permission: "ai.approvals.read"
        },
        {
          id: "ai.replay",
          label: "Replay Console",
          icon: "history",
          to: "/admin/ai/replay",
          permission: "ai.replay.read"
        }
      ]
    }),
    defineAdminNav({
      workspace: "ai",
      group: "governance",
      items: [
        {
          id: "ai.prompts",
          label: "Prompt Registry",
          icon: "file-code-2",
          to: "/admin/ai/prompts",
          permission: "ai.prompts.read"
        }
      ]
    })
  ],
  pages: [
    definePage({
      id: "ai.runs.page",
      kind: "dashboard",
      route: "/admin/ai/runs",
      label: "Agent Runs",
      workspace: "ai",
      group: "operations",
      permission: "ai.runs.read",
      component: AiCoreAdminPage
    }),
    definePage({
      id: "ai.prompts.page",
      kind: "settings",
      route: "/admin/ai/prompts",
      label: "Prompt Registry",
      workspace: "ai",
      group: "governance",
      permission: "ai.prompts.read",
      component: PromptsPage
    }),
    definePage({
      id: "ai.approvals.page",
      kind: "queue",
      route: "/admin/ai/approvals",
      label: "Approval Queue",
      workspace: "ai",
      group: "operations",
      permission: "ai.approvals.read",
      component: ApprovalsPage
    }),
    definePage({
      id: "ai.replay.page",
      kind: "console",
      route: "/admin/ai/replay",
      label: "Replay Console",
      workspace: "ai",
      group: "operations",
      permission: "ai.replay.read",
      component: ReplayConsolePage
    })
  ],
  widgets: [
    defineWidget({
      id: "ai.active-runs",
      kind: "status",
      shell: "admin",
      slot: "dashboard.ai",
      permission: "ai.runs.read",
      title: "Durable Runs",
      component: ActiveRunsWidget,
      drillTo: "/admin/ai/runs"
    }),
    defineWidget({
      id: "ai.pending-approvals",
      kind: "inbox",
      shell: "admin",
      slot: "dashboard.ai",
      permission: "ai.approvals.read",
      title: "Pending Approvals",
      component: PendingApprovalsWidget,
      drillTo: "/admin/ai/approvals"
    })
  ],
  reports: [
    defineReport({
      id: "ai.run-usage",
      kind: "metric",
      route: "/admin/reports/ai-run-usage",
      label: "AI Run Usage",
      permission: "ai.reports.read",
      query: "ai.runs.usage",
      filters: [
        { key: "status", type: "select" },
        { key: "startedAt", type: "date-range" }
      ],
      export: ["csv", "json", "pdf"]
    })
  ],
  commands: [
    defineCommand({
      id: "ai.open.runs",
      label: "Open Agent Runs",
      permission: "ai.runs.read",
      href: "/admin/ai/runs",
      keywords: ["agents", "runtime", "durable"]
    }),
    defineCommand({
      id: "ai.open.prompts",
      label: "Open Prompt Registry",
      permission: "ai.prompts.read",
      href: "/admin/ai/prompts",
      keywords: ["prompt", "versions", "diff"]
    }),
    defineCommand({
      id: "ai.open.approvals",
      label: "Open AI Approval Queue",
      permission: "ai.approvals.read",
      href: "/admin/ai/approvals",
      keywords: ["approval", "queue", "human"]
    })
  ],
  searchProviders: [
    defineSearchProvider({
      id: "ai-core.search",
      scopes: ["runs", "prompts", "approvals", "replay"],
      permission: "ai.runs.read",
      search(query, ctx) {
        const lowered = query.toLowerCase();
        const results = [
          {
            id: "ai-search:runs",
            label: "Agent Runs",
            href: "/admin/ai/runs",
            kind: "page" as const,
            description: "Durable run timeline, budget use, and checkpoint state.",
            permission: "ai.runs.read"
          },
          {
            id: "ai-search:prompts",
            label: "Prompt Registry",
            href: "/admin/ai/prompts",
            kind: "page" as const,
            description: "Versioned prompts, diffs, and publication state.",
            permission: "ai.prompts.read"
          },
          {
            id: "ai-search:approvals",
            label: "AI Approval Queue",
            href: "/admin/ai/approvals",
            kind: "page" as const,
            description: "Pending human approvals for high-risk tool execution.",
            permission: "ai.approvals.read"
          },
          {
            id: "ai-search:report",
            label: "AI Run Usage",
            href: "/admin/reports/ai-run-usage",
            kind: "report" as const,
            description: "Usage, tokens, runtime, and replay-safe exports.",
            permission: "ai.reports.read"
          }
        ];

        return results.filter(
          (result) =>
            (!result.permission || ctx.permissions.has(result.permission)) &&
            `${result.label} ${result.description}`.toLowerCase().includes(lowered)
        );
      }
    })
  ]
};
