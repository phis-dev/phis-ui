import { describe, expect, it } from "vitest";

import { findFirstPhiCmsNavigationLinkPath } from "../../components/regions/presets/navigation-redirect";
import { materializePhiBuilderNavigationSurface } from "../../helpers/cms-navigation-catalog";
import { resolvePhiNavHref } from "../../helpers/locale";
import type {
  PhiCmsAreaDefinition,
  PhiCmsNavigationAreaTarget,
  PhiCmsRoutePresetDescriptor,
  PhiRuntimeModuleId,
} from "../../types/cms-module-descriptors";
import type {
  PhiRuntimeModuleCatalogEntry,
  PhiRuntimeModuleDefinition,
} from "../../types/cms-plugins";
import { resolvePhiRuntimeAreaDefinition } from "./area-definitions";
import { createPhiRuntimeModuleCatalog } from "./contracts";
import {
  compilePhiCmsActiveRouteTable,
  resolvePhiCmsActiveNavigationSurfaces,
  resolvePhiCmsDescriptorCatalog,
} from "./descriptor-compiler";

/**
 * An entry that enters another Area at its root: the Admin's way into the Builder and back.
 *
 * The root rather than a Page there, because the root is the one address every Area answers whatever it
 * has switched on, and it forwards to wherever this viewer lands.
 */

const loadTree = (() => {
  throw new Error("not loaded");
}) as PhiCmsRoutePresetDescriptor["loadTree"];

const PLATFORM_ID = "@test/pkg/modules/platform" as const;
const ADMIN_ID = "@test/pkg/modules/admin" as const;
const BUILDER_ID = "@test/pkg/modules/builder" as const;
const OWN_KEY = `${ADMIN_ID}/nav/own`;
const LEAVE_KEY = `${ADMIN_ID}/nav/builder`;
const BUILDER_POLICY = { access: "authenticated" } as const;

function adminDefinition(
  target: PhiCmsNavigationAreaTarget,
  extra: { routePresetKey?: string; accessPolicy?: PhiCmsAreaDefinition["accessPolicy"] } = {},
): PhiCmsAreaDefinition {
  return {
    area: "admin",
    baseModuleId: ADMIN_ID,
    shellPresetKey: "admin-shell",
    shellProviders: "base",
    accessPolicy: { access: "anyone" },
    navigationSurfaces: [{
      navKey: "admin:sidebar",
      label: { defaultMessage: "Sidebar" },
      items: [
        { itemKey: LEAVE_KEY, label: { defaultMessage: "Builder" }, standing: "last", target, ...extra },
        { itemKey: OWN_KEY, label: { defaultMessage: "Own" }, routePresetKey: "admin-own" },
      ],
      exportedItemKeys: [],
    }],
  };
}

const builderDefinition: PhiCmsAreaDefinition = {
  area: "builder",
  baseModuleId: BUILDER_ID,
  shellPresetKey: "builder-shell",
  shellProviders: "base",
  accessPolicy: BUILDER_POLICY,
  navigationSurfaces: [],
};

function entry(
  moduleId: PhiRuntimeModuleId,
  area: "admin" | "builder" | "public",
  routes: readonly PhiCmsRoutePresetDescriptor[],
  kind: "platform" | "module" = "module",
): PhiRuntimeModuleCatalogEntry {
  const key = moduleId.split("/").at(-1)!;
  return {
    definition: {
      moduleId,
      kind,
      eligibleAreas: [area],
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
    } satisfies PhiRuntimeModuleDefinition,
    widgets: [],
    layouts: [],
    routes,
    areaShells: kind === "platform" ? [] : [{
      ownerModuleId: moduleId,
      presetKey: `${key}-shell`,
      shellPresetVersion: 1,
      area,
      loadTree: () => {
        throw new Error("not loaded");
      },
    }],
    load: async () => {
      throw new Error("not executed");
    },
  };
}

