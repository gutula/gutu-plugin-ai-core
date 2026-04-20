import { defineUiSurface } from "@platform/ui-shell";
import { AiCoreAdminPage } from "./admin/main.page";

export const uiSurface = defineUiSurface({
  embeddedPages: [
    {
      shell: "admin",
      route: "/admin/ai-core",
      component: AiCoreAdminPage,
      permission: "ai.runs.read"
    }
  ],
  widgets: []
});
