import type {
  PhiCmsAreaShellPresetDescriptor,
  PhiCmsDescriptorBuildContext,
  PhiCmsRoutePresetDescriptor,
  PhiCmsThemePresetDescriptor,
} from "../../types/cms-module-descriptors";
import {
  PHI_DEFAULT_PUB_AREA_COMPOSITION_NODE_KEYS,
  PHI_DEFAULT_PUB_AREA_PRESET_KEY,
} from "./preset-contracts/pub-area";
import { PhiCmsFlags } from "../../constants/phi-cms";
import { PHI_CORE_RUNTIME_MODULE_ID } from "./core/ids";
import { PHI_ACCOUNTING_RUNTIME_MODULE_ID } from "./accounting/ids";
import { PHI_APP_RUNTIME_MODULE_ID } from "./app/ids";
import { PHI_PUBLIC_RUNTIME_MODULE_ID } from "./public/ids";
import { PHI_CORE_THEME_PRESET_PLUGINS } from "../../theme/phi-theme-presets";
import { buildPhiAreaRootRoutePresetDescriptor } from "./area-root-route";
import { PHI_BASE_PAGE_LAYOUT_VERSION } from "../../components/regions/presets/phi-base-page-layout";

export const PHI_AREA_BASE_RUNTIME_MODULE_AREA_SHELLS = [
  {
    ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
    presetKey: PHI_DEFAULT_PUB_AREA_PRESET_KEY,
    shellPresetVersion: 1,
    area: "public",
    exportedNodeKeys: PHI_DEFAULT_PUB_AREA_COMPOSITION_NODE_KEYS,
    loadTree: ({ page, runtime }: PhiCmsDescriptorBuildContext) =>
      import("../../components/regions/presets/phi-default-site-area-preset-tree")
        .then((module) => module.buildPhiDefaultSiteAreaPresetTree({
          page,
          runtime,
          presetKey: PHI_DEFAULT_PUB_AREA_PRESET_KEY,
          ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
          runtimeModuleArea: "public",
        })),
  },
  {
    ownerModuleId: PHI_APP_RUNTIME_MODULE_ID,
    presetKey: "app-area-preset",
    shellPresetVersion: 1,
    area: "app",
    loadTree: ({ page, runtime }: PhiCmsDescriptorBuildContext) =>
      import("../../components/regions/presets/phi-default-site-area-preset-tree")
        .then((module) => module.buildPhiDefaultSiteAreaPresetTree({
          page,
          runtime,
          presetKey: "app-area-preset",
          ownerModuleId: PHI_APP_RUNTIME_MODULE_ID,
          runtimeModuleArea: "app",
        })),
  },
  ...([
    ["accounting", PHI_ACCOUNTING_RUNTIME_MODULE_ID],
  ] as const).map(([area, ownerModuleId]) => ({
    ownerModuleId,
    presetKey: `${area}-area-preset`,
    shellPresetVersion: 1,
    area,
    loadTree: ({ page, runtime }: PhiCmsDescriptorBuildContext) =>
      import("../../components/regions/presets/phi-default-site-area-preset-tree")
        .then((module) => module.buildPhiDefaultSiteAreaPresetTree({
          page,
          runtime,
          presetKey: `${area}-area-preset`,
          ownerModuleId,
          runtimeModuleArea: area,
        })),
  })),
] satisfies readonly PhiCmsAreaShellPresetDescriptor[];

export const PHI_AREA_BASE_RUNTIME_MODULE_ROUTES = [
  buildPhiAreaRootRoutePresetDescriptor({
    ownerModuleId: PHI_APP_RUNTIME_MODULE_ID,
    area: "app",
    title: "App",
  }),
  ...([401, 403, 404, 500] as const).map((code) => ({
    ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
    presetKey: `public-error-${code}-page`,
    presetVersion: 1,
    area: "public" as const,
    title: String(code),
    path: `/error/${code}`,
    /*
     * An error Page is what a failed request shows, not something to be found: listed in a search
     * result it would send a visitor straight to "not found". Unindexed by default, like the sign-in
     * Pages, and the Site can still decide otherwise.
     */
    defaultPageFlags: PhiCmsFlags.NoIndex,
    loadTree: ({ page }: PhiCmsDescriptorBuildContext) =>
      import("../../components/regions/presets/phi-default-pub-error-page-tree")
        .then((module) => module.buildPhiDefaultPubErrorPageTree({ code, page })),
  })),
  {
    ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
    presetKey: "public-terms-page",
    presetVersion: 2,
    area: "public",
    title: "Terms and Conditions",
    path: "/terms-and-conditions",
    loadTree: ({ page }) =>
      import("../../components/regions/presets/phi-default-pub-terms-page-tree")
        .then((module) => module.buildPhiDefaultPubTermsPageTree({ page })),
  },
  buildPhiAreaRootRoutePresetDescriptor({
    ownerModuleId: PHI_ACCOUNTING_RUNTIME_MODULE_ID,
    area: "accounting",
    title: "Accounting",
  }),
  {
    ownerModuleId: PHI_ACCOUNTING_RUNTIME_MODULE_ID,
    presetKey: "accounting-overview-page",
    presetVersion: 1 + PHI_BASE_PAGE_LAYOUT_VERSION,
    area: "accounting",
    title: "Overview",
    path: "/overview",
    loadTree: ({ page, runtime }: PhiCmsDescriptorBuildContext) =>
      import("../../components/regions/presets/phi-default-accounting-page-tree")
        .then((module) => module.buildPhiDefaultAccountingPageTree({ page, runtime })),
  },
] satisfies readonly PhiCmsRoutePresetDescriptor[];

export const PHI_CORE_RUNTIME_MODULE_THEMES = PHI_CORE_THEME_PRESET_PLUGINS.map((preset) => ({
  ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
  presetKey: `${preset.key}-theme-preset`,
  presetVersion: 1,
  themeKey: preset.key,
  title: preset.title,
  ...(preset.description ? { description: preset.description } : {}),
  loadPreset: () => preset,
})) satisfies readonly PhiCmsThemePresetDescriptor[];

/**
 * The Public form pages, in their own list because they appear only where Forms are allowed. The
 * contact page is Core's like the terms: every Site starts with a way to be reached, and neither is
 * a landing -- the front door is the Site package's business.
 */
export const PHI_PUBLIC_FORM_RUNTIME_MODULE_ROUTES = [
  {
    ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
    presetKey: "public-contact-page",
    presetVersion: 1,
    area: "public",
    title: "Contact",
    path: "/contact",
    navigation: [
      {
        navKey: "public:header",
        parentItemKey: null,
        after: "@phis/ui/modules/public/nav/terms",
        item: {
          itemKey: "@phis/ui/modules/public/nav/contact",
          label: { defaultMessage: "Contact" },
          icon: "antd:mail",
          routePresetKey: "public-contact-page",
        },
      },
      {
        navKey: "public:footer",
        parentItemKey: null,
        after: "@phis/ui/modules/public/nav/terms",
        item: {
          itemKey: "@phis/ui/modules/public/nav/contact",
          label: { defaultMessage: "Contact" },
          routePresetKey: "public-contact-page",
        },
      },
    ],
    loadTree: ({ page, runtime }) =>
      import("../../components/regions/presets/phi-default-pub-contact-page-tree")
        .then((module) => module.buildPhiDefaultPubContactPageTree({ page, runtime })),
  },
] satisfies readonly PhiCmsRoutePresetDescriptor[];
