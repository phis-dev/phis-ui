import { describe, expect, it } from "vitest";

import { materializePhiBuilderNavigationSurface } from "../../helpers/cms-navigation-catalog";
import { createPhiPageReference } from "../../types/references";
import type {
  PhiCmsAreaDefinition,
  PhiCmsNavigationInjectionItemDescriptor,
  PhiCmsNavigationInjectionDescriptor,
  PhiCmsRoutePresetDescriptor,
  PhiRuntimeModuleId,
} from "../../types/cms-module-descriptors";
import type {
  PhiRuntimeModuleCatalogEntry,
  PhiRuntimeModuleDefinition,
} from "../../types/cms-plugins";
import { createPhiRuntimeModuleCatalog } from "./contracts";
import {
  compilePhiCmsActiveRouteTable,
  resolvePhiCmsActiveNavigationSurfaces,
  resolvePhiCmsDescriptorCatalog,
  resolvePhiCmsModuleNavigationFolderTargets,
} from "./descriptor-compiler";

const loadTree = (() => {
  throw new Error("not loaded");
}) as PhiCmsRoutePresetDescriptor["loadTree"];

const PLATFORM_ID = "@test/pkg/modules/platform" as const;
const BASE_ID = "@test/pkg/modules/base" as const;
const ACME_ID = "@acme/site/modules/site" as const;
const OWN_KEY = "@test/pkg/modules/base/nav/own";

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

const route = (name: string, path: string, navigation?: readonly PhiCmsNavigationInjectionDescriptor[]): PhiCmsRoutePresetDescriptor => ({
  ownerModuleId: ACME_ID,
  presetKey: name,
  presetVersion: 1,
  area: "public",
  title: name,
  path,
  ...(navigation ? { navigation } : {}),
  loadTree,
});

const child = (name: string) => ({ itemKey: `${ACME_ID}/nav/${name}`, label: { defaultMessage: name }, routePresetKey: name });

function faq(item: Partial<PhiCmsNavigationInjectionItemDescriptor>, paths = { overview: "/faq/overview", hosting: "/faq/hosting" }) {
  const container: PhiCmsNavigationInjectionItemDescriptor = {
    itemKey: `${ACME_ID}/nav/faq`,
    label: { defaultMessage: "FAQ" },
    children: [child("overview"), child("hosting")],
    ...item,
  };
  const base = entry(BASE_ID, [route("base-own", "/own")].map((own) => ({ ...own, ownerModuleId: BASE_ID })));
  base.areaShells = [{
    ownerModuleId: BASE_ID,
    presetKey: "base-shell",
    shellPresetVersion: 1,
    area: "public",
    loadTree: () => {
      throw new Error("not loaded");
    },
  }];
  const catalog = resolvePhiCmsDescriptorCatalog(createPhiRuntimeModuleCatalog([
    entry(PLATFORM_ID, [], "platform"),
    base,
    entry(ACME_ID, [
      route("overview", paths.overview, [{ navKey: "public:footer", parentItemKey: null, after: OWN_KEY, item: container }]),
      route("hosting", paths.hosting),
    ]),
  ], [areaDefinition]));
  const activeModuleIds = new Set<PhiRuntimeModuleId>([PLATFORM_ID, BASE_ID, ACME_ID]);
  const routeTable = compilePhiCmsActiveRouteTable({ catalog, area: "public", activeModuleIds });
  const [surface] = resolvePhiCmsActiveNavigationSurfaces({ catalog, area: "public", activeModuleIds, routeTable });
  return {
    container: surface!.items.find((entry) => entry.label.defaultMessage === "FAQ")!,
    lookup: (address: string) => resolvePhiCmsModuleNavigationFolderTargets({ catalog, area: "public", activeModuleIds, routeTable, addresses: [address] }).get(address) ?? null,
    builder: materializePhiBuilderNavigationSurface(surface!, null),
  };
}

const overviewReference = createPhiPageReference({ kind: "module", ownerModuleId: ACME_ID, presetKey: "overview" });

describe("a Module container names where its folder address leads", () => {
  it("leads the folder its children share to the child it names", () => {
    const { container, lookup } = faq({ folderTarget: child("overview").itemKey });
    expect(container.folder).toEqual({ address: "/faq", target: { kind: "page", reference: overviewReference } });
    expect(lookup("/faq")).toBe(overviewReference);
    expect(lookup("/faq/hosting")).toBeNull();
  });

  it("has no folder without a folderTarget, and none where the children share no folder", () => {
    expect(faq({}).container.folder).toBeUndefined();
    const scattered = faq({ folderTarget: child("overview").itemKey }, { overview: "/faq", hosting: "/help/hosting" });
    expect(scattered.container.folder).toBeUndefined();
    expect(scattered.lookup("/faq")).toBeNull();
  });

  it("shows the Builder the Module's choice as the container's folder", () => {
    const { builder } = faq({ folderTarget: child("overview").itemKey });
    const container = builder.items.find((entry) => entry.label === "FAQ");
    expect(container?.folder).toEqual({ address: "/faq", target: { kind: "page", reference: overviewReference } });
  });

  it("refuses a folderTarget that names no direct child going to a route", () => {
    expect(() => faq({ folderTarget: `${ACME_ID}/nav/elsewhere` })).toThrow(/names no direct child/);
  });
});
