import type { PhiCmsRoutePresetDescriptor } from "../../../types/cms-module-descriptors";
import { PHI_ASSET_RUNTIME_MODULE_ID } from "./ids";
import { PHI_VIEWER_ACCESS_SITE_ADMIN } from "../../../types/access";
import {
  PHI_ADMIN_SETTINGS_NAV_ITEM_KEY,
} from "../area-definitions";

export const PHI_ASSET_RUNTIME_MODULE_ROUTES = [{
  ownerModuleId: PHI_ASSET_RUNTIME_MODULE_ID,
  presetKey: "builder-media-page",
  presetVersion: 1,
  area: "builder",
  pageKey: "media",
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
  loadTree: ({ page, runtime, catalog, activeModuleIds }) =>
    import("../../../components/regions/presets/phi-default-builder-area-preset-tree")
      .then((module) => module.buildPhiDefaultBuilderPagePresetTree({
        page,
        runtime,
        registry: catalog,
        activeModuleKeys: activeModuleIds,
        ownerModuleId: PHI_ASSET_RUNTIME_MODULE_ID,
        presetKey: "builder-media-page",
      })),
}, {
  ownerModuleId: PHI_ASSET_RUNTIME_MODULE_ID,
  presetKey: "admin-media-settings-page",
  presetVersion: 1,
  area: "admin",
  pageKey: "media-settings",
  title: "Media",
  path: "/",
  mount: { mountKey: "settings" },
  accessPolicy: PHI_VIEWER_ACCESS_SITE_ADMIN,
  navigation: [{
    navKey: "admin:sidebar",
    parentItemKey: PHI_ADMIN_SETTINGS_NAV_ITEM_KEY,
    item: {
      itemKey: "@phis/ui/modules/asset/nav/admin/settings",
      label: { defaultMessage: "Media" },
      icon: "antd:picture",
      routePresetKey: "admin-media-settings-page",
    },
  }],
  loadTree: ({ page, runtime }) =>
    import("../../../components/regions/presets/phi-default-admin-media-settings-page-tree")
      .then((module) => module.buildPhiDefaultAdminMediaSettingsPageTree({ page, runtime })),
}] satisfies readonly PhiCmsRoutePresetDescriptor[];
