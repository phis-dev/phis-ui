import { describe, expect, it } from "vitest";

import { PHI_BASE_PAGE_LAYOUT_VERSION } from "../../components/regions/presets/phi-base-page-layout";
import {
  PHI_BUILDER_PAGE_PRESET_VERSION,
} from "../../components/regions/presets/phi-builder-page-preset-version";
import type { PhiCmsAreaKey } from "../../constants/cms-areas";
import { PHI_VIEWER_ACCESS_SITE_ADMIN } from "../../types/access";
import type {
  PhiCmsAreaDefinition,
  PhiCmsNavigationInjectionDescriptor,
  PhiCmsResolvedNavigationItem,
  PhiCmsRoutePresetDescriptor,
  PhiRuntimeModuleId,
} from "../../types/cms-module-descriptors";
import type {
  PhiRuntimeModuleCatalogEntry,
  PhiRuntimeModuleDefinition,
} from "../../types/cms-plugins";
import { PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG } from "./catalog";
import { createPhiRuntimeModuleCatalog } from "./contracts";
import {
  resolvePhiCmsActiveNavigationSurfaces,
  resolvePhiCmsDescriptorCatalog,
} from "./descriptor-compiler";
import { buildPhiSidebarRoutePresetDescriptor } from "./sidebar-route";

const loadTree = (() => {
  throw new Error("not loaded");
}) as PhiCmsRoutePresetDescriptor["loadTree"];

/** Labels, indented by depth, so an assertion reads like the sidebar it describes. */
function outline(items: readonly PhiCmsResolvedNavigationItem[], depth = 0): string[] {
  return items.flatMap((item) => [
    `${"  ".repeat(depth)}${item.label.defaultMessage}`,
    ...outline(item.children, depth + 1),
  ]);
}

describe("the first-party sidebars", () => {
  const catalog = resolvePhiCmsDescriptorCatalog(PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG);

  /* Every Module that contributes to the Area switched on: the default a new Site starts from. */
  function sidebarOf(area: PhiCmsAreaKey) {
    const definition = catalog.areaDefinitions.get(area)!;
    const activeModuleIds = new Set<PhiRuntimeModuleId>([
      definition.baseModuleId,
      PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG.platformModuleId!,
      ...(catalog.routesByArea.get(area) ?? []).map(({ descriptor }) => descriptor.ownerModuleId),
      ...(catalog.moduleNavigationByArea.get(area) ?? []).map(({ ownerModuleId }) => ownerModuleId),
    ]);
    const surface = resolvePhiCmsActiveNavigationSurfaces({ catalog, area, activeModuleIds })
      .find(({ navKey }) => navKey === `${area}:sidebar`);
    return outline(surface!.items);
  }

  it("open on the Dashboard and close on the Settings", () => {
    expect(sidebarOf("admin")).toEqual([
      "Dashboard",
      "Groups",
      "Locales",
      "Logs",
      "Users",
      "Settings",
      "  General",
      "  Media",
      "  Authentication",
    ]);
    expect(sidebarOf("app")).toEqual([
      "Dashboard",
      "Groups",
      "Conversations",
      "Settings",
      "  Profile",
      "  Security",
    ]);
    // The Builder's Settings used to have Media behind it, which anchored itself after the container.
    expect(sidebarOf("builder")).toEqual([
      "Dashboard",
      "Modules",
      "Shells",
      "Pages",
      "Navigation",
      "Media",
      "Revisions",
      "Theme",
      "Settings",
      "  General",
    ]);
    expect(sidebarOf("accounting")).toEqual(["Dashboard", "Overview"]);
    expect(sidebarOf("editor")).toEqual(["Dashboard", "News", "Translations"]);
  });

  it("are reached by anchor alone", () => {
    // Every first-party sidebar entry names a role; none names another item's key.
    for (const route of catalog.routeByIdentity.values()) {
      for (const injection of route.navigation ?? []) {
        if (injection.navKey.endsWith(":sidebar")) {
          expect(injection.anchor, `${route.presetKey} places its entry by anchor`).toBeDefined();
        }
      }
    }
  });
});