function compile(admin: PhiCmsAreaDefinition) {
  return resolvePhiCmsDescriptorCatalog(createPhiRuntimeModuleCatalog([
    entry(PLATFORM_ID, "public", [], "platform"),
    entry(ADMIN_ID, "admin", [{
      ownerModuleId: ADMIN_ID,
      presetKey: "admin-own",
      presetVersion: 1,
      area: "admin",
      title: "Own",
      path: "/own",
      loadTree,
    }]),
    entry(BUILDER_ID, "builder", []),
  ], [admin, builderDefinition]));
}

function sidebar(admin: PhiCmsAreaDefinition) {
  const catalog = compile(admin);
  const activeModuleIds = new Set<PhiRuntimeModuleId>([PLATFORM_ID, ADMIN_ID]);
  const [surface] = resolvePhiCmsActiveNavigationSurfaces({
    catalog,
    area: "admin",
    activeModuleIds,
    routeTable: compilePhiCmsActiveRouteTable({ catalog, area: "admin", activeModuleIds }),
  });
  return surface!;
}

function leaveEntry(admin: PhiCmsAreaDefinition) {
  const surface = sidebar(admin);
  return { surface, item: surface.items.find((item) => item.label.defaultMessage === "Builder")! };
}

describe("a navigation entry into another Area", () => {
  it("leads to that Area's segment, which every menu reads as its root", () => {
    const { surface, item } = leaveEntry(adminDefinition({ kind: "area", area: "builder" }));
    expect(surface.items.map((candidate) => candidate.label.defaultMessage)).toEqual(["Own", "Builder"]);
    expect(item.kind).toBe("link");
    expect(item.target).toEqual({ kind: "area", area: "builder", path: "/builder" });
    expect(resolvePhiNavHref("de", "admin", "/builder")).toBe("/builder");
    expect(resolvePhiNavHref("de", "admin", "/public")).toBe("/de");
  });

  it("is shown to whoever the target Area lets in, unless it says otherwise", () => {
    expect(leaveEntry(adminDefinition({ kind: "area", area: "builder" })).item.accessPolicy)
      .toEqual(BUILDER_POLICY);
    const own = { access: "anyone" } as const;
    expect(leaveEntry(adminDefinition({ kind: "area", area: "builder" }, { accessPolicy: own })).item.accessPolicy)
      .toEqual(own);
  });

  it("is never where the Area root forwards to", () => {
    const { item } = leaveEntry(adminDefinition({ kind: "area", area: "builder" }));
    expect(findFirstPhiCmsNavigationLinkPath([item])).toBeNull();
  });

  it("is not a path in this Area in the Builder", () => {
    const surface = sidebar(adminDefinition({ kind: "area", area: "builder" }));
    const row = materializePhiBuilderNavigationSurface(surface, null).items
      .find((candidate) => candidate.label === "Builder")!;
    expect(row).toMatchObject({ source: "module", kind: "link", href: "/builder", targetAreaRoot: "builder" });
    expect(row.external).toBeUndefined();
  });

  it("refuses its own Area, a route beside it, and an Area that does not exist", () => {
    expect(() => compile(adminDefinition({ kind: "area", area: "admin" })))
      .toThrow(/must lead to another Area than "admin"/);
    expect(() => compile(adminDefinition({ kind: "area", area: "builder" }, { routePresetKey: "admin-own" })))
      .toThrow(/a target, a route or an Overlay, never more than one/);
    expect(() => compile(adminDefinition({ kind: "area", area: "nowhere" as "builder" })))
      .toThrow(/unknown Area "nowhere"/);
  });

  it("stands in the Admin's sidebar to the Builder and in the Builder's back to the Admin", () => {
    const itemsOf = (area: "admin" | "builder") =>
      resolvePhiRuntimeAreaDefinition(area).navigationSurfaces
        ?.find((surface) => surface.navKey === `${area}:sidebar`)?.items ?? [];
    expect(itemsOf("admin").at(-1)).toMatchObject({ target: { kind: "area", area: "builder" }, standing: "last" });
    expect(itemsOf("builder").at(-1)).toMatchObject({ target: { kind: "area", area: "admin" }, standing: "last" });
  });
});
