import type { PhiCmsAreaDefinition } from "../../types/cms-module-descriptors";
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
} from "../../types/access";

const label = (defaultMessage: string) => ({ defaultMessage });

export const PHI_ADMIN_SETTINGS_NAV_ITEM_KEY = "@phis/ui/modules/admin/nav/settings";
export const PHI_BUILDER_SETTINGS_NAV_ITEM_KEY = "@phis/ui/builder/nav/settings";

const publicHomeItem = {
  itemKey: "@phis/ui/modules/public/nav/home",
  label: label("Home"),
  icon: "antd:home",
  routePresetKey: "public-welcome-page",
} as const;

const publicTermsItem = {
  itemKey: "@phis/ui/modules/public/nav/terms",
  label: label("Terms and Conditions"),
  routePresetKey: "public-terms-page",
} as const;

const publicNavigationSurfaces = [
  {
    navKey: "public:header",
    label: label("Public header navigation"),
    items: [publicHomeItem, publicTermsItem],
    exportedItemKeys: [publicHomeItem.itemKey, publicTermsItem.itemKey],
  },
  {
    navKey: "public:sidebar",
    label: label("Public sidebar navigation"),
    items: [publicHomeItem, publicTermsItem],
    exportedItemKeys: [publicHomeItem.itemKey, publicTermsItem.itemKey],
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
    items: [publicHomeItem, publicTermsItem],
    exportedItemKeys: [publicHomeItem.itemKey, publicTermsItem.itemKey],
  },
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

export const PHI_APP_RUNTIME_AREA_DEFINITIONS = [
  {
    area: "app",
    baseModuleId: PHI_APP_RUNTIME_MODULE_ID,
    shellPresetKey: "app-area-preset",
    accessPolicy: PHI_VIEWER_ACCESS_AUTHENTICATED,
    navigationSurfaces: [
      {
        navKey: "app:header",
        label: label("App header navigation"),
        items: [],
        exportedItemKeys: [],
      },
      {
        navKey: "app:sidebar",
        label: label("App sidebar navigation"),
        items: [{
          itemKey: "@phis/ui/modules/app/nav/home",
          label: label("Home"),
          icon: "antd:home",
          routePresetKey: "app-home-page",
        }],
        exportedItemKeys: ["@phis/ui/modules/app/nav/home"],
      },
      {
        navKey: "app:footer",
        label: label("App footer navigation"),
        items: [],
        exportedItemKeys: [],
      },
      /*
       * The account trigger's menu, as a surface rather than a closed set of props.
       *
       * It exists so a Module can contribute an entry to a menu it does not own -- the Avatar Module is
       * the first, with an entry that opens its Overlay. The Area's own account entries stay in the
       * Widget for now; what the surface adds is the place to dock, not a rewrite of what is already
       * there.
       *
       * `PHI_APP_ACCOUNT_NAV_ITEM_KEY` is the exported anchor: a Module places its entry relative to
       * that and nowhere else, so the shape of the menu stays the Area's decision. Operator editing is
       * deliberately allowed here, on the same terms as every other surface -- removing an entry is
       * their call, `phis-cli auth restore-preset` is the way back, and logout survives regardless
       * because the Account Widget falls back to calling its route directly.
       */
      {
        navKey: "app:account",
        label: label("App account menu"),
        items: [{
          itemKey: PHI_APP_ACCOUNT_NAV_ITEM_KEY,
          label: label("Account"),
          icon: "antd:user",
        }],
        exportedItemKeys: [PHI_APP_ACCOUNT_NAV_ITEM_KEY],
      },
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
        label: label("Accounting"),
        icon: "antd:dashboard",
        routePresetKey: "accounting-page",
      }],
    }],
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
      basePath: "/settings",
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
            children: [{
              itemKey: "@phis/ui/modules/admin/nav/settings/general",
              label: label("General"),
              icon: "antd:global",
              routePresetKey: "admin-settings-general-page",
            }],
          },
        ],
        exportedItemKeys: [PHI_ADMIN_SETTINGS_NAV_ITEM_KEY],
      },
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
    }],
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
      basePath: "/settings",
      navKey: "builder:sidebar",
      parentItemKey: PHI_BUILDER_SETTINGS_NAV_ITEM_KEY,
    }],
    navigationSurfaces: [{
      navKey: "builder:sidebar",
      label: label("Builder sidebar navigation"),
      items: [
        { itemKey: "@phis/ui/builder/nav/shells", label: label("Shells"), icon: "antd:branches", routePresetKey: "builder-shells-page" },
        { itemKey: "@phis/ui/builder/nav/pages", label: label("Pages"), icon: "antd:profile", routePresetKey: "builder-pages-page" },
        { itemKey: "@phis/ui/builder/nav/navigation", label: label("Navigation"), icon: "antd:menu", routePresetKey: "builder-navigation-page" },
        {
          itemKey: PHI_BUILDER_SETTINGS_NAV_ITEM_KEY,
          label: label("Settings"),
          icon: "antd:setting",
          children: [{
            itemKey: "@phis/ui/builder/nav/settings/general",
            label: label("General"),
            icon: "antd:global",
            routePresetKey: "builder-settings-general-page",
          }],
        },
      ],
      exportedItemKeys: [
        "@phis/ui/builder/nav/shells",
        "@phis/ui/builder/nav/navigation",
        PHI_BUILDER_SETTINGS_NAV_ITEM_KEY,
      ],
    }],
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
