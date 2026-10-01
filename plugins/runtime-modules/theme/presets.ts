import type { PhiCmsRoutePresetDescriptor } from "../../../types/cms-module-descriptors";
import { buildPhiSidebarRoutePresetDescriptor } from "../sidebar-route";
import { PHI_THEME_RUNTIME_MODULE_ID } from "./ids";

export const PHI_THEME_RUNTIME_MODULE_ROUTES = [
  buildPhiSidebarRoutePresetDescriptor({
    area: "builder",
    anchor: "main",
    ownerModuleId: PHI_THEME_RUNTIME_MODULE_ID,
    presetKey: "builder-theme-page",
    title: "Theme",
    path: "/theme",
    itemKey: "@phis/ui/theme/nav/builder/theme",
    icon: "antd:skin",
    loadTree: ({ page, runtime, catalog }) =>
      import("./trees/phi-default-builder-theme-page-tree")
        .then((module) => module.buildPhiDefaultBuilderThemePageTree({ page, runtime, registry: catalog })),
  }),
] satisfies readonly PhiCmsRoutePresetDescriptor[];
