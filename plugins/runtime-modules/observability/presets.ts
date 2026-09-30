import type { PhiCmsRoutePresetDescriptor } from "../../../types/cms-module-descriptors";
import { buildPhiSidebarRoutePresetDescriptor } from "../sidebar-route";
import { PHI_OBSERVABILITY_RUNTIME_MODULE_ID } from "./ids";

export const PHI_OBSERVABILITY_RUNTIME_MODULE_ROUTES = [
  buildPhiSidebarRoutePresetDescriptor({
    area: "admin",
    anchor: "main",
    ownerModuleId: PHI_OBSERVABILITY_RUNTIME_MODULE_ID,
    presetKey: "admin-logs-page",
    title: "Logs",
    path: "/logs",
    itemKey: "@phis/ui/modules/observability/nav/admin/logs",
    icon: "antd:file-search",
    loadTree: ({ page, runtime }) =>
      import("./trees/phi-default-admin-logs-page-tree")
        .then((module) => module.buildPhiDefaultAdminLogsPageTree({ page, runtime })),
  }),
] satisfies readonly PhiCmsRoutePresetDescriptor[];
