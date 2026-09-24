import type {
  PhiCmsAreaOverlayPresetDescriptor,
  PhiCmsDescriptorBuildContext,
  PhiCmsRoutePresetDescriptor,
} from "../../../types/cms-module-descriptors";
import { PhiCmsFlags } from "../../../constants/phi-cms";
import { PHI_BASE_PAGE_LAYOUT_VERSION } from "../../../components/regions/presets/phi-base-page-layout";
import { PHI_AUTH_LOGIN_OVERLAY_IDS } from "../../../components/runtime/auth-overlay-ids";
import { PHI_VIEWER_ACCESS_SITE_ADMIN } from "../../../types/access";
import {
  PHI_ADMIN_SETTINGS_NAV_ITEM_KEY,
  PHI_APP_ACCOUNT_NAV_ITEM_KEY,
  PHI_APP_SETTINGS_NAV_ITEM_KEY,
} from "../area-definitions";
import { PHI_AUTH_RUNTIME_MODULE_ID } from "./ids";

/**
 * The four Pages a visitor signs in through, and the one they leave through.
 *
 * They share a shape -- a Form on a Public address, reachable by anybody -- so they are stated once
 * as templates and turned into descriptors below, rather than five near-identical literals that drift
 * apart one field at a time.
 *
 * All five start out `NoIndex`. A sign-in form is not an answer to a search, and `/logout` is a link
 * a crawler follows to reach nothing at all. It is the Page's resting state and not a rule: the
 * Builder's switch decides from the first install onwards, which is what lets a Site whose `/register`
 * really is a landing say so.
 */
const FORM_ROUTE_TEMPLATES = [
  {
    key: "registration",
    title: "Register",
    path: "/register",
    loadTree: (presetKey: string, { page, runtime }: PhiCmsDescriptorBuildContext) =>
      import("../../../components/regions/presets/phi-default-pub-registration-page-tree")
        .then((module) => module.buildPhiDefaultPubRegistrationPageTree({ page, runtime, presetKey })),
  },
  {
    key: "login",
    title: "Login",
    path: "/login",
    loadTree: (presetKey: string, { page, runtime }: PhiCmsDescriptorBuildContext) =>
      import("../../../components/regions/presets/phi-default-pub-login-page-tree")
        .then((module) => module.buildPhiDefaultPubLoginPageTree({ page, runtime, presetKey })),
  },
  {
    key: "confirm",
    title: "Confirm",
    path: "/confirm",
    loadTree: (presetKey: string, { page }: PhiCmsDescriptorBuildContext) =>
      import("../../../components/regions/presets/phi-default-pub-confirm-page-tree")
        .then((module) => module.buildPhiDefaultPubConfirmPageTree({ page, presetKey })),
  },
  {
    key: "reset-password",
    title: "Reset Password",
    path: "/reset-password",
    loadTree: (presetKey: string, { page }: PhiCmsDescriptorBuildContext) =>
      import("../../../components/regions/presets/phi-default-pub-reset-password-page-tree")
        .then((module) => module.buildPhiDefaultPubResetPasswordPageTree({ page, presetKey })),
  },
] as const;

function buildFormRouteNavigation(template: (typeof FORM_ROUTE_TEMPLATES)[number]) {
  if (template.key !== "registration") {
    return [];
  }

  // Unanchored: the Public header exports no base item, so the entry lands at the end of the surface.
  return [{
    navKey: "public:header",
    parentItemKey: null,
    item: {
      itemKey: `@phis/ui/modules/auth/nav/public/${template.key}`,
      label: { defaultMessage: template.title },
      /* Signing up, not signing in: the account trigger beside it carries the way back. */
      icon: "antd:user-add",
      routePresetKey: `public-${template.key}-page`,
    },
  }] as const;
}

