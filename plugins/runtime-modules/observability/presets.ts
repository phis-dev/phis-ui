import type { PhiCmsRoutePresetDescriptor } from "../../../types/cms-module-descriptors";
import { PHI_OBSERVABILITY_RUNTIME_MODULE_ID } from "./ids";
import { PHI_VIEWER_ACCESS_DEVELOPER_TOOLS } from "../../../types/access";

export const PHI_OBSERVABILITY_RUNTIME_MODULE_ROUTES = [{
  ownerModuleId: PHI_OBSERVABILITY_RUNTIME_MODULE_ID,
  presetKey: "admin-logs-page",
  presetVersion: 1,
  area: "admin",
  pageKey: "logs",
  title: "Logs",
  accessPolicy: PHI_VIEWER_ACCESS_DEVELOPER_TOOLS,
  path: "/logs",
  navigation: [{
    navKey: "admin:sidebar",
    parentItemKey: null,
    before: "@phis/ui/modules/admin/nav/settings",
    item: {
      itemKey: "@phis/ui/modules/observability/nav/admin/logs",
      label: { defaultMessage: "Logs" },
      icon: "antd:file-search",
      routePresetKey: "admin-logs-page",
    },
  }],
  loadTree: ({ page, runtime }) =>
    import("../../../components/regions/presets/phi-default-admin-logs-page-tree")
      .then((module) => module.buildPhiDefaultAdminLogsPageTree({ page, runtime })),
}] satisfies readonly PhiCmsRoutePresetDescriptor[];
