import type {
  PhiCmsAreaDefinition,
  PhiCmsNavigationBaseItemDescriptor,
  PhiCmsNavigationSurfaceDescriptor,
} from "../../types/cms-module-descriptors";
import type { PhiCmsAreaKey } from "../../constants/cms-areas";
import { createPhiCoreRuntimeControllerAddress } from "../../components/runtime/core-runtime-controller-address";
import { PHI_ADMIN_RUNTIME_MODULE_ID } from "./admin/ids";
import { PHI_ACCOUNTING_RUNTIME_MODULE_ID } from "./accounting/ids";
import { PHI_APP_RUNTIME_MODULE_ID } from "./app/ids";
import { PHI_BUILDER_RUNTIME_MODULE_ID } from "./builder/ids";
import { PHI_PUBLIC_RUNTIME_MODULE_ID } from "./public/ids";
import { PHI_EDITOR_RUNTIME_MODULE_ID } from "./editor/ids";
import { PHI_DEFAULT_PUB_AREA_PRESET_KEY } from "./preset-contracts/pub-area";
import {
  PHI_VIEWER_ACCESS_ACCOUNTING,
  PHI_VIEWER_ACCESS_ANYONE,
  PHI_VIEWER_ACCESS_AUTHENTICATED,
  PHI_VIEWER_ACCESS_CONTENT_EDITING,
  PHI_VIEWER_ACCESS_DEVELOPER_TOOLS,
  PHI_VIEWER_ACCESS_STRUCTURE_AUTHORING,
  PHI_VIEWER_ACCESS_SITE_ADMIN,
} from "../../types/access";

const label = (defaultMessage: string) => ({ defaultMessage });

/**
 * The account trigger's menu, as a surface every Area declares.
 *
 * It exists so a Module can contribute an entry to a menu it does not own -- the Avatar Module is the
 * first, with an entry that opens its Overlay -- and it is where the Area's own account entries are
 * declared: the App's profile hangs under the anchor here, the way its Settings child hangs in the
 * sidebar. Nothing about the menu is built into the Widget any more, so every entry in it is one an
 * operator can reorder, rename or remove.
 *
 * Every Area that draws the trigger has one, which is every Area: the same Widget stands in the Admin,
 * Builder, Editor and Accounting shells as in App and Public. While four of them declared no surface,
 * a Module's contribution was resolved to nothing there and vanished without a word -- the entry simply
 * was not in the menu, on shells where the same Module's entry was in the menu next door.
 *
 * The anchor is the place to dock, not an entry: a Module attaches under it, and what belongs in the
 * menu are its children. Operator editing is allowed here on the same terms as every other surface --
 * removing an entry is their call, and `phis-cli auth restore-preset` is the way back.
 */
/**
 * Signing out, which every Area offers and no Module owns.
 *
 * It sends rather than goes: there is no Page to reach, the act ends a session, and a session belongs
 * to the account on this Site rather than to the Area somebody happened to be in -- so the signal is
 * Site-scoped and the Site Core Runtime Controller performs it, through the auth door every Site mounts
 * whether or not an Auth Module is installed. That is why the entry is the Area's own and not Auth's:
 * the Editor and the Accounting Area have no Auth Module in their catalogs, and a person standing in
 * one of them still has a session to end.
 *
 * As an entry rather than something the Account Widget draws last, so that an operator rearranging the
 * menu is rearranging entries -- one that is not in the surface cannot be moved, renamed or removed.
 */
function accountSignOutItem(area: PhiCmsAreaKey) {
  return {
    itemKey: `@phis/ui/modules/${area}/nav/account/sign-out`,
    label: label("Sign out"),
    icon: "antd:logout",
    accessPolicy: PHI_VIEWER_ACCESS_AUTHENTICATED,
    signalRoutes: {
      emits: [{
        routeKey: `${area}-account-sign-out`,
        capabilityId: "activate",
        scope: "site",
        channel: "session",
        action: "clear",
        valueType: "none",
        receiver: createPhiCoreRuntimeControllerAddress(),
      }],
    },
  } as const;
}

function accountNavigationSurface(
  anchorItemKey: string,
  navKey: `${PhiCmsAreaKey}:account`,
  /** The Area's own entries, under the anchor and ahead of what other Modules dock there. */
  anchorChildren?: readonly PhiCmsNavigationBaseItemDescriptor[],
): PhiCmsNavigationSurfaceDescriptor {
  const [area] = navKey.split(":") as [PhiCmsAreaKey];
  return {
    navKey,
    label: label("Account menu"),
    items: [
      {
        itemKey: anchorItemKey,
        label: label("Account"),
        icon: "antd:user",
        ...(anchorChildren?.length ? { children: anchorChildren } : {}),
      },
      accountSignOutItem(area),
    ],
    exportedItemKeys: [anchorItemKey],
  };
}

