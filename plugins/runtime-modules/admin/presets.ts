import type {
  PhiCmsAreaShellPresetDescriptor,
  PhiCmsDescriptorBuildContext,
  PhiCmsRoutePresetDescriptor,
  PhiRuntimeModuleId,
} from "../../../types/cms-module-descriptors";
import { PHI_ADMIN_SETTINGS_NAV_ITEM_KEY } from "../area-definitions";
import { buildPhiAreaRootRoutePresetDescriptor } from "../area-root-route";
import { PhiCmsRegionType } from "../../../constants/phi-cms";
import {
  PHI_DEFAULT_PUB_AREA_COMPOSITION_NODE_KEYS,
} from "../preset-contracts/pub-area";
import { PHI_ADMIN_RUNTIME_MODULE_ID } from "./ids";
import {
  PHI_VIEWER_ACCESS_DEVELOPER_TOOLS,
  PHI_VIEWER_ACCESS_SITE_ADMIN,
} from "../../../types/access";

export const PHI_ADMIN_RUNTIME_MODULE_AREA_SHELLS = [{
  ownerModuleId: PHI_ADMIN_RUNTIME_MODULE_ID,
  presetKey: "admin-area-preset",
  shellPresetVersion: 1,
  area: "admin",
  loadTree: async ({ page, runtime }: PhiCmsDescriptorBuildContext) => {
    const [
      { buildPhiDefaultSiteAreaPresetTree },
      { buildPhiDefaultAdminAreaPresetTree },
      { mergePhiCmsShellTrees, omitPhiCmsShellCompositionNodes },
    ] = await Promise.all([
      import("../../../components/regions/presets/phi-default-site-area-preset-tree"),
      import("../../../components/regions/presets/phi-default-admin-area-preset-tree"),
      import("../shell-tree-composition"),
    ]);
    const [base, overlay] = await Promise.all([
      buildPhiDefaultSiteAreaPresetTree({
        page,
        runtime,
        presetKey: "admin-area-preset",
        ownerModuleId: PHI_ADMIN_RUNTIME_MODULE_ID,
        runtimeModuleArea: "admin",
      }),
      buildPhiDefaultAdminAreaPresetTree({ page, runtime }),
    ]);
    return mergePhiCmsShellTrees(
      omitPhiCmsShellCompositionNodes(
        base,
        { ownerModuleId: PHI_ADMIN_RUNTIME_MODULE_ID, presetKey: "admin-area-preset" },
        [PhiCmsRegionType.HeaderTop, PhiCmsRegionType.HeaderMain, PhiCmsRegionType.Footer],
        PHI_DEFAULT_PUB_AREA_COMPOSITION_NODE_KEYS,
      ),
      overlay,
    );
  },
}] satisfies readonly PhiCmsAreaShellPresetDescriptor[];

const ADMIN_OWNED_ROUTES = [
  {
    presetKey: "admin-settings-page",
    pageKey: "settings",
    title: "Settings",
    accessPolicy: PHI_VIEWER_ACCESS_SITE_ADMIN,
    path: "/settings",
    loadTree: (context: PhiCmsDescriptorBuildContext & {
      activeModuleIds: ReadonlySet<PhiRuntimeModuleId>;
    }) =>
      import("../../../components/regions/presets/phi-settings-root-redirect-tree")
        .then((module) => module.buildPhiSettingsRootRedirectTree({
          page: context.page,
          runtime: context.runtime,
          catalog: context.catalog,
          activeModuleIds: context.activeModuleIds,
          area: "admin",
          navKey: "admin:sidebar",
          containerItemKey: PHI_ADMIN_SETTINGS_NAV_ITEM_KEY,
          title: "Settings",
        })),
  },
  {
    presetKey: "admin-settings-general-page",
    pageKey: "settings-general",
    title: "General",
    accessPolicy: PHI_VIEWER_ACCESS_SITE_ADMIN,
    path: "/",
    mount: { mountKey: "settings" },
    loadTree: ({ page, runtime }: PhiCmsDescriptorBuildContext) =>
      import("../../../components/regions/presets/phi-default-admin-settings-page-tree")
        .then((module) => module.buildPhiDefaultAdminSettingsPageTree({ page, runtime })),
  },
].map((route) => ({
  presetVersion: 1,
  ...route,
  ownerModuleId: PHI_ADMIN_RUNTIME_MODULE_ID,
  area: "admin" as const,
}));

export const PHI_ADMIN_RUNTIME_MODULE_ROUTES = [
  buildPhiAreaRootRoutePresetDescriptor({
    ownerModuleId: PHI_ADMIN_RUNTIME_MODULE_ID,
    area: "admin",
    navKey: "admin:sidebar",
    title: "Admin",
    accessPolicy: PHI_VIEWER_ACCESS_DEVELOPER_TOOLS,
  }),
  ...ADMIN_OWNED_ROUTES,
] satisfies readonly PhiCmsRoutePresetDescriptor[];
