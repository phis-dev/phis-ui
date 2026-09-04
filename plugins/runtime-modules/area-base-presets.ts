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
import { PHI_CORE_RUNTIME_MODULE_ID } from "./core/ids";
import { PHI_ACCOUNTING_RUNTIME_MODULE_ID } from "./accounting/ids";
import { PHI_APP_RUNTIME_MODULE_ID } from "./app/ids";
import { PHI_PUBLIC_RUNTIME_MODULE_ID } from "./public/ids";
import { PHI_AUTH_RUNTIME_MODULE_ID } from "./auth/ids";
import { PHI_CORE_THEME_PRESET_PLUGINS } from "../../theme/phi-theme-presets";
import { PHI_VIEWER_ACCESS_SITE_ADMIN } from "../../types/access";
import {
  PHI_ADMIN_SETTINGS_NAV_ITEM_KEY,
} from "./area-definitions";
import { buildPhiAreaRootRoutePresetDescriptor } from "./area-root-route";

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
  {
    ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
    presetKey: "public-welcome-page",
    pageKey: "home",
    presetVersion: 1,
    area: "public",
    title: "Home",
    path: "/",
    loadTree: ({ page, runtime }) =>
      import("../../components/regions/presets/phi-default-pub-welcome-page-tree")
        .then((module) => module.buildPhiDefaultPubWelcomePageTree({
          page,
          runtime,
          includeLandingChrome: true,
        })),
  },
  buildPhiAreaRootRoutePresetDescriptor({
    ownerModuleId: PHI_APP_RUNTIME_MODULE_ID,
    area: "app",
    navKey: "app:sidebar",
    title: "App",
  }),
  {
    ownerModuleId: PHI_APP_RUNTIME_MODULE_ID,
    presetKey: "app-home-page",
    pageKey: "home",
    presetVersion: 1,
    area: "app",
    title: "Home",
    path: "/home",
    loadTree: ({ page, runtime }) =>
      import("../../components/regions/presets/phi-default-pub-welcome-page-tree")
        .then((module) => module.buildPhiDefaultPubWelcomePageTree({ page, runtime })),
  },
  ...([401, 403, 404, 500] as const).map((code) => ({
    ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
    presetKey: `public-error-${code}-page`,
    pageKey: String(code),
    presetVersion: 1,
    area: "public" as const,
    title: String(code),
    path: `/error/${code}`,
    loadTree: ({ page }: PhiCmsDescriptorBuildContext) =>
      import("../../components/regions/presets/phi-default-pub-error-page-tree")
        .then((module) => module.buildPhiDefaultPubErrorPageTree({ code, page })),
  })),
  {
    ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
    presetKey: "public-terms-page",
    pageKey: "terms-and-conditions",
    presetVersion: 1,
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
    navKey: "accounting:sidebar",
    title: "Accounting",
  }),
  {
    ownerModuleId: PHI_ACCOUNTING_RUNTIME_MODULE_ID,
    presetKey: "accounting-overview-page",
    pageKey: "overview",
    presetVersion: 1,
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

const FORM_ROUTE_TEMPLATES = [
  {
    key: "registration",
    pageKey: "register",
    title: "Register",
    path: "/register",
    loadTree: (presetKey: string, { page, runtime }: PhiCmsDescriptorBuildContext) =>
      import("../../components/regions/presets/phi-default-pub-registration-page-tree")
        .then((module) => module.buildPhiDefaultPubRegistrationPageTree({ page, runtime, presetKey })),
  },
  {
    key: "login",
    pageKey: "login",
    title: "Login",
    path: "/login",
    loadTree: (presetKey: string, { page, runtime }: PhiCmsDescriptorBuildContext) =>
      import("../../components/regions/presets/phi-default-pub-login-page-tree")
        .then((module) => module.buildPhiDefaultPubLoginPageTree({ page, runtime, presetKey })),
  },
  {
    key: "confirm",
    pageKey: "confirm",
    title: "Confirm",
    path: "/confirm",
    loadTree: (presetKey: string, { page, runtime }: PhiCmsDescriptorBuildContext) =>
      import("../../components/regions/presets/phi-default-pub-confirm-page-tree")
        .then((module) => module.buildPhiDefaultPubConfirmPageTree({ page, runtime, presetKey })),
  },
  {
    key: "reset-password",
    pageKey: "reset-password",
    title: "Reset Password",
    path: "/reset-password",
    loadTree: (presetKey: string, { page, runtime }: PhiCmsDescriptorBuildContext) =>
      import("../../components/regions/presets/phi-default-pub-reset-password-page-tree")
        .then((module) => module.buildPhiDefaultPubResetPasswordPageTree({ page, runtime, presetKey })),
  },
] as const;

function buildFormRouteNavigation(template: (typeof FORM_ROUTE_TEMPLATES)[number]) {
  const item = {
    itemKey: `@phis/ui/modules/auth/nav/public/${template.key}`,
    label: { defaultMessage: template.title },
    routePresetKey: `public-${template.key}-page`,
  } as const;

  if (template.key === "registration") {
    return [{
      navKey: "public:header",
      parentItemKey: null,
      after: "@phis/ui/modules/public/nav/home",
      item,
    }] as const;
  }
  return [];
}

export const PHI_AUTH_RUNTIME_MODULE_ROUTES = [
  ...FORM_ROUTE_TEMPLATES.map((template) => {
    const presetKey = `public-${template.key}-page`;
    return {
      ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
      presetKey,
      presetVersion: 1,
      area: "public" as const,
      pageKey: template.pageKey,
      title: template.title,
      path: template.path,
      navigation: buildFormRouteNavigation(template),
      loadTree: (context: PhiCmsDescriptorBuildContext) => template.loadTree(presetKey, context),
    };
  }),
  {
    ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
    presetKey: "public-logout-page",
    presetVersion: 1,
    area: "public",
    pageKey: "logout",
    title: "Logout",
    path: "/logout",
    loadTree: ({ page }) => import("../../components/regions/presets/phi-auth-runtime-page-tree")
      .then((module) => module.buildPhiAuthRuntimePageTree({
        page,
        presetKey: "public-logout-page",
        widgetTypeKey: "auth-logout",
        label: "Logout",
      })),
  },
  {
    ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
    presetKey: "app-profile-page",
    presetVersion: 1,
    area: "app",
    pageKey: "profile",
    title: "Profile",
    path: "/profile",
    navigation: [],
    loadTree: ({ page, runtime }) => import("../../components/regions/presets/phi-default-app-profile-page-tree")
      .then((module) => module.buildPhiDefaultAppProfilePageTree({ page, runtime })),
  },
  {
    ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
    presetKey: "app-auth-security-page",
    presetVersion: 1,
    area: "app",
    pageKey: "security",
    title: "Security",
    path: "/security",
    navigation: [],
    loadTree: ({ page }) => import("../../components/regions/presets/phi-auth-runtime-page-tree")
      .then((module) => module.buildPhiAuthRuntimePageTree({
        page,
        presetKey: "app-auth-security-page",
        widgetTypeKey: "auth-security",
        label: "Security",
      })),
  },
  {
    ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
    presetKey: "admin-auth-settings-page",
    presetVersion: 1,
    area: "admin",
    pageKey: "auth-settings",
    title: "Authentication",
    path: "/",
    mount: { mountKey: "settings" },
    accessPolicy: PHI_VIEWER_ACCESS_SITE_ADMIN,
    navigation: [{
      navKey: "admin:sidebar",
      parentItemKey: PHI_ADMIN_SETTINGS_NAV_ITEM_KEY,
      item: {
        itemKey: "@phis/ui/modules/auth/nav/admin/settings",
        label: { defaultMessage: "Authentication" },
        icon: "antd:safety-certificate",
        routePresetKey: "admin-auth-settings-page",
      },
    }],
    loadTree: ({ page, runtime }) =>
      import("../../components/regions/presets/phi-default-admin-auth-settings-page-tree")
        .then((module) => module.buildPhiDefaultAdminAuthSettingsPageTree({ page, runtime })),
  },
] satisfies readonly PhiCmsRoutePresetDescriptor[];

export const PHI_PUBLIC_FORM_RUNTIME_MODULE_ROUTES = [
  {
    ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
    presetKey: "public-contact-page",
    pageKey: "contact",
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
          itemKey: "@phis/ui/modules/public/nav/contact-header",
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
          itemKey: "@phis/ui/modules/public/nav/contact-footer",
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
