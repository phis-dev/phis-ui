import type { PhiCmsRoutePresetDescriptor } from "../../../types/cms-module-descriptors";
import { buildPhiSidebarRoutePresetDescriptor } from "../sidebar-route";
import { PHI_LOCALIZATION_RUNTIME_MODULE_ID } from "./ids";

export const PHI_LOCALIZATION_RUNTIME_MODULE_ROUTES = [
  buildPhiSidebarRoutePresetDescriptor({
    area: "admin",
    anchor: "main",
    ownerModuleId: PHI_LOCALIZATION_RUNTIME_MODULE_ID,
    presetKey: "admin-locales-page",
    title: "Locales",
    path: "/locales",
    itemKey: "@phis/ui/modules/localization/nav/admin/locales",
    icon: "antd:translation",
    loadTree: ({ page, runtime }) =>
      import("./trees/phi-default-admin-locales-page-tree")
        .then((module) => module.buildPhiDefaultAdminLocalesPageTree({ page, runtime })),
  }),
] satisfies readonly PhiCmsRoutePresetDescriptor[];