describe("buildPhiSidebarRoutePresetDescriptor", () => {
  it("places a main Page by anchor, on the Area's own page version", () => {
    const descriptor = buildPhiSidebarRoutePresetDescriptor({
      area: "builder",
      anchor: "main",
      ownerModuleId: "@acme/shop/modules/shop",
      presetKey: "builder-shop-page",
      title: "Shop",
      path: "/shop",
      itemKey: "@acme/shop/modules/shop/nav/builder/shop",
      icon: "antd:shop",
      loadTree,
    });
    expect(descriptor).toEqual({
      ownerModuleId: "@acme/shop/modules/shop",
      presetKey: "builder-shop-page",
      presetVersion: 1 + PHI_BUILDER_PAGE_PRESET_VERSION,
      area: "builder",
      title: "Shop",
      path: "/shop",
      navigation: [{
        navKey: "builder:sidebar",
        anchor: "main",
        item: {
          itemKey: "@acme/shop/modules/shop/nav/builder/shop",
          label: { defaultMessage: "Shop" },
          icon: "antd:shop",
          routePresetKey: "builder-shop-page",
        },
      }],
      loadTree,
    });
  });

  it("mounts an Admin settings Page, shown to Site administrators", () => {
    const descriptor = buildPhiSidebarRoutePresetDescriptor({
      area: "admin",
      anchor: "settings",
      ownerModuleId: "@acme/shop/modules/shop",
      presetKey: "admin-shop-settings-page",
      title: "Shop",
      path: "/settings/shop",
      itemKey: "@acme/shop/modules/shop/nav/admin/settings",
      icon: "antd:shop",
      loadTree,
    });
    expect(descriptor.presetVersion).toBe(1 + PHI_BASE_PAGE_LAYOUT_VERSION);
    expect(descriptor.mount).toEqual({ mountKey: "settings" });
    expect(descriptor.navigation?.[0]?.item.accessPolicy).toEqual(PHI_VIEWER_ACCESS_SITE_ADMIN);
  });

  it("mounts an App settings Page for everybody, and keeps a stated version", () => {
    const descriptor = buildPhiSidebarRoutePresetDescriptor({
      area: "app",
      anchor: "settings",
      ownerModuleId: "@acme/shop/modules/shop",
      presetKey: "app-shop-settings-page",
      presetVersion: 7,
      title: "Shop",
      path: "/settings/shop",
      itemKey: "@acme/shop/modules/shop/nav/app/settings",
      icon: "antd:shop",
      loadTree,
    });
    expect(descriptor.presetVersion).toBe(7);
    expect(descriptor.mount).toEqual({ mountKey: "settings" });
    expect(descriptor.navigation?.[0]?.item.accessPolicy).toBeUndefined();
  });
});