export const PHI_AUTH_RUNTIME_MODULE_ROUTES = [
  ...FORM_ROUTE_TEMPLATES.map((template) => {
    const presetKey = `public-${template.key}-page`;
    return {
      ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
      presetKey,
      presetVersion: 1,
      area: "public" as const,
      title: template.title,
      path: template.path,
      defaultPageFlags: PhiCmsFlags.NoIndex,
      navigation: buildFormRouteNavigation(template),
      loadTree: (context: PhiCmsDescriptorBuildContext) => template.loadTree(presetKey, context),
    };
  }),
  {
    ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
    presetKey: "public-logout-page",
    presetVersion: 1,
    area: "public",
    title: "Logout",
    path: "/logout",
    defaultPageFlags: PhiCmsFlags.NoIndex,
    loadTree: ({ page }) => import("../../../components/regions/presets/phi-auth-runtime-page-tree")
      .then((module) => module.buildPhiAuthRuntimePageTree({
        page,
        presetKey: "public-logout-page",
        widgetTypeKey: "auth-logout",
        label: "Logout",
      })),
  },
  /*
   * The App and Admin Pages state no flag of their own: those Areas are authenticated and are kept out
   * of the index wherever the request lands, so a default here would restate a decision that is
   * already made and would read as though it could be switched off.
   */
  /*
   * Everything about the credentials themselves, in the App Settings container.
   *
   * It is configuration of an account like the profile beside it, so it hangs from the same mount --
   * the first time a Module other than the Area's own uses App's. What keeps it here rather than
   * there is the subject: a password, a second factor, a linked identity and a session are how a
   * person proves who they are, and that is this Module's whether the Site signs people in with
   * passwords, a directory, or something not written yet.
   */
  {
    ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
    presetKey: "app-auth-security-page",
    presetVersion: 1,
    area: "app",
    title: "Security",
    path: "/settings/security",
    mount: { mountKey: "settings" },
    navigation: [{
      navKey: "app:sidebar",
      parentItemKey: PHI_APP_SETTINGS_NAV_ITEM_KEY,
      item: {
        itemKey: "@phis/ui/modules/auth/nav/app/security",
        label: { defaultMessage: "Security" },
        icon: "antd:safety-certificate",
        routePresetKey: "app-auth-security-page",
      },
    }, {
      /*
       * And in the account menu, beside the profile it belongs next to.
       *
       * The Account Widget used to put it there from a path in this Module's UI projection, which is
       * how a menu came to carry an address nobody had declared as an entry. It is an entry now: the
       * same Page, named by its route preset, docked under the Area's anchor -- so a Site reorders or
       * hides it like anything else in that menu, and the projection is rid of a second way to say
       * where a Page is.
       */
      navKey: "app:account",
      parentItemKey: PHI_APP_ACCOUNT_NAV_ITEM_KEY,
      item: {
        itemKey: "@phis/ui/modules/auth/nav/app/account-security",
        label: { defaultMessage: "Security" },
        icon: "antd:safety-certificate",
        routePresetKey: "app-auth-security-page",
      },
    }],
    loadTree: ({ page, runtime }) =>
      import("../../../components/regions/presets/phi-default-app-security-page-tree")
        .then((module) => module.buildPhiDefaultAppSecurityPageTree({ page, runtime })),
  },
  {
    ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
    presetKey: "admin-auth-settings-page",
    presetVersion: 1 + PHI_BASE_PAGE_LAYOUT_VERSION,
    area: "admin",
    title: "Authentication",
    path: "/settings/authentication",
    mount: { mountKey: "settings" },
    navigation: [{
      navKey: "admin:sidebar",
      parentItemKey: PHI_ADMIN_SETTINGS_NAV_ITEM_KEY,
      item: {
        itemKey: "@phis/ui/modules/auth/nav/admin/settings",
        accessPolicy: PHI_VIEWER_ACCESS_SITE_ADMIN,
        label: { defaultMessage: "Authentication" },
        icon: "antd:safety-certificate",
        routePresetKey: "admin-auth-settings-page",
      },
    }],
    loadTree: ({ page, runtime }) =>
      import("../../../components/regions/presets/phi-default-admin-auth-settings-page-tree")
        .then((module) => module.buildPhiDefaultAdminAuthSettingsPageTree({ page, runtime })),
  },
] satisfies readonly PhiCmsRoutePresetDescriptor[];

/**
 * The sign-in Overlay, offered to both Areas that can ask a visitor who they are.
 *
 * It is an Area Overlay rather than a Page so that signing in never costs the visitor the page they
 * were on -- the same reason it mounts lazily: the Form is built when it opens and not before, so a
 * crawler reading a Public Page never sees it at all.
 */
export const PHI_AUTH_RUNTIME_MODULE_AREA_OVERLAYS = (["public", "app"] as const).map((area) => ({
  ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
  presetKey: PHI_AUTH_LOGIN_OVERLAY_IDS[area].presetKey,
  presetVersion: 1,
  area,
  loadTree: async ({ page, runtime }) => {
    const { buildPhiAuthAreaLoginOverlayTree } =
      await import("../../../components/regions/presets/phi-auth-area-overlay-tree.server");
    return buildPhiAuthAreaLoginOverlayTree({ page, runtime, area });
  },
})) satisfies readonly PhiCmsAreaOverlayPresetDescriptor[];
