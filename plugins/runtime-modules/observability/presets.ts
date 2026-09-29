import type { PhiCmsRoutePresetDescriptor } from "../../../types/cms-module-descriptors";
import { buildPhiAdminSidebarRoutePresetDescriptor } from "../admin-sidebar-route";
import { PHI_OBSERVABILITY_RUNTIME_MODULE_ID } from "./ids";

export const PHI_OBSERVABILITY_RUNTIME_MODULE_ROUTES = [
  buildPhiAdminSidebarRoutePresetDescriptor({
    ownerModuleId: PHI_OBSERVABILITY_RUNTIME_MODULE_ID,
    presetKey: "admin-logs-page",
    title: "Logs",
    path: "/logs",
    placement: "sidebar",
    itemKey: "@phis/ui/modules/observability/nav/admin/logs",
    icon: "antd:file-search",
    loadTree: ({ page, runtime }) =>
      import("../../../components/regions/presets/phi-default-admin-logs-page-tree")
        .then((module) => module.buildPhiDefaultAdminLogsPageTree({ page, runtime })),
  }),
] satisfies readonly PhiCmsRoutePresetDescriptor[];
