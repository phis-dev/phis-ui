import type { PhiCmsRoutePresetDescriptor } from "../../../types/cms-module-descriptors";
import { PHI_DASHBOARD_RUNTIME_MODULE_ID } from "./ids";

export const PHI_DASHBOARD_RUNTIME_MODULE_ROUTES = [
  {
    ownerModuleId: PHI_DASHBOARD_RUNTIME_MODULE_ID,
    presetKey: "admin-dashboard-page",
    presetVersion: 1,
    area: "admin",
    pageKey: "dashboard",
    title: "Dashboard",
    path: "/dashboard",
    navigation: [{
      navKey: "admin:sidebar",
      parentItemKey: null,
      before: "@phis/ui/modules/admin/nav/settings",
      item: {
        itemKey: "@phis/ui/modules/dashboard/nav/admin/dashboard",
        label: { defaultMessage: "Dashboard" },
        icon: "antd:dashboard",
        routePresetKey: "admin-dashboard-page",
      },
    }],
    loadTree: ({ page, runtime }) =>
      import("../../../components/regions/presets/phi-default-admin-dashboard-page-tree")
        .then((module) => module.buildPhiDefaultAdminDashboardPageTree({ page, runtime })),
  },
  {
    ownerModuleId: PHI_DASHBOARD_RUNTIME_MODULE_ID,
    presetKey: "builder-dashboard-page",
    presetVersion: 1,
    area: "builder",
    pageKey: "dashboard",
    title: "Dashboard",
    path: "/dashboard",
    navigation: [{
      navKey: "builder:sidebar",
      parentItemKey: null,
      before: "@phis/ui/builder/nav/modules",
      item: {
        itemKey: "@phis/ui/modules/dashboard/nav/builder/dashboard",
        label: { defaultMessage: "Dashboard" },
        icon: "antd:dashboard",
        routePresetKey: "builder-dashboard-page",
      },
    }],
    loadTree: ({ page, runtime }) =>
      import("../../../components/regions/presets/phi-default-builder-dashboard-page-tree")
        .then((module) => module.buildPhiDefaultBuilderDashboardPageTree({ page, runtime })),
  },
] satisfies readonly PhiCmsRoutePresetDescriptor[];
