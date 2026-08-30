import type { PhiCmsRoutePresetDescriptor } from "../../../types/cms-module-descriptors";
import { PHI_REVISIONS_RUNTIME_MODULE_ID } from "./ids";

export const PHI_REVISIONS_RUNTIME_MODULE_ROUTES = [{
  ownerModuleId: PHI_REVISIONS_RUNTIME_MODULE_ID,
  presetKey: "builder-revisions-page",
  presetVersion: 1,
  area: "builder",
  pageKey: "revisions",
  title: "Revisions",
  path: "/revisions",
  navigation: [{
    navKey: "builder:sidebar",
    parentItemKey: null,
    before: "@phis/ui/builder/nav/settings",
    item: {
      itemKey: "@phis/ui/modules/revisions/nav/builder/revisions",
      label: { defaultMessage: "Revisions" },
      icon: "antd:history",
      routePresetKey: "builder-revisions-page",
    },
  }],
  loadTree: ({ page, runtime, catalog, activeModuleIds }) =>
    import("../../../components/regions/presets/phi-default-builder-area-preset-tree")
      .then((module) => module.buildPhiDefaultBuilderPagePresetTree({
        page,
        runtime,
        registry: catalog,
        activeModuleKeys: activeModuleIds,
        ownerModuleId: PHI_REVISIONS_RUNTIME_MODULE_ID,
        presetKey: "builder-revisions-page",
      })),
}] satisfies readonly PhiCmsRoutePresetDescriptor[];