export const PHI_ACCOUNTING_ACCOUNT_NAV_ITEM_KEY = "@phis/ui/modules/accounting/nav/account";
export const PHI_ADMIN_ACCOUNT_NAV_ITEM_KEY = "@phis/ui/modules/admin/nav/account";
export const PHI_BUILDER_ACCOUNT_NAV_ITEM_KEY = "@phis/ui/builder/nav/account";
export const PHI_EDITOR_ACCOUNT_NAV_ITEM_KEY = "@phis/ui/modules/editor/nav/account";
export const PHI_PUBLIC_ACCOUNT_NAV_ITEM_KEY = "@phis/ui/modules/public/nav/account";

export const PHI_ADMIN_SETTINGS_NAV_ITEM_KEY = "@phis/ui/modules/admin/nav/settings";
export const PHI_BUILDER_SETTINGS_NAV_ITEM_KEY = "@phis/ui/builder/nav/settings";

/*
 * The Public surfaces carry one intrinsic entry, the terms, and export it as the one anchor.
 *
 * The terms are Core's, so their entry is; the contact entry hangs after it, and a Site package's
 * landing places its Home entry before it. Public has no sidebar surface: the Public Shell draws a
 * header and a footer, and a surface nothing renders is a promise nobody can see kept.
 */
const publicTermsItem = {
  itemKey: "@phis/ui/modules/public/nav/terms",
  label: label("Terms and Conditions"),
  icon: "antd:file-text",
  routePresetKey: "public-terms-page",
} as const;

const publicNavigationSurfaces = [
  {
    navKey: "public:header",
    label: label("Public header navigation"),
    items: [publicTermsItem],
    exportedItemKeys: [publicTermsItem.itemKey],
  },
  {
    navKey: "public:footer",
    label: label("Public footer navigation"),
    items: [publicTermsItem],
    exportedItemKeys: [publicTermsItem.itemKey],
  },
  {
    navKey: "public:quicklinks",
    label: label("Public quick links"),
    items: [publicTermsItem],
    exportedItemKeys: [publicTermsItem.itemKey],
  },
  accountNavigationSurface(PHI_PUBLIC_ACCOUNT_NAV_ITEM_KEY, "public:account"),
] as const;

export const PHI_PUBLIC_RUNTIME_AREA_DEFINITIONS = [
  {
    area: "public",
    baseModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
    shellPresetKey: PHI_DEFAULT_PUB_AREA_PRESET_KEY,
    accessPolicy: PHI_VIEWER_ACCESS_ANYONE,
    navigationSurfaces: publicNavigationSurfaces,
  },
] satisfies readonly PhiCmsAreaDefinition[];

export const PHI_APP_ACCOUNT_NAV_ITEM_KEY = "@phis/ui/modules/app/nav/account";
export const PHI_APP_SETTINGS_NAV_ITEM_KEY = "@phis/ui/modules/app/nav/settings";

