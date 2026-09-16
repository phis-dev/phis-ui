import type { PhiCmsRoutePresetDescriptor } from "../../../types/cms-module-descriptors";
import { PHI_REVISIONS_RUNTIME_MODULE_ID } from "./ids";
import { PHI_BUILDER_PAGE_PRESET_VERSION } from "../../../components/regions/presets/phi-builder-page-preset-version";

export const PHI_REVISIONS_RUNTIME_MODULE_ROUTES = [{
  ownerModuleId: PHI_REVISIONS_RUNTIME_MODULE_ID,
  presetKey: "builder-revisions-page",
  presetVersion: 1 + PHI_BUILDER_PAGE_PRESET_VERSION,
  area: "builder",
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
  loadTree: ({ page, runtime, catalog }) =>
    import("../../../components/regions/presets/phi-default-builder-area-preset-tree")
      .then((module) => module.buildPhiDefaultBuilderPagePresetTree({
        page,
        runtime,
        registry: catalog,
        ownerModuleId: PHI_REVISIONS_RUNTIME_MODULE_ID,
        presetKey: "builder-revisions-page",
      })),
}] satisfies readonly PhiCmsRoutePresetDescriptor[];
