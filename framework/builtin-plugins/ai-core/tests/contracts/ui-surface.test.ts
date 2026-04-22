import { describe, expect, it } from "bun:test";
import { adminContributions } from "../../src/ui/admin.contributions";
import { uiSurface } from "../../src/ui/surfaces";

describe("ui surface registration", () => {
  it("keeps a compatibility admin page for the built-in AI desk", () => {
    expect(uiSurface.embeddedPages).toHaveLength(1);
    expect(uiSurface.embeddedPages[0]?.route).toBe("/admin/ai-core");
  });

  it("registers the shared AI workspace, governed pages, widgets, and reports", () => {
    expect(adminContributions.workspaces[0]?.id).toBe("ai");
    expect(adminContributions.pages.map((page) => page.route)).toContain("/admin/ai/runs");
    expect(adminContributions.pages.map((page) => page.route)).toContain("/admin/ai/prompts");
    expect(adminContributions.pages.map((page) => page.route)).toContain("/admin/ai/approvals");
    expect(adminContributions.pages.map((page) => page.route)).toContain("/admin/ai/replay");
    expect(adminContributions.pages.map((page) => page.route)).toContain("/admin/tools/workflow-builder");
    expect(adminContributions.pages.map((page) => page.route)).toContain("/admin/tools/approval-builder");
    expect(adminContributions.widgets.map((widget) => widget.id)).toContain("ai.active-runs");
    expect(adminContributions.reports[0]?.route).toBe("/admin/reports/ai-run-usage");
  });
});