export const PHI_APP_RUNTIME_AREA_DEFINITIONS = [
  {
    area: "app",
    baseModuleId: PHI_APP_RUNTIME_MODULE_ID,
    shellPresetKey: "app-area-preset",
    accessPolicy: PHI_VIEWER_ACCESS_AUTHENTICATED,
    /*
     * The one place a Module offers what a signed-in person can decide about their own account.
     *
     * Same mount as Admin and Builder declare, and the same container with no address of its own
     * (SETTINGS.md sections 2 and 3). What differs is the subject: there a Module says how it behaves
     * for everybody who visits the Site, here what this one person has settled for themselves.
     */
    routeMounts: [{
      mountKey: "settings",
      navKey: "app:sidebar",
      parentItemKey: PHI_APP_SETTINGS_NAV_ITEM_KEY,
    }],
    navigationSurfaces: [
      {
        navKey: "app:header",
        label: label("App header navigation"),
        items: [],
        exportedItemKeys: [],
      },
      {
        /*
         * No entry of its own for the Area: the App root forwards to the first Module entry a viewer
         * can see, and a Home page beside a root that already forwards was one door too many.
         *
         * The Settings container is not such an entry. It is an address-less container that hides
         * until something hangs under it, so a Site with no Module configuration sees exactly what it
         * saw before -- and it stands last, because it is where one goes to settle something rather
         * than to work.
         */
        navKey: "app:sidebar",
        label: label("App sidebar navigation"),
        items: [{
          itemKey: PHI_APP_SETTINGS_NAV_ITEM_KEY,
          label: label("Settings"),
          icon: "antd:setting",
          standing: "last",
          // The Area's own child stands first and is stated here; every other Module reaches the
          // container through the mount and is ordered after it (SETTINGS.md section 3).
          children: [{
            itemKey: "@phis/ui/modules/app/nav/settings/profile",
            label: label("Profile"),
            icon: "antd:user",
            routePresetKey: "app-profile-page",
          }],
        }],
        exportedItemKeys: [PHI_APP_SETTINGS_NAV_ITEM_KEY],
      },
      {
        navKey: "app:footer",
        label: label("App footer navigation"),
        items: [],
        exportedItemKeys: [],
      },
      {
        navKey: "app:quicklinks",
        label: label("App quick links"),
        items: [],
        exportedItemKeys: [],
      },
      /*
       * The profile, in the menu the trigger opens as well as in the sidebar.
       *
       * Two entries for one Page, because they answer two different questions -- where a person
       * configures the App, and where they get at their own account from wherever they are. The Widget
       * used to add this one itself, from an address the Auth projection carried; naming the route
       * preset says the same thing in the way every other entry says it, and it is App's to say,
       * because the Page is App's.
       */
      accountNavigationSurface(PHI_APP_ACCOUNT_NAV_ITEM_KEY, "app:account", [{
        itemKey: "@phis/ui/modules/app/nav/account/profile",
        label: label("Profile"),
        icon: "antd:user",
        routePresetKey: "app-profile-page",
      }]),
    ],
  },
] satisfies readonly PhiCmsAreaDefinition[];

export const PHI_ACCOUNTING_RUNTIME_AREA_DEFINITIONS = [
  {
    area: "accounting",
    baseModuleId: PHI_ACCOUNTING_RUNTIME_MODULE_ID,
    shellPresetKey: "accounting-area-preset",
    accessPolicy: PHI_VIEWER_ACCESS_ACCOUNTING,
    navigationSurfaces: [{
      navKey: "accounting:sidebar",
      label: label("Accounting sidebar navigation"),
      items: [{
        itemKey: "@phis/ui/modules/accounting/nav/home",
        label: label("Overview"),
        icon: "antd:audit",
        routePresetKey: "accounting-overview-page",
      }],
      exportedItemKeys: ["@phis/ui/modules/accounting/nav/home"],
    }, accountNavigationSurface(PHI_ACCOUNTING_ACCOUNT_NAV_ITEM_KEY, "accounting:account")],
  },
] satisfies readonly PhiCmsAreaDefinition[];

export const PHI_ADMIN_RUNTIME_AREA_DEFINITIONS = [
  {
    area: "admin",
    baseModuleId: PHI_ADMIN_RUNTIME_MODULE_ID,
    shellPresetKey: "admin-area-preset",
    accessPolicy: PHI_VIEWER_ACCESS_DEVELOPER_TOOLS,
    routeMounts: [{
      mountKey: "settings",
      navKey: "admin:sidebar",
      parentItemKey: PHI_ADMIN_SETTINGS_NAV_ITEM_KEY,
    }],
    navigationSurfaces: [
      {
        navKey: "admin:sidebar",
        label: label("Admin sidebar navigation"),
        items: [
          {
            itemKey: PHI_ADMIN_SETTINGS_NAV_ITEM_KEY,
            label: label("Settings"),
            icon: "antd:setting",
            standing: "last",
            children: [{
              itemKey: "@phis/ui/modules/admin/nav/settings/general",
              label: label("General"),
              icon: "antd:global",
              // The entry's own statement, where it used to be the route's. The address answers for
              // everybody the Admin Area lets in; only the entry keeps to Site Admins (ACCESS.md).
              accessPolicy: PHI_VIEWER_ACCESS_SITE_ADMIN,
              routePresetKey: "admin-settings-general-page",
            }],
          },
        ],
        exportedItemKeys: [PHI_ADMIN_SETTINGS_NAV_ITEM_KEY],
      },
      accountNavigationSurface(PHI_ADMIN_ACCOUNT_NAV_ITEM_KEY, "admin:account"),
    ],
  },
] satisfies readonly PhiCmsAreaDefinition[];

