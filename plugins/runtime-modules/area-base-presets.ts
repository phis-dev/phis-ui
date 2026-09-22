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
    /*
     * The Site shell with a left sider added, rather than a shell of its own.
     *
     * App's header and footer are Public's -- one Brand, one account trigger, one description of both.
     * What App has that Public does not is somewhere for the Modules a signed-in person works with,
     * and that is the whole of the overlay. Nothing is omitted from the base, so the two trees cannot
     * disagree about a Region: composition refuses a Region type stated twice.
     */
    loadTree: async ({ page, runtime }: PhiCmsDescriptorBuildContext) => {
      const [
        { buildPhiDefaultSiteAreaPresetTree },
        { buildPhiDefaultAppAreaPresetTree },
        { mergePhiCmsShellTrees },
      ] = await Promise.all([
        import("../../components/regions/presets/phi-default-site-area-preset-tree"),
        import("../../components/regions/presets/phi-default-app-area-preset-tree"),
        import("./shell-tree-composition"),
      ]);
      const [base, overlay] = await Promise.all([
        buildPhiDefaultSiteAreaPresetTree({
          page,
          runtime,
          presetKey: "app-area-preset",
          ownerModuleId: PHI_APP_RUNTIME_MODULE_ID,
          runtimeModuleArea: "app",
        }),
        buildPhiDefaultAppAreaPresetTree({ page, runtime }),
      ]);
      return mergePhiCmsShellTrees(base, overlay);
    },
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
  {
    ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
    presetKey: "public-welcome-page",
    presetVersion: 1,
    area: "public",
    title: "Home",
    path: "/",
    /*
     * It stands at `/` without offering itself for it.
     *
     * The base landing is what the root slot falls back to, which the base-Module rung of
     * `choosePhiAreaRootApplicant` already says. Declaring it an offer as well would put one offer on
     * the table for every Site, so a Site package offering a landing would arrive as the second and
     * would no longer cover this one on activation.
     */
    loadTree: ({ page, runtime }: PhiCmsDescriptorBuildContext) =>
      import("../../components/regions/presets/phi-default-pub-welcome-page-tree")
        .then((module) => module.buildPhiDefaultPubWelcomePageTree({ page, runtime })),
  },
  {
    ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
    presetKey: "public-home-page",
    presetVersion: 1,
    area: "public",
    title: "Home",
    path: "/home",
    /*
     * The one Page Core brings that a visitor is meant to arrive at, so it stands first in the header.
     *
     * A Site package that contributes its own landing places a Home entry of its own before the terms
     * (`@phis/example`), and then the header names two. That is the Site's to sort out in the Builder,
     * and the lesser of the two problems: the Welcome Page sends people to `/home` from its first
     * render, and a destination nothing links to is the one nobody finds their way back to.
     */
    navigation: [
      {
        navKey: "public:header",
        parentItemKey: null,
        before: "@phis/ui/modules/public/nav/terms",
        item: {
          itemKey: "@phis/ui/modules/public/nav/home",
          label: { defaultMessage: "Home" },
          icon: "antd:home",
          routePresetKey: "public-home-page",
        },
      },
    ],
    loadTree: ({ page }: PhiCmsDescriptorBuildContext) =>
      import("../../components/regions/presets/phi-default-pub-home-page-tree")
        .then((module) => module.buildPhiDefaultPubHomePageTree({ page })),
  },
  buildPhiAreaRootRoutePresetDescriptor({
    ownerModuleId: PHI_APP_RUNTIME_MODULE_ID,
    area: "app",
    title: "App",
  }),
  /*
   * What a person has settled about their own account: their name, the language they read in.
   *
   * It sat with the Auth Module, which owned the route while Core owned every Widget on it. Nothing
   * about a name or a language depends on how somebody signs in -- a Site that switches to a
   * directory, or switches Auth off while sessions keep working, would have lost the Page that says
   * what they are called. AUTHENTICATION.md section 5 already said so: profile administration does
   * not become Auth's merely by appearing in its menu.
   *
   * The Area's own Settings child, so it is declared here rather than injected -- SETTINGS.md section
   * 5, the same standing Admin and Builder give their General page.
   */
  {
    ownerModuleId: PHI_APP_RUNTIME_MODULE_ID,
    presetKey: "app-profile-page",
    presetVersion: 1 + PHI_BASE_PAGE_LAYOUT_VERSION,
    area: "app" as const,
    title: "Profile",
    path: "/settings/profile",
    mount: { mountKey: "settings" },
    loadTree: ({ page, runtime }: PhiCmsDescriptorBuildContext) =>
      import("../../components/regions/presets/phi-default-app-profile-page-tree")
        .then((module) => module.buildPhiDefaultAppProfilePageTree({ page, runtime })),
  },
  ...([401, 403, 404] as const).map((code) => ({
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
    loadTree: ({ page }) =>
      import("../../components/regions/presets/phi-default-pub-contact-page-tree")
        .then((module) => module.buildPhiDefaultPubContactPageTree({ page })),
  },
] satisfies readonly PhiCmsRoutePresetDescriptor[];
