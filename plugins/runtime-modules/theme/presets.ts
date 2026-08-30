import type { PhiCmsRoutePresetDescriptor } from "../../../types/cms-module-descriptors";
import { PHI_THEME_RUNTIME_MODULE_ID } from "./ids";

export const PHI_THEME_RUNTIME_MODULE_ROUTES = [{
  ownerModuleId: PHI_THEME_RUNTIME_MODULE_ID,
  presetKey: "builder-theme-page",
  presetVersion: 1,
  area: "builder",
  pageKey: "theme",
  title: "Theme",
  path: "/theme",
  navigation: [{
    navKey: "builder:sidebar",
    parentItemKey: null,
    after: "@phis/ui/builder/nav/navigation",
    item: {
      itemKey: "@phis/ui/theme/nav/builder/theme",
      label: { defaultMessage: "Theme" },
      icon: "antd:skin",
      routePresetKey: "builder-theme-page",
    },
  }],
  loadTree: ({ page, runtime, catalog, activeModuleIds }) =>
    import("../../../components/regions/presets/phi-default-builder-area-preset-tree")
      .then((module) => module.buildPhiDefaultBuilderPagePresetTree({
        page,
        runtime,
        registry: catalog,
        activeModuleKeys: activeModuleIds,
        ownerModuleId: PHI_THEME_RUNTIME_MODULE_ID,
        presetKey: "builder-theme-page",
      })),
}] satisfies readonly PhiCmsRoutePresetDescriptor[];
