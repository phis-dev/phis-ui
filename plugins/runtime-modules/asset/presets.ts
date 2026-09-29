import type { PhiCmsRoutePresetDescriptor } from "../../../types/cms-module-descriptors";
import { PHI_BUILDER_PAGE_PRESET_VERSION } from "../../../components/regions/presets/phi-builder-page-preset-version";
import { PHI_ASSET_RUNTIME_MODULE_ID } from "./ids";
import { buildPhiAdminSidebarRoutePresetDescriptor } from "../admin-sidebar-route";

export const PHI_ASSET_RUNTIME_MODULE_ROUTES = [{
  ownerModuleId: PHI_ASSET_RUNTIME_MODULE_ID,
  presetKey: "builder-media-page",
  presetVersion: 1 + PHI_BUILDER_PAGE_PRESET_VERSION,
  area: "builder",
  title: "Media",
  path: "/media",
  navigation: [{
    navKey: "builder:sidebar",
    parentItemKey: null,
    after: "@phis/ui/builder/nav/settings",
    item: {
      itemKey: "@phis/ui/modules/asset/nav/builder/media",
      label: { defaultMessage: "Media" },
      icon: "antd:picture",
      routePresetKey: "builder-media-page",
    },
  }],
  loadTree: ({ page, runtime, catalog }) =>
    import("../../../components/regions/presets/phi-default-builder-area-preset-tree")
      .then((module) => module.buildPhiDefaultBuilderPagePresetTree({
        page,
        runtime,
        registry: catalog,
        ownerModuleId: PHI_ASSET_RUNTIME_MODULE_ID,
        presetKey: "builder-media-page",
      })),
}, buildPhiAdminSidebarRoutePresetDescriptor({
  ownerModuleId: PHI_ASSET_RUNTIME_MODULE_ID,
  presetKey: "admin-media-settings-page",
  title: "Media",
  path: "/settings/media",
  placement: "settings",
  itemKey: "@phis/ui/modules/asset/nav/admin/settings",
  icon: "antd:picture",
  loadTree: ({ page, runtime }) =>
    import("../../../components/regions/presets/phi-default-admin-media-settings-page-tree")
      .then((module) => module.buildPhiDefaultAdminMediaSettingsPageTree({ page, runtime })),
})] satisfies readonly PhiCmsRoutePresetDescriptor[];
