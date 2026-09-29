import type { PhiCmsRoutePresetDescriptor } from "../../../types/cms-module-descriptors";
import { PHI_ASSET_RUNTIME_MODULE_ID } from "./ids";
import { buildPhiSidebarRoutePresetDescriptor } from "../sidebar-route";

export const PHI_ASSET_RUNTIME_MODULE_ROUTES = [
  buildPhiSidebarRoutePresetDescriptor({
    area: "builder",
    anchor: "main",
    ownerModuleId: PHI_ASSET_RUNTIME_MODULE_ID,
    presetKey: "builder-media-page",
    title: "Media",
    path: "/media",
    itemKey: "@phis/ui/modules/asset/nav/builder/media",
    icon: "antd:picture",
    loadTree: ({ page, runtime, catalog }) =>
      import("../../../components/regions/presets/phi-default-builder-area-preset-tree")
        .then((module) => module.buildPhiDefaultBuilderPagePresetTree({
          page,
          runtime,
          registry: catalog,
          ownerModuleId: PHI_ASSET_RUNTIME_MODULE_ID,
          presetKey: "builder-media-page",
        })),
  }),
  buildPhiSidebarRoutePresetDescriptor({
    area: "admin",
    anchor: "settings",
    ownerModuleId: PHI_ASSET_RUNTIME_MODULE_ID,
    presetKey: "admin-media-settings-page",
    title: "Media",
    path: "/settings/media",
    itemKey: "@phis/ui/modules/asset/nav/admin/settings",
    icon: "antd:picture",
    loadTree: ({ page, runtime }) =>
      import("../../../components/regions/presets/phi-default-admin-media-settings-page-tree")
        .then((module) => module.buildPhiDefaultAdminMediaSettingsPageTree({ page, runtime })),
  }),
] satisfies readonly PhiCmsRoutePresetDescriptor[];