describe("navigation anchors", () => {
  const PLATFORM_ID = "@test/pkg/modules/platform" as const;
  const BASE_ID = "@test/pkg/modules/base" as const;
  const OWN_KEY = "@test/pkg/modules/base/nav/own";
  const SETTINGS_KEY = "@test/pkg/modules/base/nav/settings";

  const areaDefinition: PhiCmsAreaDefinition = {
    area: "app",
    baseModuleId: BASE_ID,
    shellPresetKey: "base-shell",
    accessPolicy: { access: "anyone" },
    routeMounts: [{ mountKey: "settings", navKey: "app:sidebar", parentItemKey: SETTINGS_KEY }],
    navigationSurfaces: [{
      navKey: "app:sidebar",
      label: { defaultMessage: "Sidebar" },
      items: [
        { itemKey: OWN_KEY, label: { defaultMessage: "Own" }, routePresetKey: "base-own" },
        {
          itemKey: SETTINGS_KEY,
          label: { defaultMessage: "Settings" },
          standing: "last",
          children: [{
            itemKey: `${SETTINGS_KEY}/general`,
            label: { defaultMessage: "General" },
            routePresetKey: "base-general",
          }],
        },
      ],
      exportedItemKeys: [OWN_KEY, SETTINGS_KEY],
      anchors: {
        start: { parentItemKey: null, position: "leading" },
        main: { parentItemKey: null, position: "body" },
        settings: { parentItemKey: SETTINGS_KEY, position: "body" },
        end: { parentItemKey: null, position: "trailing" },
      },
    }],
  };

  function definition(moduleId: PhiRuntimeModuleId, kind: "platform" | "module") {
    const key = moduleId.split("/").at(-1)!;
    return {
      moduleId,
      kind,
      eligibleAreas: ["app"],
      serverBinding: { providerId: "@phis/server/core", requiredCapabilities: [] },
      controllerType: `@test/${key}`,
      controller: {
        pluginKey: "@test",
        key,
        title: key,
        allowedMountScopes: ["area"],
        runtimeSignals: { emits: [], listens: [] },
      },
      title: moduleId,
      description: `Test runtime module ${moduleId}.`,
      category: "other",
      iconFamily: "test",
      controllerMountPolicy: "area",
    } satisfies PhiRuntimeModuleDefinition;
  }

  function entry(
    moduleId: PhiRuntimeModuleId,
    routes: readonly PhiCmsRoutePresetDescriptor[],
    kind: "platform" | "module" = "module",
  ): PhiRuntimeModuleCatalogEntry {
    return {
      definition: definition(moduleId, kind),
      widgets: [],
      layouts: [],
      routes,
      load: async () => {
        throw new Error("not executed");
      },
    };
  }

  function page(
    moduleId: PhiRuntimeModuleId,
    name: string,
    injection?: Omit<PhiCmsNavigationInjectionDescriptor, "navKey" | "item">,
  ): PhiCmsRoutePresetDescriptor {
    return {
      ownerModuleId: moduleId,
      presetKey: name,
      presetVersion: 1,
      area: "app",
      title: name,
      path: `/${name}`,
      ...(injection && "anchor" in injection && injection.anchor === "settings"
        ? { mount: { mountKey: "settings" } }
        : {}),
      ...(injection
        ? {
            navigation: [{
              navKey: "app:sidebar",
              ...injection,
              item: {
                itemKey: `${moduleId}/nav/${name}`,
                label: { defaultMessage: name },
                routePresetKey: name,
              },
            } as PhiCmsNavigationInjectionDescriptor],
          }
        : {}),
      loadTree,
    };
  }

  const base = entry(BASE_ID, [page(BASE_ID, "base-own"), page(BASE_ID, "base-general")]);
  base.areaShells = [{
    ownerModuleId: BASE_ID,
    presetKey: "base-shell",
    shellPresetVersion: 1,
    area: "app",
    loadTree: () => {
      throw new Error("not loaded");
    },
  }];

  function sidebar(modules: readonly PhiRuntimeModuleCatalogEntry[]) {
    const catalog = resolvePhiCmsDescriptorCatalog(createPhiRuntimeModuleCatalog([
      entry(PLATFORM_ID, [], "platform"),
      base,
      ...modules,
    ], [areaDefinition]));
    const [surface] = resolvePhiCmsActiveNavigationSurfaces({
      catalog,
      area: "app",
      activeModuleIds: new Set([
        PLATFORM_ID,
        BASE_ID,
        ...modules.map((module) => module.definition.moduleId),
      ]),
    });
    return outline(surface!.items);
  }

  it("puts each role where the Area says it is", () => {
    const acme = "@acme/shop/modules/shop" as const;
    expect(sidebar([entry(acme, [
      page(acme, "shop-end", { anchor: "end" }),
      page(acme, "shop-main", { anchor: "main" }),
      page(acme, "shop-settings", { anchor: "settings" }),
      page(acme, "shop-start", { anchor: "start" }),
    ])])).toEqual([
      "shop-start",
      "Own",
      "shop-main",
      "Settings",
      "  General",
      "  shop-settings",
      "shop-end",
    ]);
  });

  it("orders entries sharing an anchor by module, preset and item", () => {
    const zeta = "@zeta/pkg/modules/zeta" as const;
    const alpha = "@alpha/pkg/modules/alpha" as const;
    expect(sidebar([
      entry(zeta, [page(zeta, "zeta-start", { anchor: "start" })]),
      entry(alpha, [page(alpha, "alpha-start", { anchor: "start" })]),
    ])).toEqual(["alpha-start", "zeta-start", "Own", "Settings", "  General"]);
  });

  it("still places a legacy entry before or after an exported item", () => {
    const legacy = "@legacy/pkg/modules/legacy" as const;
    const anchored = "@acme/shop/modules/shop" as const;
    expect(sidebar([
      entry(legacy, [
        page(legacy, "legacy-before", { parentItemKey: null, before: OWN_KEY }),
        page(legacy, "legacy-after", { parentItemKey: null, after: SETTINGS_KEY }),
        page(legacy, "legacy-child", { parentItemKey: SETTINGS_KEY }),
      ]),
      entry(anchored, [
        page(anchored, "shop-start", { anchor: "start" }),
        page(anchored, "shop-end", { anchor: "end" }),
      ]),
    ])).toEqual([
      "shop-start",
      "legacy-before",
      "Own",
      "Settings",
      "  General",
      "  legacy-child",
      // Behind the container it named, and ahead of the Area's `end`, which is the very bottom.
      "legacy-after",
      "shop-end",
    ]);
  });

  it("refuses an anchor the surface does not declare", () => {
    const acme = "@acme/shop/modules/shop" as const;
    const withoutSettings: PhiCmsAreaDefinition = {
      ...areaDefinition,
      routeMounts: [],
      navigationSurfaces: areaDefinition.navigationSurfaces!.map((surface) => ({
        ...surface,
        anchors: { main: { parentItemKey: null, position: "body" } },
      })),
    };
    expect(() => resolvePhiCmsDescriptorCatalog(createPhiRuntimeModuleCatalog([
      entry(PLATFORM_ID, [], "platform"),
      base,
      entry(acme, [page(acme, "shop-start", { anchor: "start" })]),
    ], [withoutSettings]))).toThrow(/declares no anchor "start"/);
  });

  it("refuses an anchor combined with an item key", () => {
    const acme = "@acme/shop/modules/shop" as const;
    const mixed = {
      anchor: "main",
      parentItemKey: null,
      after: OWN_KEY,
    } as unknown as Omit<PhiCmsNavigationInjectionDescriptor, "navKey" | "item">;
    expect(() => sidebar([entry(acme, [page(acme, "shop-mixed", mixed)])]))
      .toThrow(/cannot be combined/);
  });

  it("refuses an Area anchor inside an entry that goes somewhere", () => {
    const pointingIntoALink: PhiCmsAreaDefinition = {
      ...areaDefinition,
      navigationSurfaces: areaDefinition.navigationSurfaces!.map((surface) => ({
        ...surface,
        anchors: { settings: { parentItemKey: OWN_KEY, position: "body" } },
      })),
    };
    expect(() => resolvePhiCmsDescriptorCatalog(createPhiRuntimeModuleCatalog([
      entry(PLATFORM_ID, [], "platform"),
      base,
    ], [pointingIntoALink]))).toThrow(/must be a navigation container/);
  });
});
