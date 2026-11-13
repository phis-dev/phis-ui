import { describe, expect, it } from "vitest";

import { findFirstPhiCmsNavigationLinkPath } from "../../components/regions/presets/navigation-redirect";
import { materializePhiBuilderNavigationSurface } from "../../helpers/cms-navigation-catalog";
import type {
  PhiCmsAreaDefinition,
  PhiCmsNavigationInjectionItemDescriptor,
  PhiCmsRoutePresetDescriptor,
  PhiRuntimeModuleId,
} from "../../types/cms-module-descriptors";
import type {
  PhiRuntimeModuleCatalogEntry,
  PhiRuntimeModuleDefinition,
} from "../../types/cms-plugins";
import { buildPhiBuilderNavigationOverlay } from "./builder/navigation-persistence";
import { createPhiRuntimeModuleCatalog } from "./contracts";
import {
  compilePhiCmsActiveRouteTable,
  resolvePhiCmsActiveNavigationSurfaces,
  resolvePhiCmsDescriptorCatalog,
  resolvePhiCmsNavigationOverlay,
} from "./descriptor-compiler";

const loadTree = (() => {
  throw new Error("not loaded");
}) as PhiCmsRoutePresetDescriptor["loadTree"];

const PLATFORM_ID = "@test/pkg/modules/platform" as const;
const BASE_ID = "@test/pkg/modules/base" as const;
const ACME_ID = "@acme/site/modules/site" as const;
const OWN_KEY = "@test/pkg/modules/base/nav/own";
const GITHUB_KEY = `${ACME_ID}/nav/footer/github`;

const areaDefinition: PhiCmsAreaDefinition = {
  area: "public",
  baseModuleId: BASE_ID,
  shellPresetKey: "base-shell",
  accessPolicy: { access: "anyone" },
  navigationSurfaces: [{
    navKey: "public:footer",
    label: { defaultMessage: "Footer" },
    items: [{ itemKey: OWN_KEY, label: { defaultMessage: "Own" }, routePresetKey: "base-own" }],
    exportedItemKeys: [OWN_KEY],
  }],
};

function definition(moduleId: PhiRuntimeModuleId, kind: "platform" | "module") {
  const key = moduleId.split("/").at(-1)!;
  return {
    moduleId,
    kind,
    eligibleAreas: ["public"],
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
  item?: Omit<PhiCmsNavigationInjectionItemDescriptor, "itemKey" | "label">,
): PhiCmsRoutePresetDescriptor {
  return {
    ownerModuleId: moduleId,
    presetKey: name,
    presetVersion: 1,
    area: "public",
    title: name,
    path: `/${name}`,
    ...(item
      ? {
          navigation: [{
            navKey: "public:footer",
            parentItemKey: null,
            after: OWN_KEY,
            item: { itemKey: GITHUB_KEY, label: { defaultMessage: "GitHub" }, icon: "antd:github", ...item },
          }],
        }
      : {}),
    loadTree,
  };
}

const base = entry(BASE_ID, [page(BASE_ID, "base-own")]);
base.areaShells = [{
  ownerModuleId: BASE_ID,
  presetKey: "base-shell",
  shellPresetVersion: 1,
  area: "public",
  loadTree: () => {
    throw new Error("not loaded");
  },
}];

function compile(item: Omit<PhiCmsNavigationInjectionItemDescriptor, "itemKey" | "label">) {
  return resolvePhiCmsDescriptorCatalog(createPhiRuntimeModuleCatalog([
    entry(PLATFORM_ID, [], "platform"),
    base,
    entry(ACME_ID, [page(ACME_ID, "story", item)]),
  ], [areaDefinition]));
}

function footer(item: Omit<PhiCmsNavigationInjectionItemDescriptor, "itemKey" | "label">) {
  const catalog = compile(item);
  const activeModuleIds = new Set<PhiRuntimeModuleId>([PLATFORM_ID, BASE_ID, ACME_ID]);
  const [surface] = resolvePhiCmsActiveNavigationSurfaces({
    catalog,
    area: "public",
    activeModuleIds,
    routeTable: compilePhiCmsActiveRouteTable({ catalog, area: "public", activeModuleIds }),
  });
  return surface!;
}

describe("a Module's external navigation entry", () => {
  it("resolves like a Site's stored external link and stays the Module's", () => {
    const surface = footer({ target: { kind: "external", href: "https://github.com/acme", newTab: true } });
    const github = surface.items.find((item) => item.label.defaultMessage === "GitHub")!;
    expect(surface.items.map((item) => item.label.defaultMessage)).toEqual(["Own", "GitHub"]);
    expect(github.kind).toBe("link");
    expect(github.ownerModuleId).toBe(ACME_ID);
    expect(github.target).toEqual({
      kind: "custom",
      path: "https://github.com/acme",
      external: true,
      newTab: true,
    });
  });

  it("opens in the same tab unless it says otherwise", () => {
    const surface = footer({ target: { kind: "external", href: "https://example.com/" } });
    const github = surface.items.find((item) => item.label.defaultMessage === "GitHub")!;
    expect(github.target).toEqual({ kind: "custom", path: "https://example.com/", external: true });
  });

  it("is never a redirect destination", () => {
    const surface = footer({ target: { kind: "external", href: "https://github.com/acme" } });
    const github = surface.items.find((item) => item.label.defaultMessage === "GitHub")!;
    expect(findFirstPhiCmsNavigationLinkPath([github])).toBeNull();
  });

  it("refuses a route or an Overlay beside the external address", () => {
    const target = { kind: "external", href: "https://github.com/acme" } as const;
    expect(() => compile({ target, routePresetKey: "story" }))
      .toThrow(/external address, a route or an Overlay, never more than one/);
    expect(() => compile({ target, overlayPresetKey: "story-overlay", overlayNodeKey: "dialog" }))
      .toThrow(/external address, a route or an Overlay, never more than one/);
  });

  it.each([
    "http://github.com/acme",
    "mailto:hello@example.com",
    "/about",
    "//github.com/acme",
    "javascript:alert(1)",
    "not a url",
  ])("refuses %s, which is not an https: address", (href) => {
    expect(() => compile({ target: { kind: "external", href } }))
      .toThrow(/must be an https: address/);
  });

  it("is marked external in the Builder and can be hidden like any Module entry", () => {
    const surface = footer({ target: { kind: "external", href: "https://github.com/acme", newTab: true } });
    const githubId = surface.items.find((item) => item.label.defaultMessage === "GitHub")!.id;
    const tree = materializePhiBuilderNavigationSurface(surface, null);
    const row = tree.items.find((item) => item.id === githubId)!;
    expect(row).toMatchObject({
      source: "module",
      ownerModuleId: ACME_ID,
      kind: "link",
      href: "https://github.com/acme",
      external: true,
      newTab: true,
      hidden: false,
    });

    const hidden = buildPhiBuilderNavigationOverlay({
      ...tree,
      items: tree.items.map((item) => item.id === githubId ? { ...item, hidden: true } : item),
    });
    expect(hidden.tombstones).toEqual([githubId]);
    expect(hidden.customItems).toEqual([]);
    expect(resolvePhiCmsNavigationOverlay(surface, hidden).surface.items.map((item) => item.label.defaultMessage))
      .toEqual(["Own"]);
    expect(materializePhiBuilderNavigationSurface(surface, hidden).items
      .find((item) => item.id === githubId)?.hidden).toBe(true);
  });
});
