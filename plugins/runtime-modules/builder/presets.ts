import { PHI_BASE_PAGE_LAYOUT_VERSION } from "../../../components/regions/presets/phi-base-page-layout";
import type {
  PhiCmsAreaShellPresetDescriptor,
  PhiCmsRoutePresetDescriptor,
} from "../../../types/cms-module-descriptors";
import { buildPhiAreaRootRoutePresetDescriptor } from "../area-root-route";
import { PHI_BUILDER_RUNTIME_MODULE_ID } from "./ids";

export const PHI_BUILDER_RUNTIME_MODULE_AREA_SHELLS = [{
  ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
  presetKey: "builder-area-preset",
  shellPresetVersion: 1,
  area: "builder",
  loadTree: ({ page, runtime }) =>
    import("../../../components/regions/presets/phi-default-builder-area-preset-tree")
      .then((module) => module.buildPhiDefaultBuilderAreaPresetTree({ page, runtime })),
}] satisfies readonly PhiCmsAreaShellPresetDescriptor[];

const BUILDER_ROUTE_PRESETS = [
  { presetKey: "builder-shells-page", pageKey: "shells", title: "Shells", path: "/shells" },
  { presetKey: "builder-pages-page", pageKey: "pages", title: "Pages", path: "/pages" },
  { presetKey: "builder-navigation-page", pageKey: "navigation", title: "Navigation", path: "/navigation" },
  { presetKey: "builder-modules-page", pageKey: "modules", title: "Modules", path: "/modules" },
] as const;

const BUILDER_WORKSPACE_ROUTES = BUILDER_ROUTE_PRESETS.map((route) => ({
  ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
  presetKey: route.presetKey,
  presetVersion: 1,
  area: "builder" as const,
  pageKey: route.pageKey,
  title: route.title,
  path: route.path,
  loadTree: ({ page, runtime, catalog, activeModuleIds }) =>
    import("../../../components/regions/presets/phi-default-builder-area-preset-tree")
      .then((module) => module.buildPhiDefaultBuilderPagePresetTree({
        page,
        runtime,
        registry: catalog,
        activeModuleKeys: activeModuleIds,
        ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
        presetKey: route.presetKey,
      })),
})) satisfies readonly PhiCmsRoutePresetDescriptor[];

/**
 * The Builder Settings container (SETTINGS.md sections 2 and 5): a navigation container with no address
 * of its own, into which the base Module's General page and any other Module's Settings page hang
 * themselves through the shared mount.
 */
const BUILDER_SETTINGS_ROUTES = [
  {
    ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
    presetKey: "builder-settings-general-page",
    presetVersion: 1 + PHI_BASE_PAGE_LAYOUT_VERSION,
    area: "builder" as const,
    pageKey: "settings-general",
    title: "General",
    path: "/settings/general",
    mount: { mountKey: "settings" },
    loadTree: ({ page, runtime }) =>
      import("../../../components/regions/presets/phi-default-builder-settings-page-tree")
        .then((module) => module.buildPhiDefaultBuilderSettingsPageTree({ page, runtime })),
  },
] satisfies readonly PhiCmsRoutePresetDescriptor[];

export const PHI_BUILDER_RUNTIME_MODULE_ROUTES = [
  buildPhiAreaRootRoutePresetDescriptor({
    ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
    area: "builder",
    navKey: "builder:sidebar",
    title: "Builder",
  }),
  ...BUILDER_WORKSPACE_ROUTES,
  ...BUILDER_SETTINGS_ROUTES,
] satisfies readonly PhiCmsRoutePresetDescriptor[];