export const PHI_EDITOR_RUNTIME_AREA_DEFINITIONS = [
  {
    area: "editor",
    baseModuleId: PHI_EDITOR_RUNTIME_MODULE_ID,
    shellPresetKey: "editor-area-preset",
    accessPolicy: PHI_VIEWER_ACCESS_CONTENT_EDITING,
    navigationSurfaces: [{
      navKey: "editor:sidebar",
      label: label("Editor sidebar navigation"),
      items: [{
        itemKey: "@phis/ui/modules/editor/nav/translations",
        label: label("Translations"),
        icon: "antd:translation",
        routePresetKey: "editor-translations-page",
      }],
      exportedItemKeys: ["@phis/ui/modules/editor/nav/translations"],
    }, accountNavigationSurface(PHI_EDITOR_ACCOUNT_NAV_ITEM_KEY, "editor:account")],
  },
] satisfies readonly PhiCmsAreaDefinition[];

export const PHI_BUILDER_RUNTIME_AREA_DEFINITIONS = [
  {
    area: "builder",
    baseModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
    shellPresetKey: "builder-area-preset",
    accessPolicy: PHI_VIEWER_ACCESS_STRUCTURE_AUTHORING,
    routeMounts: [{
      mountKey: "settings",
      navKey: "builder:sidebar",
      parentItemKey: PHI_BUILDER_SETTINGS_NAV_ITEM_KEY,
    }],
    navigationSurfaces: [{
      navKey: "builder:sidebar",
      label: label("Builder sidebar navigation"),
      items: [
        { itemKey: "@phis/ui/builder/nav/modules", label: label("Modules"), icon: "antd:appstore", routePresetKey: "builder-modules-page" },
        { itemKey: "@phis/ui/builder/nav/shells", label: label("Shells"), icon: "antd:branches", routePresetKey: "builder-shells-page" },
        { itemKey: "@phis/ui/builder/nav/pages", label: label("Pages"), icon: "antd:profile", routePresetKey: "builder-pages-page" },
        { itemKey: "@phis/ui/builder/nav/navigation", label: label("Navigation"), icon: "antd:menu", routePresetKey: "builder-navigation-page" },
        {
          itemKey: PHI_BUILDER_SETTINGS_NAV_ITEM_KEY,
          label: label("Settings"),
          icon: "antd:setting",
          standing: "last",
          children: [{
            itemKey: "@phis/ui/builder/nav/settings/general",
            label: label("General"),
            icon: "antd:global",
            routePresetKey: "builder-settings-general-page",
          }],
        },
      ],
      exportedItemKeys: [
        "@phis/ui/builder/nav/modules",
        "@phis/ui/builder/nav/shells",
        "@phis/ui/builder/nav/navigation",
        PHI_BUILDER_SETTINGS_NAV_ITEM_KEY,
      ],
    }, accountNavigationSurface(PHI_BUILDER_ACCOUNT_NAV_ITEM_KEY, "builder:account")],
  },
] satisfies readonly PhiCmsAreaDefinition[];

export const PHI_ALL_RUNTIME_AREA_DEFINITIONS = [
  ...PHI_PUBLIC_RUNTIME_AREA_DEFINITIONS,
  ...PHI_APP_RUNTIME_AREA_DEFINITIONS,
  ...PHI_ACCOUNTING_RUNTIME_AREA_DEFINITIONS,
  ...PHI_ADMIN_RUNTIME_AREA_DEFINITIONS,
  ...PHI_EDITOR_RUNTIME_AREA_DEFINITIONS,
  ...PHI_BUILDER_RUNTIME_AREA_DEFINITIONS,
] satisfies readonly PhiCmsAreaDefinition[];

const PHI_RUNTIME_AREA_BASE_MODULE_IDS = new Set<string>(
  PHI_ALL_RUNTIME_AREA_DEFINITIONS.map(({ baseModuleId }) => baseModuleId),
);

export function isPhiRuntimeAreaBaseModuleId(moduleId: string) {
  return PHI_RUNTIME_AREA_BASE_MODULE_IDS.has(moduleId);
}

const PHI_RUNTIME_AREA_DEFINITION_BY_AREA = new Map(
  PHI_ALL_RUNTIME_AREA_DEFINITIONS.map((definition) => [definition.area, definition] as const),
);

export function resolvePhiRuntimeAreaDefinition(area: PhiCmsAreaDefinition["area"]) {
  const definition = PHI_RUNTIME_AREA_DEFINITION_BY_AREA.get(area);
  if (!definition) {
    throw new Error(`Area "${area}" has no runtime definition.`);
  }
  return definition;
}
